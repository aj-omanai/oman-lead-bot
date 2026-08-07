import { httpRouter, type PublicHttpAction } from "convex/server";
import Stripe from "stripe";
import { auth } from "./auth";
import type { Id } from "./_generated/dataModel";
import type { PlanId } from "./billing";

const http = httpRouter();

auth.addHttpRoutes(http);

type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "incomplete";

/** Shape of the Subscription payload we rely on (SDK-version agnostic). */
type StripeSubscriptionShape = {
  id: string;
  status: string;
  customer: string | null;
  current_period_end: number;
  metadata: Record<string, string> | null;
};

function mapStripeStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
      return "canceled";
    default:
      return "incomplete";
  }
}

function isPlanId(value: string | undefined | null): value is PlanId {
  return value === "free" || value === "pro" || value === "business";
}

/**
 * Stripe webhook — syncs Checkout / subscription lifecycle into the
 * `subscriptions` table. Configure the endpoint URL as
 * `<site-url>/stripe-webhook` in the Stripe dashboard with the
 * STRIPE_WEBHOOK_SECRET from the project's Keys settings.
 */
http.route({
  path: "/stripe-webhook",
  method: "POST",
  handler: (async (ctx: any, request: Request) => {
    const key = process.env.STRIPE_SECRET_KEY;
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!key || !secret) {
      return new Response("Stripe webhook is not configured.", { status: 503 });
    }

    const body = await request.text();
    const signature = request.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature header.", { status: 400 });
    }

    let event: Stripe.Event;
    try {
      const stripe = new Stripe(key);
      event = stripe.webhooks.constructEvent(body, signature, secret);
    } catch (error) {
      return new Response(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : "unknown error"}`,
        { status: 400 },
      );
    }

    /** Upsert the user's subscription row — one row per user. */
    const upsert = async (
      userId: Id<"users">,
      patch: {
        plan: PlanId;
        status: SubscriptionStatus;
        stripeCustomerId?: string;
        stripeSubscriptionId?: string;
        currentPeriodEnd?: number;
      },
    ) => {
      if (!isPlanId(patch.plan)) return;
      const existing = await ctx.db
        .query("subscriptions")
        .withIndex("by_user", (q: any) => q.eq("userId", userId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, patch);
      } else {
        await ctx.db.insert("subscriptions", {
          ...patch,
          userId,
          updatedAt: Date.now(),
        });
      }
    };

    try {
      const stripe = new Stripe(key);

      switch (event.type) {
        // First payment completed → activate the plan.
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId as Id<"users"> | undefined;
          const plan = session.metadata?.plan;
          if (!userId || !plan) break;

          let periodEnd: number | undefined;
          if (typeof session.subscription === "string") {
            const sub = (await stripe.subscriptions.retrieve(
              session.subscription,
            )) as unknown as StripeSubscriptionShape;
            periodEnd = sub.current_period_end;
          }

          await upsert(userId, {
            plan: plan as PlanId,
            status: "active",
            stripeCustomerId:
              typeof session.customer === "string"
                ? session.customer
                : undefined,
            stripeSubscriptionId:
              typeof session.subscription === "string"
                ? session.subscription
                : undefined,
            currentPeriodEnd: periodEnd,
          });
          break;
        }

        // Renewal / status / plan changes → keep the row in sync.
        case "customer.subscription.created":
        case "customer.subscription.updated": {
          const sub = event.data.object as unknown as StripeSubscriptionShape;
          const userId = sub.metadata?.userId as Id<"users"> | undefined;
          if (!userId) break;
          await upsert(userId, {
            plan: (sub.metadata?.plan ?? "free") as PlanId,
            status: mapStripeStatus(sub.status),
            stripeCustomerId: sub.customer ?? undefined,
            stripeSubscriptionId: sub.id,
            currentPeriodEnd: sub.current_period_end,
          });
          break;
        }

        // Cancellation / non-renewal → the user drops back to Free.
        case "customer.subscription.deleted": {
          const sub = event.data.object as unknown as StripeSubscriptionShape;
          const userId = sub.metadata?.userId as Id<"users"> | undefined;
          if (userId) {
            await upsert(userId, {
              plan: (sub.metadata?.plan ?? "free") as PlanId,
              status: "canceled",
              stripeCustomerId: sub.customer ?? undefined,
              stripeSubscriptionId: sub.id,
              currentPeriodEnd: sub.current_period_end,
            });
          }
          break;
        }
      }
    } catch (error) {
      return new Response(
        `Webhook handler failed: ${error instanceof Error ? error.message : "unknown error"}`,
        { status: 500 },
      );
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }) as unknown as PublicHttpAction,
});

export default http;
