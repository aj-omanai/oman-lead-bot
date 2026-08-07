import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";

/**
 * Billing plans — limits are enforced server-side BEFORE every paid LLM or
 * email call (see pitch.ts / outreach.ts / stripe.ts).
 *
 * Prices are set with Stripe Checkout's inline `price_data`, so nothing needs
 * to be pre-created in the Stripe dashboard — only STRIPE_SECRET_KEY and
 * STRIPE_WEBHOOK_SECRET are read from the project's Keys settings.
 */
export const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: 0,
    aiDrafts: 20,
    emails: 0,
    whatsapp: 0,
    sources: 1,
    seats: 1,
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 1900, // $19/mo
    aiDrafts: 300,
    emails: 200,
    whatsapp: 200,
    sources: 5,
    seats: 1,
  },
  business: {
    id: "business",
    name: "Business",
    price: 4900, // $49/mo
    aiDrafts: 1500,
    emails: 1000,
    whatsapp: 1000,
    sources: 20,
    seats: 5,
  },
} as const;

export type PlanId = keyof typeof PLANS;
export type UsageCounter = "aiDrafts" | "emails" | "whatsapp";

/** "YYYY-MM" key (UTC) used to bucket the per-user, per-month usage rows. */
export function monthKey(date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

const PAID_STATUSES = new Set(["active", "trialing"]);

async function subscriptionForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  return ctx.db
    .query("subscriptions")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .first();
}

/** Effective plan: only active/trialing Stripe subscriptions count as paid. */
export async function getEffectivePlan(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
): Promise<PlanId> {
  const sub = await subscriptionForUser(ctx, userId);
  if (sub && PAID_STATUSES.has(sub.status)) return sub.plan;
  return "free";
}

async function usageForUser(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  return ctx.db
    .query("usage")
    .withIndex("by_user_month", (q) =>
      q.eq("userId", userId).eq("month", monthKey()),
    )
    .first();
}

/**
 * Lightweight snapshot used by actions (pitch.ts / outreach.ts) to check a
 * quota BEFORE making a paid call. Never trusts the client.
 */
export const snapshotUsage = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const plan = await getEffectivePlan(ctx, userId);
    const limits = PLANS[plan];
    const row = await usageForUser(ctx, userId);
    return {
      plan,
      limits: {
        aiDrafts: limits.aiDrafts,
        emails: limits.emails,
        whatsapp: limits.whatsapp,
        sources: limits.sources,
        seats: limits.seats,
      },
      aiDraftsUsed: row?.aiDrafts ?? 0,
      emailsUsed: row?.emails ?? 0,
      whatsappUsed: row?.whatsapp ?? 0,
    };
  },
});

/** Increment a per-user, per-month usage counter (creates the row lazily). */
export const recordUsage = mutation({
  args: {
    counter: v.union(
      v.literal("aiDrafts"),
      v.literal("emails"),
      v.literal("whatsapp"),
    ),
    amount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const delta = args.amount ?? 1;
    const month = monthKey();
    const existing = await ctx.db
      .query("usage")
      .withIndex("by_user_month", (q) =>
        q.eq("userId", userId).eq("month", month),
      )
      .first();
    const bump = {
      aiDrafts: args.counter === "aiDrafts" ? delta : 0,
      emails: args.counter === "emails" ? delta : 0,
      whatsapp: args.counter === "whatsapp" ? delta : 0,
    };
    if (existing) {
      await ctx.db.patch(existing._id, {
        aiDrafts: existing.aiDrafts + bump.aiDrafts,
        emails: existing.emails + bump.emails,
        whatsapp: existing.whatsapp + bump.whatsapp,
      });
    } else {
      await ctx.db.insert("usage", {
        userId,
        month,
        ...bump,
      });
    }
    return { ok: true };
  },
});

/** Full status for the Billing tab / Overview usage card. */
export const getBillingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const sub = await subscriptionForUser(ctx, userId);
    const plan: PlanId =
      sub && PAID_STATUSES.has(sub.status) ? sub.plan : "free";
    const limits = PLANS[plan];
    const row = await usageForUser(ctx, userId);
    return {
      plan,
      subscriptionStatus: sub?.status ?? "none",
      currentPeriodEnd: sub?.currentPeriodEnd ?? null,
      stripeCustomerId: sub?.stripeCustomerId ?? null,
      limits: {
        aiDrafts: limits.aiDrafts,
        emails: limits.emails,
        whatsapp: limits.whatsapp,
        sources: limits.sources,
        seats: limits.seats,
      },
      usage: {
        aiDrafts: { used: row?.aiDrafts ?? 0, limit: limits.aiDrafts },
        emails: { used: row?.emails ?? 0, limit: limits.emails },
        whatsapp: { used: row?.whatsapp ?? 0, limit: limits.whatsapp },
      },
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      emailConfigured: Boolean(process.env.VLY_INTEGRATION_KEY),
      zerobounceConfigured: Boolean(process.env.ZEROBOUNCE_API_KEY),
      whatsappConfigured: Boolean(
        process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
      ),
      whatsappWebhookConfigured: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
    };
  },
});
