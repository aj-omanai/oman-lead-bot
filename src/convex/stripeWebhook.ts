"use node";

import Stripe from "stripe";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import type { PlanId } from "../lib/plans";

/**
 * Stripe webhook receiver. Register STRIPE_WEBHOOK_SECRET in the project's
 * Keys / API keys settings and point a Stripe webhook at
 * `${CONVEX_SITE_URL}/stripe/webhook` for:
 *   - checkout.session.completed
 *   - customer.subscription.updated
 *   - customer.subscription.deleted
 */
export const stripeWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeKey) {
    return new Response("Stripe is not configured on this deployment.", { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing stripe-signature header.", { status: 400 });
  }

  const stripe = new Stripe(stripeKey);
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, secret);
  } catch (error) {
    const message = error instanceof Error ? error.message : "invalid signature";
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  async function resolveUserId(
    metadata: Stripe.Metadata | null | undefined,
    stripeCustomerId: string | null,
  ): Promise<Id<"users"> | null> {
    if (metadata?.userId) return metadata.userId as Id<"users">;
    if (!stripeCustomerId) return null;
    const sub = await ctx.runQuery(internal.billing.findByStripeCustomer, { stripeCustomerId });
    return sub?.userId ?? null;
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = await resolveUserId(session.metadata, (session.customer as string) ?? null);
      const plan = (session.metadata?.plan as PlanId | undefined) ?? "pro";
      if (userId) {
        await ctx.runMutation(internal.billing.upsertSubscription, {
          userId,
          plan,
          status: "active",
          stripeCustomerId: (session.customer as string) ?? undefined,
          stripeSubscriptionId: (session.subscription as string) ?? undefined,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(
        subscription.metadata,
        (subscription.customer as string) ?? null,
      );
      const plan = (subscription.metadata?.plan as PlanId | undefined) ?? "pro";
      const status: "active" | "trialing" | "past_due" | "canceled" =
        subscription.status === "active"
          ? "active"
          : subscription.status === "trialing"
            ? "trialing"
            : subscription.status === "past_due" || subscription.status === "unpaid"
              ? "past_due"
              : "canceled";
      if (userId) {
        await ctx.runMutation(internal.billing.upsertSubscription, {
          userId,
          plan,
          status,
          stripeCustomerId: (subscription.customer as string) ?? undefined,
          stripeSubscriptionId: subscription.id,
          // Stripe has moved this field around across API versions — read it
          // defensively and fall back to the first subscription item's period.
          currentPeriodEnd: (() => {
            const sub = subscription as unknown as {
              current_period_end?: number;
              items: { data: Array<{ current_period_end?: number }> };
            };
            const seconds = sub.current_period_end ?? sub.items.data[0]?.current_period_end;
            return seconds ? seconds * 1000 : undefined;
          })(),
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = await resolveUserId(
        subscription.metadata,
        (subscription.customer as string) ?? null,
      );
      if (userId) {
        await ctx.runMutation(internal.billing.upsertSubscription, {
          userId,
          plan: "free",
          status: "canceled",
          stripeCustomerId: (subscription.customer as string) ?? undefined,
          stripeSubscriptionId: subscription.id,
        });
      }
      break;
    }

    default:
      // Ignore everything else — the plan only cares about these three events.
      break;
  }

  return new Response(null, { status: 200 });
});
