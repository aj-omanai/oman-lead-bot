import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

/**
 * Deterministic lead scoring (0–100). Deliberately rule-based, not LLM-based:
 * it runs free on every import, rescore and status change, and its reasons are
 * transparent to the user. Signals: contactability, category affinity,
 * outreach engagement, and freshness. Opt-out pins the score to 0.
 */

/** Category → affinity bonus. Top spenders / marketing-heavy sectors rank high. */
export const CATEGORY_BONUS: Record<string, number> = {
  "Oilfield Supplies": 15,
  "Construction Companies": 15,
  "Hotels & Travel": 12,
  "Engineering Consultants": 10,
  "Building Materials": 8,
  "Automotive": 8,
  "Freight Forwarding": 8,
  "Electro Mechanical": 8,
  "Safety Equipment": 6,
  "Car Hire & Leasing": 5,
  "Restaurants": 5,
  "Pest Control": 3,
};
const DEFAULT_CATEGORY_BONUS = 6;

/** Only top-tier sectors get a "high-value category" reason chip. */
const TOP_CATEGORIES = new Set([
  "Oilfield Supplies",
  "Construction Companies",
  "Hotels & Travel",
]);

const FRESH_MS = 30 * 24 * 60 * 60 * 1000; // "recently added" window

export type ScoreInput = {
  phone: string;
  email?: string;
  emailVerified?: string;
  category: string;
  status: "new" | "drafted" | "sent";
  whatsappStatus?: "sent" | "delivered" | "read" | "failed";
  optedOut?: boolean;
  createdAt: number;
};

export type ScoreBand = "hot" | "warm" | "cold";

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

/**
 * Pure scoring function. Returns the 0–100 score plus the human-readable
 * reasons behind it (shown as a tooltip in the Leads tab).
 */
export function scoreLead(input: ScoreInput): {
  score: number;
  reasons: string[];
} {
  if (input.optedOut) return { score: 0, reasons: ["opted out"] };

  const reasons: string[] = [];
  let score = 0;

  // Contactability — a reachable lead is worth more.
  if (input.phone.trim().length >= 7) {
    score += 25;
    reasons.push("has phone");
  }
  if (input.email?.trim()) {
    score += 15;
    reasons.push("has email");
  }
  if (input.emailVerified === "valid") {
    score += 10;
    reasons.push("email verified");
  }

  // Category affinity.
  const categoryBonus =
    CATEGORY_BONUS[input.category] ?? DEFAULT_CATEGORY_BONUS;
  score += categoryBonus;
  if (TOP_CATEGORIES.has(input.category)) {
    reasons.push("high-value category");
  }

  // Outreach engagement.
  if (input.status === "drafted") {
    score += 5;
    reasons.push("pitched");
  } else if (input.status === "sent") {
    score += 10;
    reasons.push("contacted");
  }
  if (input.whatsappStatus === "read") {
    score += 10;
    reasons.push("read your message");
  } else if (input.whatsappStatus === "delivered") {
    score += 5;
    reasons.push("message delivered");
  }

  // Freshness.
  if (Date.now() - input.createdAt < FRESH_MS) {
    score += 10;
    reasons.push("recently added");
  }

  return { score: Math.min(score, 100), reasons };
}

/** Fields to store at insert time (imports/seed don't have a lead doc yet). */
export function scoredFields(
  input: ScoreInput,
): { score: number; scoreReasons: string[] } {
  const { score, reasons } = scoreLead(input);
  return { score, scoreReasons: reasons };
}

/**
 * Recompute and persist a lead's score from its current document. Shared by
 * rescoreAll and by the mutations that change scoring signals (status,
 * email verification, WhatsApp delivery) — they pass the doc, possibly with
 * the pending field merged in.
 */
export async function applyScorePatch(
  ctx: MutationCtx,
  id: Id<"leads">,
  doc: ScoreInput,
): Promise<void> {
  const { score, scoreReasons } = scoredFields(doc);
  await ctx.db.patch(id, { score, scoreReasons });
}

/** Re-score every lead in the signed-in user's workspace. */
export const rescoreAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { updated: 0 };
    const leads = await ctx.db
      .query("leads")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const lead of leads) {
      await applyScorePatch(ctx, lead._id, {
        phone: lead.phone,
        email: lead.email,
        emailVerified: lead.emailVerified,
        category: lead.category,
        status: lead.status,
        whatsappStatus: lead.whatsappStatus,
        optedOut: lead.optedOut,
        createdAt: lead._creationTime,
      });
    }
    return { updated: leads.length };
  },
});
