"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { api } from "./_generated/api";
import { action } from "./_generated/server";
import { PLANS } from "./billing";

/**
 * Stripe Checkout + Billing Portal.
 *
 * Plans are priced with Checkout's inline `price_data` (recurring, monthly),
 * so no products or prices need to exist in the Stripe dashboard — only
 * STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are read from the project's
 * Keys settings (same pattern as GROQ_API_KEY).
 */

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not configured — add it in your project's Keys / API keys settings, then try again.",
    );
  }
  return new Stripe(key);
}

/**
 * Open a Stripe Checkout session for a paid plan. The client passes its own
 * origin so the success/cancel URLs always point back at this app.
 */
export const createCheckoutSession = action({
  args: {
    plan: v.union(v.literal("pro"), v.literal("business")),
    successUrl: v.string(),
    cancelUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Sign in to upgrade your plan.");
    }
    const plan = PLANS[args.plan];
    if (!plan) {
      throw new Error("Unknown plan.");
    }
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: plan.price,
            recurring: { interval: "month" },
            product_data: {
              name: `Oman Lead Bot — ${plan.name}`,
              description: `${plan.aiDrafts} AI drafts/mo · ${plan.emails} emails/mo · ${plan.sources} scrape sources`,
            },
          },
        },
      ],
      // Carried onto the subscription so the webhook can map it back to the user.
      metadata: { userId: String(userId), plan: plan.id },
      subscription_data: {
        metadata: { userId: String(userId), plan: plan.id },
      },
      allow_promotion_codes: true,
      success_url: args.successUrl,
      cancel_url: args.cancelUrl,
    });

    return { url: session.url ?? null };
  },
});

/** Open the Stripe billing portal so the user can manage/upgrade/cancel. */
export const createBillingPortalSession = action({
  args: { returnUrl: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Sign in to manage billing.");
    }
    const status = await ctx.runQuery(api.billing.getBillingStatus);
    if (!status?.stripeCustomerId) {
      throw new Error(
        "No active subscription yet — upgrade to Pro or Business first.",
      );
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: status.stripeCustomerId,
      return_url: args.returnUrl,
    });
    return { url: session.url };
  },
});
