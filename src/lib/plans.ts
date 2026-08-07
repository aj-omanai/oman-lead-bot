/**
 * Plan catalogue — shared between the Convex backend (quota enforcement,
 * checkout session creation) and the frontend (pricing cards, usage meters).
 *
 * Prices are created inline on the Stripe Checkout Session (see
 * convex/stripeActions.ts), so there is nothing to pre-configure in the
 * Stripe dashboard beyond a secret key.
 */

export type PlanId = "free" | "pro" | "business";

export interface PlanLimits {
  /** AI-drafted pitches (WhatsApp + email) per calendar month. */
  aiDrafts: number;
  /** Outbound emails per calendar month. 0 = email outreach not available. */
  emails: number;
  /** Configurable scrape sources. */
  sources: number;
  /** Team seats sharing this workspace's quota. */
  seats: number;
}

export interface PlanDef {
  id: PlanId;
  name: string;
  priceUsd: number;
  tagline: string;
  limits: PlanLimits;
  features: string[];
}

export const PLAN_ORDER: PlanId[] = ["free", "pro", "business"];

export const PLANS: Record<PlanId, PlanDef> = {
  free: {
    id: "free",
    name: "Free",
    priceUsd: 0,
    tagline: "Try the pipeline on your own leads.",
    limits: { aiDrafts: 20, emails: 0, sources: 1, seats: 1 },
    features: [
      "20 AI-drafted WhatsApp pitches / month",
      "1 scrape source",
      "CSV import & export",
      "Community support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceUsd: 19,
    tagline: "For a single rep running real outreach.",
    limits: { aiDrafts: 300, emails: 200, sources: 5, seats: 1 },
    features: [
      "300 AI-drafted pitches / month",
      "Email outreach (200 sends / month)",
      "5 scrape sources",
      "Opt-out & do-not-contact list",
      "Email support",
    ],
  },
  business: {
    id: "business",
    name: "Business",
    priceUsd: 49,
    tagline: "For a small team sharing one pipeline.",
    limits: { aiDrafts: 1500, emails: 1000, sources: 20, seats: 5 },
    features: [
      "1,500 AI-drafted pitches / month",
      "Email outreach (1,000 sends / month)",
      "20 scrape sources",
      "5 team seats",
      "Priority support",
    ],
  },
};

export function planAtLeast(plan: PlanId, min: PlanId): boolean {
  return PLAN_ORDER.indexOf(plan) >= PLAN_ORDER.indexOf(min);
}

/** Current billing period key, e.g. "2026-08". Periods reset in UTC. */
export function currentPeriodKey(date: Date = new Date()): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export type UsageKind = "aiDrafts" | "emails";
