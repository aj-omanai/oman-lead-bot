import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Sales pipeline. `stage` (the commercial funnel) is distinct from `status`
 * (outreach state: new/drafted/sent) — a lead can be "sent" and still sit in
 * the "new" stage until a rep qualifies it and assigns a deal value.
 */

export const PIPELINE_STAGES = [
  "new",
  "qualified",
  "negotiating",
  "won",
  "lost",
] as const;
export type Stage = (typeof PIPELINE_STAGES)[number];

export const STAGE_VALIDATOR = v.union(
  v.literal("new"),
  v.literal("qualified"),
  v.literal("negotiating"),
  v.literal("won"),
  v.literal("lost"),
);

/** Probability a deal in a given stage closes — used for the weighted forecast. */
export const STAGE_PROBABILITY: Record<Stage, number> = {
  new: 0.2,
  qualified: 0.5,
  negotiating: 0.8,
  won: 1,
  lost: 0,
};

export interface PipelineSummary {
  counts: Record<Stage, number>;
  /** Sum of deal values in open stages (new/qualified/negotiating). */
  openValue: number;
  /** Sum of dealValue × close probability across open stages. */
  weightedValue: number;
  /** Sum of deal values on won deals. */
  wonValue: number;
  /** Mean deal value across leads that have one. */
  avgDeal: number;
  /** won / (won + lost), 0 when nothing is closed yet. */
  winRate: number;
}

/** Pure aggregation — shared by the summary query and unit tests. */
export function computePipelineSummary(
  leads: Array<{
    stage?: Stage | null;
    dealValue?: number | null;
  }>,
): PipelineSummary {
  const counts: Record<Stage, number> = {
    new: 0,
    qualified: 0,
    negotiating: 0,
    won: 0,
    lost: 0,
  };
  let openValue = 0;
  let weightedValue = 0;
  let wonValue = 0;
  let wonCount = 0;
  let lostCount = 0;
  let valued = 0;
  let valueSum = 0;

  for (const lead of leads) {
    const stage = lead.stage ?? "new";
    counts[stage] += 1;
    const value = lead.dealValue ?? 0;
    if (value > 0) {
      valued += 1;
      valueSum += value;
    }
    if (stage === "won") {
      wonCount += 1;
      wonValue += value;
    } else if (stage === "lost") {
      lostCount += 1;
    } else {
      openValue += value;
      weightedValue += value * STAGE_PROBABILITY[stage];
    }
  }

  const closed = wonCount + lostCount;
  return {
    counts,
    openValue,
    weightedValue,
    wonValue,
    avgDeal: valued ? valueSum / valued : 0,
    winRate: closed ? wonCount / closed : 0,
  };
}

/** Move a lead between pipeline stages (records when it happened). */
export const setStage = mutation({
  args: { id: v.id("leads"), stage: STAGE_VALIDATOR },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    await ctx.db.patch(args.id, {
      stage: args.stage,
      stageUpdatedAt: Date.now(),
    });
  },
});

/**
 * Set (or clear) a deal's value. Setting a value on a lead still in the "new"
 * stage auto-qualifies it — a lead with money on the line is by definition
 * qualified. Pass null/undefined to clear the value.
 */
export const setDealValue = mutation({
  args: {
    id: v.id("leads"),
    dealValue: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const lead = await ctx.db.get(args.id);
    if (!lead || lead.userId !== userId) return;
    const value = args.dealValue;
    if (value !== undefined && (Number.isNaN(value) || value < 0)) {
      throw new Error("Deal value must be a positive number.");
    }
    const patch: Record<string, unknown> = {
      dealValue: value,
    };
    if (value !== undefined && value > 0 && (lead.stage ?? "new") === "new") {
      patch.stage = "qualified";
      patch.stageUpdatedAt = Date.now();
    }
    await ctx.db.patch(args.id, patch);
  },
});

/** Pipeline totals for the Pipeline tab header. */
export const summary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return computePipelineSummary(leads);
  },
});
