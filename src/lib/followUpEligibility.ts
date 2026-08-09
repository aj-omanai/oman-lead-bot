import { planAtLeast, type PlanId } from "./plans";

/**
 * Pure eligibility check for follow-up automation, kept separate from
 * src/convex/followUpsData.ts so it's testable without a live Convex
 * backend (this repo's `_generated` types only exist after `npx convex dev`).
 * The Convex query calls this for the same rules it implements — this isn't
 * a test-only duplicate of the logic.
 */

export const FOLLOW_UP_DELAY_MS = 3 * 24 * 60 * 60 * 1000;

export interface FollowUpEligibilityInput {
  status: "new" | "drafted" | "sent" | "replied";
  lastContactedAt: number | undefined;
  optedOut: boolean | undefined;
  plan: PlanId;
  /** Does a followUps row already exist for this lead (any status)? */
  hasExistingFollowUp: boolean;
  now: number;
}

export function isEligibleForFollowUp(input: FollowUpEligibilityInput): boolean {
  if (input.status !== "sent") return false;
  if (!input.lastContactedAt) return false;
  if (input.now - input.lastContactedAt < FOLLOW_UP_DELAY_MS) return false;
  if (input.optedOut) return false;
  if (!planAtLeast(input.plan, "pro")) return false;
  if (input.hasExistingFollowUp) return false;
  return true;
}
