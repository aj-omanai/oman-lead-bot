import { describe, expect, it } from "vitest";
import { FOLLOW_UP_DELAY_MS, isEligibleForFollowUp, type FollowUpEligibilityInput } from "./followUpEligibility";

const NOW = 1_700_000_000_000; // fixed reference point

function base(overrides: Partial<FollowUpEligibilityInput> = {}): FollowUpEligibilityInput {
  return {
    status: "sent",
    lastContactedAt: NOW - FOLLOW_UP_DELAY_MS, // exactly 3 days ago
    optedOut: false,
    plan: "pro",
    hasExistingFollowUp: false,
    now: NOW,
    ...overrides,
  };
}

describe("isEligibleForFollowUp", () => {
  it("is eligible for a lead sent exactly 3 days ago on Pro with no existing follow-up", () => {
    expect(isEligibleForFollowUp(base())).toBe(true);
  });

  it("3-day boundary: not yet eligible one millisecond before 3 days", () => {
    const input = base({ lastContactedAt: NOW - FOLLOW_UP_DELAY_MS + 1 });
    expect(isEligibleForFollowUp(input)).toBe(false);
  });

  it("3-day boundary: eligible well past 3 days", () => {
    const input = base({ lastContactedAt: NOW - FOLLOW_UP_DELAY_MS * 2 });
    expect(isEligibleForFollowUp(input)).toBe(true);
  });

  it("excludes opted-out leads", () => {
    expect(isEligibleForFollowUp(base({ optedOut: true }))).toBe(false);
  });

  it("excludes leads that already have a follow-up (the one-per-lead cap)", () => {
    expect(isEligibleForFollowUp(base({ hasExistingFollowUp: true }))).toBe(false);
  });

  it("excludes leads whose status isn't 'sent'", () => {
    expect(isEligibleForFollowUp(base({ status: "replied" }))).toBe(false);
    expect(isEligibleForFollowUp(base({ status: "new" }))).toBe(false);
    expect(isEligibleForFollowUp(base({ status: "drafted" }))).toBe(false);
  });

  it("excludes leads that were never marked contacted", () => {
    expect(isEligibleForFollowUp(base({ lastContactedAt: undefined }))).toBe(false);
  });

  it("gates on plan: excludes Free, includes Pro and Business", () => {
    expect(isEligibleForFollowUp(base({ plan: "free" }))).toBe(false);
    expect(isEligibleForFollowUp(base({ plan: "pro" }))).toBe(true);
    expect(isEligibleForFollowUp(base({ plan: "business" }))).toBe(true);
  });
});
