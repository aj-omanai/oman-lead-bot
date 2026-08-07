import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, internalQuery, query } from "./_generated/server";

/** The signed-in user's subscription row, or a synthetic "free" default when
 *  none exists yet (every user starts on the free plan implicitly). */
export const getSubscription = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!sub) {
      return {
        plan: "free" as const,
        status: "active" as const,
        currentPeriodEnd: null as number | null,
        stripeCustomerId: null as string | null,
      };
    }

    return {
      plan: sub.plan,
      status: sub.status,
      currentPeriodEnd: sub.currentPeriodEnd ?? null,
      stripeCustomerId: sub.stripeCustomerId ?? null,
    };
  },
});

/** Internal-only: called by the Stripe webhook handler to reflect Stripe's
 *  view of the world. Never called directly from the client. */
export const upsertSubscription = internalMutation({
  args: {
    userId: v.id("users"),
    plan: v.union(v.literal("free"), v.literal("pro"), v.literal("business")),
    status: v.union(
      v.literal("active"),
      v.literal("trialing"),
      v.literal("past_due"),
      v.literal("canceled"),
    ),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();

    const patch = {
      plan: args.plan,
      status: args.status,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      currentPeriodEnd: args.currentPeriodEnd,
    };

    if (existing) {
      await ctx.db.patch(existing._id, patch);
    } else {
      await ctx.db.insert("subscriptions", { userId: args.userId, ...patch });
    }
  },
});

/** Internal-only: look up a user by their Stripe customer ID, used by the
 *  webhook handler for subscription-updated events that only carry the
 *  customer/subscription IDs, not our internal userId. */
export const findByStripeCustomer = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, args) => {
    const sub = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripeCustomer", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
      .unique();
    return sub ?? null;
  },
});
