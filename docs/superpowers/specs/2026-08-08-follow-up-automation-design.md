# Follow-up automation — design spec

**Status:** Approved, not yet implemented
**Date:** 2026-08-08
**Scope:** First sub-project of a larger "fully automated marketing and sales" goal (see [Decomposition](#decomposition) below) — this spec covers only follow-up automation.

## Problem

Every channel in the app today (WhatsApp, email) is one-shot: a rep drafts a pitch, sends it, and if nobody replies, nothing happens unless a human remembers to follow up manually. That's the single biggest gap between "has AI drafting and sending" and "is actually automated."

## Decomposition

"Fully automated marketing and sales" was flagged as too broad for one spec. It breaks into independent sub-projects:

1. **Follow-up automation** (this spec)
2. Lead scoring / qualification
3. A real sales pipeline (negotiating/won/lost, deal value)
4. Scheduled/server-side lead sourcing (replacing the manual local Python scrape + CSV import)
5. Broader marketing channels / content (social, ads) — largest, least-defined, deferred indefinitely until the above prove out

Each gets its own spec → plan → implementation cycle. This document is only #1.

## Goals

- A sent pitch that gets no reply within 3 days automatically gets a follow-up drafted, without a human having to notice or remember.
- Nothing sends without a human clicking approve — automation drafts, a person still decides.
- Reuses existing channels, quota system, and send paths rather than inventing new ones.

## Non-goals (deferred to a later round if they turn out to matter)

- Configurable delay/cadence per workspace (fixed at 3 days / 1 follow-up for v1)
- Cross-channel escalation (e.g. WhatsApp → email if still no reply)
- A daily cap on cron-generated drafts (fine at current lead volumes; trivial to add later)
- Fully autonomous sending with no review step

## Data model

### New table: `followUps`

```ts
followUps: defineTable({
  leadId: v.id("leads"),
  userId: v.id("users"),              // denormalized for the tab's per-user query
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
```

Three states, not four — "Approve & send" is one atomic action (see [Review actions](#review-actions)), so there's no separate "approved-but-not-yet-sent" state to represent. `pending` moves straight to either `sent` or `skipped`.

The `by_lead` index is how the 1-per-lead cap is enforced: before queueing, the cron checks whether *any* row already exists for that `leadId` (any status — pending, sent, or skipped all block a second follow-up). Simplest correct way to implement "at most one, ever."

### `leads` gets one new field

```ts
lastContactChannel: v.optional(v.union(v.literal("whatsapp"), v.literal("email"))),
```

Set by `markContacted` (already shared by both send paths — gains a `channel` parameter). Needed so a follow-up knows which channel to reuse.

## Backend flow

### Detection & drafting — `src/convex/followUps.ts` (new, `"use node"`), on a daily Convex cron

Eligibility, in order:
1. `status === "sent"` (not drafted/new/replied)
2. `Date.now() - lastContactedAt >= 3 days`
3. `!optedOut`
4. Workspace plan is `pro` or `business` (via the existing `getActivePlan` helper from `usage.ts`)
5. No existing `followUps` row for this lead (`by_lead` index check)

For each match: build a "this is a polite follow-up, not a repeat of the original pitch" prompt, draft it via the same Groq/Gemini priority logic already shared through `llm.ts`, insert a `pending` row. This consumes one `aiDrafts` quota unit per lead — same accounting as a manual draft, no new quota dimension.

Per-lead failures (a flaky LLM call) are caught and logged, not allowed to abort the rest of the batch. If neither `GROQ_API_KEY` nor `GEMINI_API_KEY` is configured, the job exits immediately — same "not configured" pattern used everywhere else in this codebase.

As with `pitch.ts` and `emailOutreach.ts`, the `"use node"` action delegates actual database reads/writes to plain (non-`"use node"`) internal queries/mutations in a companion file, rather than touching `ctx.db` directly.

### Review actions

Called from the new Follow-ups tab (see [Frontend](#frontend)):

- **Edit** — plain mutation updating `draftBody`/`draftSubject` on a `pending` row.
- **Approve & send** — re-checks the lead's *current* `status`/`optedOut` first (see [Staleness handling](#staleness-handling)), then routes through the existing `sendWhatsAppMessage` / `sendEmail` actions, extended with an optional "send this text instead of `lead.pitch`" parameter. This keeps one source of truth for how a send actually happens rather than duplicating that logic here. An email follow-up still consumes one `emails` quota unit, exactly like a manual email send; WhatsApp sends remain unmetered, matching current behavior.
- **Skip** — marks the row `skipped`. Counts against the 1-per-lead cap, so the lead is not re-queued.

### Staleness handling

Between the cron drafting a follow-up and a human approving it, the lead's real-world state can change — it might get a reply through some other means, or get marked do-not-contact. **Approve & send re-validates `status`/`optedOut` at send time**, not just at draft time. If either changed, it aborts with a clear message ("This lead replied since this was drafted — skipping.") and auto-marks the row `skipped` rather than sending something stale. This is in scope for the first version, not a follow-up fix — silently sending a stale follow-up to someone who already replied is exactly the kind of bug that erodes trust in "automated."

## Frontend

New **Follow-ups** nav tab, Pro/Business only (same upgrade-prompt pattern as Email Outreach for Free-plan users). Each pending row shows the lead name, a channel icon, the drafted text (+ subject for email), and elapsed time since the original send, with three actions: **Approve & send**, **Edit** (inline textarea), **Skip**. Acted-on rows disappear immediately (live query, no manual refresh). The nav item carries a small pending-count badge. Empty state: "No follow-ups need your review right now."

## Plan gating & quota recap

- Feature gated to Pro/Business (matches the Email Outreach precedent — automation that saves real time is a natural upsell, and Free's quota wasn't sized for it).
- Drafting consumes `aiDrafts` quota (1 per lead drafted).
- Sending an email follow-up consumes `emails` quota (1 per send); WhatsApp sends are unmetered, unchanged from today.
- No new quota dimension introduced.

## Testing

First scheduled/cron-driven logic in this codebase, so it gets a real test rather than a manual eyeball:
- Vitest test for the eligibility query — covers the 3-day window boundary, opt-out exclusion, the one-per-lead cap, and the plan gate.
- Manual end-to-end pass: seed a lead with a backdated `lastContactedAt`, trigger the action directly via `npx convex run`, confirm a `followUps` row appears, then walk it through approve/skip in the UI.

This is also the first test file in the repo — small in scope, but real infrastructure, not a one-off.
