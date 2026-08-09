import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

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

// "replied" is set automatically by the WhatsApp webhook when a lead
// answers — it isn't only a manual pipeline stage like the other three.
export const leadStatusValidator = v.union(
  v.literal("new"),
  v.literal("drafted"),
  v.literal("sent"),
  v.literal("replied"),
);
export type LeadStatus = Infer<typeof leadStatusValidator>;

// Shared by leads.lastContactChannel and followUps.channel — the two
// channels a pitch (or follow-up) can go out on.
export const contactChannelValidator = v.union(
  v.literal("whatsapp"),
  v.literal("email"),
);
export type ContactChannel = Infer<typeof contactChannelValidator>;

// A follow-up moves straight from "pending" to either "sent" or "skipped" —
// "Approve & send" is one atomic action, so there's no separate
// approved-but-not-yet-sent state to represent.
export const followUpStatusValidator = v.union(
  v.literal("pending"),
  v.literal("sent"),
  v.literal("skipped"),
);
export type FollowUpStatus = Infer<typeof followUpStatusValidator>;

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
      email: v.optional(v.string()), // contact email — powers the Email Outreach service
      rating: v.number(),
      reviews: v.number(),
      city: v.string(),
      category: v.string(),
      source: v.string(),
      pitch: v.optional(v.string()),
      status: leadStatusValidator,
      optedOut: v.optional(v.boolean()), // do-not-contact — blocks drafting & sending on this lead
      lastContactedAt: v.optional(v.number()),
      lastContactChannel: v.optional(contactChannelValidator), // which channel to reuse for a follow-up
      notes: v.optional(v.string()),
    }).index("by_user", ["userId"]),

    // Auto-drafted follow-ups for leads that went quiet after a sent pitch.
    // At most one row per lead, ever — enforced via by_lead before insert.
    followUps: defineTable({
      leadId: v.id("leads"),
      userId: v.id("users"), // denormalized for the review tab's per-user query
      channel: contactChannelValidator,
      draftSubject: v.optional(v.string()), // email only
      draftBody: v.string(),
      status: followUpStatusValidator,
      sentAt: v.optional(v.number()),
    })
      .index("by_user_status", ["userId", "status"])
      .index("by_lead", ["leadId"]),

    // One row per user, tracking their current plan and Stripe billing state.
    subscriptions: defineTable({
      userId: v.id("users"),
      plan: v.union(v.literal("free"), v.literal("pro"), v.literal("business")),
      status: v.union(
        v.literal("active"),
        v.literal("trialing"),
        v.literal("past_due"),
        v.literal("canceled"),
      ),
      stripeCustomerId: v.optional(v.string()),
      stripeSubscriptionId: v.optional(v.string()),
      currentPeriodEnd: v.optional(v.number()),
    })
      .index("by_user", ["userId"])
      .index("by_stripeCustomer", ["stripeCustomerId"])
      .index("by_stripeSubscription", ["stripeSubscriptionId"]),

    // Monthly usage counters per user, used to enforce plan limits.
    usage: defineTable({
      userId: v.id("users"),
      period: v.string(), // "YYYY-MM", UTC
      aiDrafts: v.number(),
      emails: v.number(),
    }).index("by_user_period", ["userId", "period"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
