import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { PLANS, bumpUsage, getEffectivePlan, usageForUser } from "./billing";

/**
 * Companion (plain, non-"use node") module for the follow-up pipeline.
 *
 * The cron action in followUps.ts delegates ALL database access here — reads
 * through `internalQuery` / `internalMutation` (never reachable from the
 * client), writes and per-user reads through regular queries/mutations that
 * the Follow-ups tab calls directly.
 *
 * At-most-one-follow-up-per-lead is enforced by the `by_lead` index: any
 * existing row (pending, sent or skipped) blocks a second one.
 */

/** A lead that the daily cron should draft a follow-up for. */
export type EligibleFollowUp = {
  leadId: Id<"leads">;
  userId: Id<"users">;
  name: string;
  category: string;
  city: string;
  channel: "whatsapp" | "email";
};

/**
 * Scan for sent leads that are due a follow-up (server-side only).
 *
 * Eligibility, in order:
 *   1. lead.status === "sent"
 *   2. lead.lastContactedAt <= cutoff (i.e. >= 3 days ago)
 *   3. !lead.optedOut
 *   4. owner's plan is pro or business
 *   5. owner's aiDrafts quota is not exhausted this month
 *   6. no existing followUps row for this lead (any status)
 *
 * The follow-up reuses the channel the lead was last contacted on (defaulting
 * to whatsapp, and falling back from email to whatsapp when the lead has no
 * email address).
 */
export const listEligible = internalQuery({
  args: { cutoff: v.number() },
  handler: async (ctx, { cutoff }): Promise<EligibleFollowUp[]> => {
    const sentLeads = await ctx.db
      .query("leads")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "sent"),
          q.neq(q.field("optedOut"), true),
        ),
      )
      .collect();

    const eligible: EligibleFollowUp[] = [];
    for (const lead of sentLeads) {
      // 3-day window (leads without a recorded contact date are skipped).
      if (!lead.lastContactedAt || lead.lastContactedAt > cutoff) continue;

      // One follow-up per lead, ever — any existing row blocks.
      const existing = await ctx.db
        .query("followUps")
        .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
        .first();
      if (existing) continue;

      // Plan gate + aiDrafts quota (the cron drafts count like manual drafts).
      const plan = await getEffectivePlan(ctx, lead.userId);
      if (plan === "free") continue;
      const usageRow = await usageForUser(ctx, lead.userId);
      if ((usageRow?.aiDrafts ?? 0) >= PLANS[plan].aiDrafts) continue;

      let channel: "whatsapp" | "email" = lead.lastContactChannel ?? "whatsapp";
      if (channel === "email" && !lead.email) channel = "whatsapp";

      eligible.push({
        leadId: lead._id,
        userId: lead.userId,
        name: lead.name,
        category: lead.category,
        city: lead.city,
        channel,
      });
    }
    return eligible;
  },
});

/**
 * Fetch a follow-up with its lead, but only if the signed-in user owns it.
 * Used by the approve action's staleness re-check (auth propagates through
 * ctx.runQuery, exactly like api.leads.getLead in pitch.ts).
 */
export const getFollowUpForReview = internalQuery({
  args: { id: v.id("followUps") },
  handler: async (ctx, { id }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const row = await ctx.db.get(id);
    if (!row || row.userId !== userId) return null;
    const lead = await ctx.db.get(row.leadId);
    if (!lead) return null;
    return { row, lead };
  },
});

/**
 * Queue a drafted follow-up and meter one aiDrafts quota unit — atomic so a
 * queued row is never orphaned from its usage accounting. Server-side only.
 */
export const queueFollowUp = internalMutation({
  args: {
    userId: v.id("users"),
    leadId: v.id("leads"),
    channel: v.union(v.literal("whatsapp"), v.literal("email")),
    draftSubject: v.optional(v.string()),
    draftBody: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("followUps", {
      userId: args.userId,
      leadId: args.leadId,
      channel: args.channel,
      draftSubject: args.draftSubject,
      draftBody: args.draftBody,
      status: "pending",
    });
    await bumpUsage(ctx, args.userId, "aiDrafts");
  },
});

export type PendingFollowUp = {
  id: Id<"followUps">;
  channel: "whatsapp" | "email";
  draftSubject?: string;
  draftBody: string;
  lead: {
    id: Id<"leads">;
    name: string;
    phone: string;
    email: string | null;
    city: string;
    optedOut: boolean;
    status: "new" | "drafted" | "sent";
    lastContactedAt: number | null;
  } | null;
};

/** Pending follow-ups for the signed-in user, joined with their leads. */
export const listPending = query({
  args: {},
  handler: async (ctx): Promise<PendingFollowUp[]> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("followUps")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "pending"),
      )
      .collect();
    return Promise.all(
      rows.map(async (row) => {
        const lead = await ctx.db.get(row.leadId);
        return {
          id: row._id,
          channel: row.channel,
          draftSubject: row.draftSubject,
          draftBody: row.draftBody,
          lead: lead
            ? {
                id: lead._id,
                name: lead.name,
                phone: lead.phone,
                email: lead.email ?? null,
                city: lead.city,
                optedOut: lead.optedOut ?? false,
                status: lead.status,
                lastContactedAt: lead.lastContactedAt ?? null,
              }
            : null,
        };
      }),
    );
  },
});

/** Pending count for the Follow-ups nav badge (live). */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const rows = await ctx.db
      .query("followUps")
      .withIndex("by_user_status", (q) =>
        q.eq("userId", userId).eq("status", "pending"),
      )
      .collect();
    return rows.length;
  },
});

/** Edit the drafted text of a pending follow-up (inline review edit). */
export const editFollowUp = mutation({
  args: {
    id: v.id("followUps"),
    draftSubject: v.optional(v.string()),
    draftBody: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in to edit follow-ups.");
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) {
      throw new Error("Follow-up not found.");
    }
    if (row.status !== "pending") {
      throw new Error("Only pending follow-ups can be edited.");
    }
    await ctx.db.patch(args.id, {
      draftBody: args.draftBody,
      draftSubject: args.draftSubject ?? undefined,
    });
  },
});

/**
 * Mark a follow-up skipped. Counts against the one-per-lead cap, so the lead
 * is not re-queued.
 */
export const skipFollowUp = mutation({
  args: { id: v.id("followUps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return;
    if (row.status !== "pending") return;
    await ctx.db.patch(args.id, { status: "skipped" });
  },
});

/** Mark a follow-up as sent after a successful send. */
export const markSent = mutation({
  args: { id: v.id("followUps"), sentAt: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId) return;
    if (row.status !== "pending") return;
    await ctx.db.patch(args.id, { status: "sent", sentAt: args.sentAt });
  },
});
