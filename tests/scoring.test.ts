import { describe, expect, test } from "vitest";
import { scoreBand, scoreLead } from "../src/convex/scoring";
import {
  computePipelineSummary,
  PIPELINE_STAGES,
  STAGE_PROBABILITY,
} from "../src/convex/pipeline";

const DAY = 24 * 60 * 60 * 1000;
const now = Date.now();

function base(overrides: Record<string, unknown> = {}) {
  return {
    phone: "+96824526001",
    category: "General",
    status: "new" as const,
    createdAt: now - 5 * DAY,
    ...overrides,
  };
}

describe("scoreLead", () => {
  test("opted-out leads score 0 with a single reason", () => {
    const { score, reasons } = scoreLead(base({ optedOut: true }));
    expect(score).toBe(0);
    expect(reasons).toEqual(["opted out"]);
  });

  test("contactability: email + verified email stack on top of a phone", () => {
    const phoneOnly = scoreLead(base());
    const withEmail = scoreLead(base({ email: "sales@example.com" }));
    const verified = scoreLead(
      base({ email: "sales@example.com", emailVerified: "valid" }),
    );
    expect(withEmail.score).toBe(phoneOnly.score + 15);
    expect(verified.score).toBe(withEmail.score + 10);
    expect(withEmail.reasons).toContain("has email");
    expect(verified.reasons).toContain("email verified");
  });

  test("engagement: sent beats drafted beats new; read beats delivered", () => {
    const fresh = scoreLead(base());
    const drafted = scoreLead(base({ status: "drafted" }));
    const sent = scoreLead(base({ status: "sent" }));
    const delivered = scoreLead(base({ status: "sent", whatsappStatus: "delivered" }));
    const read = scoreLead(base({ status: "sent", whatsappStatus: "read" }));
    expect(drafted.score).toBe(fresh.score + 5);
    expect(sent.score).toBe(drafted.score + 5);
    expect(delivered.score).toBe(sent.score + 5);
    expect(read.score).toBe(sent.score + 10);
    expect(read.reasons).toContain("read your message");
  });

  test("category affinity: top sectors outrank low-priority ones", () => {
    const construction = scoreLead(base({ category: "Construction Companies" }));
    const pest = scoreLead(base({ category: "Pest Control" }));
    expect(construction.score).toBe(pest.score + 12); // 15 vs 3
    expect(construction.reasons).toContain("high-value category");
    expect(pest.reasons).not.toContain("high-value category");
  });

  test("freshness: leads added within 30 days get a bonus", () => {
    const fresh = scoreLead(base({ createdAt: now - 5 * DAY }));
    const stale = scoreLead(base({ createdAt: now - 60 * DAY }));
    expect(fresh.score).toBe(stale.score + 10);
    expect(fresh.reasons).toContain("recently added");
  });

  test("the best possible lead tops out at 95 (cap is defensive at 100)", () => {
    const { score } = scoreLead(
      base({
        phone: "+96890000000",
        email: "sales@example.com",
        emailVerified: "valid",
        category: "Construction Companies",
        status: "sent",
        whatsappStatus: "read",
      }),
    );
    expect(score).toBe(95);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("scoreBand", () => {
  test("classifies hot / warm / cold at the boundaries", () => {
    expect(scoreBand(100)).toBe("hot");
    expect(scoreBand(70)).toBe("hot");
    expect(scoreBand(69)).toBe("warm");
    expect(scoreBand(40)).toBe("warm");
    expect(scoreBand(39)).toBe("cold");
    expect(scoreBand(0)).toBe("cold");
  });
});

describe("computePipelineSummary", () => {
  test("empty pipeline is all zeros", () => {
    const s = computePipelineSummary([]);
    expect(s.openValue).toBe(0);
    expect(s.weightedValue).toBe(0);
    expect(s.wonValue).toBe(0);
    expect(s.winRate).toBe(0);
    expect(Object.values(s.counts).reduce((a, b) => a + b, 0)).toBe(0);
  });

  test("leads without a stage default to 'new'", () => {
    const s = computePipelineSummary([{ dealValue: 100 }]);
    expect(s.counts.new).toBe(1);
    expect(s.openValue).toBe(100);
  });

  test("open value excludes won/lost; forecast uses stage probability", () => {
    const s = computePipelineSummary([
      { stage: "qualified", dealValue: 1000 },
      { stage: "negotiating", dealValue: 500 },
      { stage: "won", dealValue: 2000 },
      { stage: "lost", dealValue: 300 },
    ]);
    expect(s.counts.qualified).toBe(1);
    expect(s.counts.negotiating).toBe(1);
    expect(s.counts.won).toBe(1);
    expect(s.counts.lost).toBe(1);
    expect(s.openValue).toBe(1500);
    expect(s.weightedValue).toBe(
      1000 * STAGE_PROBABILITY.qualified + 500 * STAGE_PROBABILITY.negotiating,
    );
    expect(s.wonValue).toBe(2000);
    expect(s.avgDeal).toBe(950);
    expect(s.winRate).toBe(0.5);
  });

  test("win rate counts only closed deals", () => {
    const s = computePipelineSummary([
      { stage: "won", dealValue: 500 },
      { stage: "new" },
      { stage: "qualified" },
    ]);
    expect(s.winRate).toBe(1);
  });

  test("every pipeline stage is accounted for", () => {
    expect(PIPELINE_STAGES).toEqual([
      "new",
      "qualified",
      "negotiating",
      "won",
      "lost",
    ]);
  });
});
