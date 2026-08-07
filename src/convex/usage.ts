import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { PLANS, currentPeriodKey, type PlanId, type UsageKind } from "../lib/plans";
import { internalMutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

/** Active plan for a user. Defaults to "free" — every signed-in user (including
 *  anonymous sessions) has an implicit free subscription until they upgrade. */
export async function getActivePlan(ctx: QueryCtx, userId: Id<"users">): Promise<PlanId> {
  const sub = await ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (!sub) return "free";
  // A canceled or past-due subscription falls back to the free tier's limits.
  if (sub.status !== "active" && sub.status !== "trialing") return "free";
  return sub.plan;
}

/** This month's usage + plan limits for the signed-in user. */
export const getUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const plan = await getActivePlan(ctx, userId);
    const period = currentPeriodKey();
    const row = await ctx.db
      .query("usage")
      .withIndex("by_user_period", (q) => q.eq("userId", userId).eq("period", period))
      .unique();

    return {
      plan,
      limits: PLANS[plan].limits,
      period,
      aiDrafts: row?.aiDrafts ?? 0,
      emails: row?.emails ?? 0,
    };
  },
});

/**
 * Atomically check the caller's monthly quota for `kind` and, if under limit,
 * consume one unit. Call this from an action via ctx.runMutation BEFORE
 * spending money on an external API (LLM completion or outbound email).
 */
export const checkAndIncrementUsage = internalMutation({
  args: { userId: v.id("users"), kind: v.union(v.literal("aiDrafts"), v.literal("emails")) },
  handler: async (ctx, args): Promise<{ ok: boolean; plan: PlanId; used: number; limit: number }> => {
    const plan = await getActivePlan(ctx, args.userId);
    const limit = PLANS[plan].limits[args.kind as UsageKind];
    const period = currentPeriodKey();

    const existing = await ctx.db
      .query("usage")
      .withIndex("by_user_period", (q) => q.eq("userId", args.userId).eq("period", period))
      .unique();

    const used = existing ? existing[args.kind] : 0;
    if (used >= limit) {
      return { ok: false, plan, used, limit };
    }

    if (existing) {
      if (args.kind === "aiDrafts") {
        await ctx.db.patch(existing._id, { aiDrafts: used + 1 });
      } else {
        await ctx.db.patch(existing._id, { emails: used + 1 });
      }
    } else {
      await ctx.db.insert("usage", {
        userId: args.userId,
        period,
        aiDrafts: args.kind === "aiDrafts" ? 1 : 0,
        emails: args.kind === "emails" ? 1 : 0,
      });
    }
    return { ok: true, plan, used: used + 1, limit };
  },
});
