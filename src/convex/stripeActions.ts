"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import Stripe from "stripe";
import { PLANS, type PlanId } from "../lib/plans";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

/**
 * Stripe-backed billing actions.
 *
 * No products/prices need to exist in the Stripe dashboard ahead of time —
 * each Checkout Session is created with an inline recurring `price_data`, so
 * the only setup required is pasting a Stripe secret key into the project's
 * Keys / API keys settings as STRIPE_SECRET_KEY (same pattern as
 * GROQ_API_KEY / GEMINI_API_KEY).
 */

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

function siteUrl(): string {
  return (process.env.SITE_URL ?? "http://localhost:5173").replace(/\/$/, "");
}

type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; reason: "no-auth" | "no-key" | "invalid-plan" | "error"; message: string };

export const createCheckoutSession = action({
  args: { plan: v.union(v.literal("pro"), v.literal("business")) },
  handler: async (ctx, args): Promise<CheckoutResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { ok: false, reason: "no-auth", message: "Sign in to upgrade your plan." };
    }

    const stripe = getStripe();
    if (!stripe) {
      return {
        ok: false,
        reason: "no-key",
        message:
          "Billing isn't configured yet. Add a STRIPE_SECRET_KEY in your project's Keys / API keys settings to enable upgrades.",
      };
    }

    const planDef = PLANS[args.plan as PlanId];
    const user = await ctx.runQuery(api.users.currentUser, {});
    const email = user?.email;

    try {
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        client_reference_id: userId,
        customer_email: email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              recurring: { interval: "month" },
              unit_amount: Math.round(planDef.priceUsd * 100),
              product_data: {
                name: `Wasl — ${planDef.name} plan`,
                description: planDef.tagline,
              },
            },
          },
        ],
        metadata: { userId, plan: args.plan },
        subscription_data: { metadata: { userId, plan: args.plan } },
        success_url: `${siteUrl()}/dashboard?tab=billing&checkout=success`,
        cancel_url: `${siteUrl()}/dashboard?tab=billing&checkout=cancelled`,
      });

      if (!session.url) {
        return { ok: false, reason: "error", message: "Stripe did not return a checkout URL." };
      }
      return { ok: true, url: session.url };
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Failed to start checkout.",
      };
    }
  },
});

type PortalResult =
  | { ok: true; url: string }
  | { ok: false; reason: "no-auth" | "no-key" | "no-customer" | "error"; message: string };

/** Stripe's hosted billing portal — lets a subscriber update card details,
 *  change plan, or cancel without any UI we have to build ourselves. */
export const createPortalSession = action({
  args: {},
  handler: async (ctx): Promise<PortalResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { ok: false, reason: "no-auth", message: "Sign in to manage billing." };
    }

    const stripe = getStripe();
    if (!stripe) {
      return {
        ok: false,
        reason: "no-key",
        message: "Billing isn't configured yet. Add a STRIPE_SECRET_KEY to enable this.",
      };
    }

    const sub = await ctx.runQuery(api.billing.getSubscription, {});
    if (!sub?.stripeCustomerId) {
      return {
        ok: false,
        reason: "no-customer",
        message: "No billing account found yet — upgrade to a paid plan first.",
      };
    }

    try {
      const portal = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${siteUrl()}/dashboard?tab=billing`,
      });
      return { ok: true, url: portal.url };
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Failed to open the billing portal.",
      };
    }
  },
});
