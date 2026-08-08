/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import type { Id } from "../src/convex/_generated/dataModel";
import { internal } from "../src/convex/_generated/api";
import { monthKey } from "../src/convex/billing";
import { FOLLOW_UP_DELAY_MS } from "../src/convex/followUps";
import schema from "../src/convex/schema";

// Load the project's Convex modules for the in-memory mock (the official
// convex-test pattern). Lives outside src/convex so the Convex CLI never
// typechecks it — see vitest.config.ts for the convex/values shim.
const modules = import.meta.glob("../src/convex/**/!(*.*.*)*.*s");

type T = ReturnType<typeof convexTest>;

const DAY = 24 * 60 * 60 * 1000;

async function makeUser(
  t: T,
  plan: "free" | "pro" | "business",
  now: number,
): Promise<Id<"users">> {
  return t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { name: "Test User" });
    if (plan !== "free") {
      await ctx.db.insert("subscriptions", {
        userId,
        plan,
        status: "active",
        currentPeriodEnd: now + 30 * DAY,
        updatedAt: now,
      });
    }
    return userId;
  });
}

async function makeSentLead(
  t: T,
  userId: Id<"users">,
  overrides: {
    name?: string;
    lastContactedAt?: number;
    optedOut?: boolean;
    status?: "new" | "drafted" | "sent";
    channel?: "whatsapp" | "email";
    email?: string;
  },
  now: number,
): Promise<Id<"leads">> {
  return t.run(async (ctx) => {
    return ctx.db.insert("leads", {
      userId,
      name: overrides.name ?? "Test Lead",
      phone: "+96890000000",
      rating: 0,
      reviews: 0,
      city: "Muscat",
      category: "Test",
      source: "test",
      status: overrides.status ?? "sent",
      lastContactedAt: overrides.lastContactedAt ?? now - FOLLOW_UP_DELAY_MS,
      optedOut: overrides.optedOut,
      lastContactChannel: overrides.channel,
      email: overrides.email,
    });
  });
}

async function eligibleIds(t: T, now: number): Promise<string[]> {
  const eligible = await t.query(internal.followUpStore.listEligible, {
    cutoff: now - FOLLOW_UP_DELAY_MS,
  });
  return eligible.map((e) => e.leadId);
}

describe("follow-up eligibility (listEligible)", () => {
  test("drafts only sent leads contacted 3+ days ago (window boundary)", async () => {
    const now = Date.now();
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "pro", now);

    // Exactly 3 days old → eligible. 1 minute shy of 3 days → not.
    const due = await makeSentLead(
      t,
      userId,
      { lastContactedAt: now - FOLLOW_UP_DELAY_MS },
      now,
    );
    const notYet = await makeSentLead(
      t,
      userId,
      { lastContactedAt: now - FOLLOW_UP_DELAY_MS + 60_000 },
      now,
    );
    // Old but never sent → not eligible.
    const notSent = await makeSentLead(
      t,
      userId,
      { status: "new", lastContactedAt: now - 10 * DAY },
      now,
    );

    const ids = await eligibleIds(t, now);
    expect(ids).toContain(due);
    expect(ids).not.toContain(notYet);
    expect(ids).not.toContain(notSent);
  });

  test("excludes opted-out leads", async () => {
    const now = Date.now();
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "pro", now);
    await makeSentLead(
      t,
      userId,
      { optedOut: true, lastContactedAt: now - 10 * DAY },
      now,
    );
    expect(await eligibleIds(t, now)).toHaveLength(0);
  });

  test("at most one follow-up per lead — any existing row blocks", async () => {
    const now = Date.now();
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "pro", now);
    const blocked = await makeSentLead(
      t,
      userId,
      { lastContactedAt: now - 10 * DAY },
      now,
    );
    const open = await makeSentLead(
      t,
      userId,
      { lastContactedAt: now - 10 * DAY, name: "Open Lead" },
      now,
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("followUps", {
        leadId: blocked,
        userId,
        channel: "whatsapp",
        draftBody: "already queued",
        status: "pending",
      });
    });

    const ids = await eligibleIds(t, now);
    expect(ids).toContain(open);
    expect(ids).not.toContain(blocked);
  });

  test("free plan is excluded; business is eligible", async () => {
    const now = Date.now();
    const t = convexTest(schema, modules);
    const freeUser = await makeUser(t, "free", now);
    const bizUser = await makeUser(t, "business", now);
    await makeSentLead(
      t,
      freeUser,
      { lastContactedAt: now - 10 * DAY },
      now,
    );
    const bizLead = await makeSentLead(
      t,
      bizUser,
      { lastContactedAt: now - 10 * DAY },
      now,
    );

    expect(await eligibleIds(t, now)).toEqual([bizLead]);
  });

  test("respects the monthly aiDrafts quota (cron drafts meter like manual ones)", async () => {
    const now = Date.now();
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "pro", now);
    await t.run(async (ctx) => {
      await ctx.db.insert("usage", {
        userId,
        month: monthKey(new Date(now)),
        aiDrafts: 300, // Pro monthly limit reached
        emails: 0,
        whatsapp: 0,
      });
    });
    await makeSentLead(
      t,
      userId,
      { lastContactedAt: now - 10 * DAY },
      now,
    );
    expect(await eligibleIds(t, now)).toHaveLength(0);
  });

  test("reuses the last contact channel, falling back to whatsapp", async () => {
    const now = Date.now();
    const t = convexTest(schema, modules);
    const userId = await makeUser(t, "pro", now);
    const emailLead = await makeSentLead(
      t,
      userId,
      { channel: "email", email: "hello@example.com", lastContactedAt: now - 10 * DAY },
      now,
    );
    const missingEmail = await makeSentLead(
      t,
      userId,
      { channel: "email", lastContactedAt: now - 10 * DAY, name: "No Email" },
      now,
    );
    const defaultWa = await makeSentLead(
      t,
      userId,
      { lastContactedAt: now - 10 * DAY, name: "Default" },
      now,
    );

    const eligible = await t.query(internal.followUpStore.listEligible, {
      cutoff: now - FOLLOW_UP_DELAY_MS,
    });
    const channelByLead = new Map(eligible.map((e) => [e.leadId, e.channel]));
    expect(channelByLead.get(emailLead)).toBe("email");
    expect(channelByLead.get(missingEmail)).toBe("whatsapp");
    expect(channelByLead.get(defaultWa)).toBe("whatsapp");
  });
});
