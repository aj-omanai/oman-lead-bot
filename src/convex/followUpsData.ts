import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { isEligibleForFollowUp } from "../lib/followUpEligibility";
import { contactChannelValidator } from "./schema";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { getActivePlan } from "./usage";

/**
 * DB layer for follow-up automation. Kept out of followUps.ts (the "use
 * node" action file) per house convention — action files delegate reads/
 * writes here rather than touching ctx.db directly.
 */

/** Internal-only: leads eligible for an auto-drafted follow-up right now.
 *  Called by the daily cron. A full table scan is fine at this app's lead
 *  volume; see by_lead below for how the 1-per-lead cap is enforced. The
 *  actual rule set lives in src/lib/followUpEligibility.ts, so it's testable
 *  without a live Convex backend. */
export const listEligibleLeads = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const leads = await ctx.db.query("leads").collect();
    const eligible = [];
    for (const lead of leads) {
      // Cheap checks first, before the two DB round-trips per lead.
      if (lead.status !== "sent" || !lead.lastContactedAt || lead.optedOut) continue;

      const plan = await getActivePlan(ctx, lead.userId);
      const existing = await ctx.db
        .query("followUps")
        .withIndex("by_lead", (q) => q.eq("leadId", lead._id))
        .first();

      const eligibleNow = isEligibleForFollowUp({
        status: lead.status,
        lastContactedAt: lead.lastContactedAt,
        optedOut: lead.optedOut,
        plan,
        hasExistingFollowUp: existing !== null,
        now,
      });
      if (eligibleNow) eligible.push(lead);
    }
    return eligible;
  },
});

/** Internal-only: queue a drafted follow-up. Called once per eligible lead
 *  by the cron, after a successful LLM draft. */
export const enqueueFollowUp = internalMutation({
  args: {
    leadId: v.id("leads"),
    userId: v.id("users"),
    channel: contactChannelValidator,
    draftSubject: v.optional(v.string()),
    draftBody: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("followUps", {
      leadId: args.leadId,
      userId: args.userId,
      channel: args.channel,
      draftSubject: args.draftSubject,
      draftBody: args.draftBody,
      status: "pending",
    });
  },
});

/** Internal-only: load one follow-up row for the "use node" action layer
 *  (approveAndSend), which can't touch ctx.db directly. */
export const getFollowUp = internalQuery({
  args: { id: v.id("followUps") },
  handler: async (ctx, args) => await ctx.db.get(args.id),
});

/** Pending follow-ups for the signed-in user's Follow-ups tab. */
export const listPending = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("followUps")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();
    return await Promise.all(
      rows.map(async (row) => {
        const lead = await ctx.db.get(row.leadId);
        return {
          ...row,
          leadName: lead?.name ?? "Unknown lead",
          leadPhone: lead?.phone ?? "",
        };
      }),
    );
  },
});

/** Cheap count for the nav badge — avoids loading every lead join just to
 *  show a number. */
export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;
    const rows = await ctx.db
      .query("followUps")
      .withIndex("by_user_status", (q) => q.eq("userId", userId).eq("status", "pending"))
      .collect();
    return rows.length;
  },
});

/** Edit a pending follow-up's draft before approving it. */
export const updateDraft = mutation({
  args: {
    id: v.id("followUps"),
    draftSubject: v.optional(v.string()),
    draftBody: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId || row.status !== "pending") return;
    await ctx.db.patch(args.id, { draftSubject: args.draftSubject, draftBody: args.draftBody });
  },
});

/** Skip a pending follow-up. Counts against the 1-per-lead cap forever — the
 *  lead is never re-queued. */
export const skip = mutation({
  args: { id: v.id("followUps") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== userId || row.status !== "pending") return;
    await ctx.db.patch(args.id, { status: "skipped" });
  },
});

/** Internal-only: mark a follow-up sent after a successful send. */
export const markSent = internalMutation({
  args: { id: v.id("followUps") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "sent", sentAt: Date.now() });
  },
});

/** Internal-only: auto-skip a follow-up whose lead's status changed (replied
 *  or got opted out) between drafting and review. */
export const markSkippedByStaleness = internalMutation({
  args: { id: v.id("followUps") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { status: "skipped" });
  },
});
