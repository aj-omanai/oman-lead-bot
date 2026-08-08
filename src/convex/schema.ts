import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// Billing plans — limits are enforced server-side before every paid LLM or
// email call (see billing.ts / pitch.ts / outreach.ts).
export const PLAN_VALIDATOR = v.union(
  v.literal("free"),
  v.literal("pro"),
  v.literal("business"),
);
export type Plan = Infer<typeof PLAN_VALIDATOR>;

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Leads collected by the user's pipeline (demo workspace)
    leads: defineTable({
      userId: v.id("users"),
      name: v.string(),
      phone: v.string(),
      email: v.optional(v.string()),
      rating: v.number(),
      reviews: v.number(),
      city: v.string(),
      category: v.string(),
      source: v.string(),
      pitch: v.optional(v.string()),
      emailSubject: v.optional(v.string()),
      emailBody: v.optional(v.string()),
      optedOut: v.optional(v.boolean()),
      lastContactedAt: v.optional(v.number()),
      lastContactChannel: v.optional(
        v.union(v.literal("whatsapp"), v.literal("email")),
      ),
      notes: v.optional(v.string()),
      // WhatsApp Cloud API delivery tracking (updated via webhook).
      whatsappStatus: v.optional(
        v.union(
          v.literal("sent"),
          v.literal("delivered"),
          v.literal("read"),
          v.literal("failed"),
        ),
      ),
      whatsappMessageId: v.optional(v.string()),
      // ZeroBounce email verification result.
      emailVerified: v.optional(v.string()),
      emailVerifiedAt: v.optional(v.number()),
      status: v.union(v.literal("new"), v.literal("drafted"), v.literal("sent")),
    }).index("by_user", ["userId"]),

    // Billing subscription — one row per user; absent rows mean "free".
    subscriptions: defineTable({
      userId: v.id("users"),
      plan: PLAN_VALIDATOR,
      status: v.union(
        v.literal("active"),
        v.literal("trialing"),
        v.literal("past_due"),
        v.literal("canceled"),
        v.literal("incomplete"),
      ),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      currentPeriodEnd: v.optional(v.number()),
      updatedAt: v.number(),
    })
      .index("by_user", ["userId"])
      .index("by_stripe_subscription", ["stripeSubscriptionId"]),

    // Per-user, per-month usage counters (month key: "YYYY-MM").
    usage: defineTable({
      userId: v.id("users"),
      month: v.string(),
      aiDrafts: v.number(),
      emails: v.number(),
      whatsapp: v.number(),
    }).index("by_user_month", ["userId", "month"]),

    // AI-drafted follow-ups — created by the daily cron for sent leads with no
    // reply after 3 days, reviewed by the user in the Follow-ups tab. The
    // by_lead index is how the at-most-one-per-lead cap is enforced (any row,
    // pending/sent/skipped, blocks a second follow-up).
    followUps: defineTable({
      leadId: v.id("leads"),
      userId: v.id("users"), // denormalized for the tab's per-user query
      channel: v.union(v.literal("whatsapp"), v.literal("email")),
      draftSubject: v.optional(v.string()), // email only
      draftBody: v.string(),
      status: v.union(
        v.literal("pending"),
        v.literal("sent"),
        v.literal("skipped"),
      ),
      sentAt: v.optional(v.number()),
    })
      .index("by_user_status", ["userId", "status"])
      .index("by_lead", ["leadId"]),

    // Shared server-side discovery pool — refreshed by a daily Convex cron
    // (crons.ts) that scrapes yellowpages.om. Users import rows into their own
    // workspace via Leads → Discovery pool (deduped by name + phone).
    scrapeResults: defineTable({
      name: v.string(),
      phone: v.string(),
      rating: v.number(),
      reviews: v.number(),
      city: v.string(),
      category: v.string(),
      sourceUrl: v.string(),
      scrapedAt: v.number(),
    }).index("by_category", ["category"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
