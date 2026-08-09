# Oman Lead Bot 🇴🇲

Zero-cost, AI-powered **B2B lead generation for Oman and GCC businesses**. The app
finds and scores real leads, drafts personalized Gulf Arabic pitches with a free
LLM, sends them over WhatsApp and email, and follows up automatically — with a
human approving every send.

Built with **Vite + React 19 + TypeScript**, **Tailwind v4 + shadcn/ui**,
**Convex** (backend & database), **Convex Auth** (email OTP), and **Framer Motion**.

---

## ✨ What's inside

| Tab | What it does |
| --- | --- |
| **Overview** | Dashboard: pipeline chart (leads by stage), usage meters, quick actions |
| **Script Library** | The free Python toolkit for the original local scraping pipeline |
| **Setup Guide** | Step-by-step onboarding checklist |
| **Leads** | Your lead database: CSV import, yellowpages discovery pool, AI **scoring** (Hot / Warm / Cold with reasons), do-not-contact toggle, notes |
| **Pipeline** | Sales kanban: `new → qualified → negotiating → won/lost`, drag-and-drop cards, inline deal values, open pipeline & weighted forecast |
| **Email Outreach** | AI-draft subject + body, **ZeroBounce** email verification, send (Pro+), delivery tracking |
| **WhatsApp Outreach** | Official **WhatsApp Business Cloud API** (ToS-compliant, no Selenium), live delivery statuses (sent → delivered → read / failed) |
| **Follow-ups** | The app auto-drafts a follow-up 3 days after an unanswered send; you approve, edit, or skip |
| **Billing** | Plan cards, monthly usage meters, Stripe Checkout upgrade, manage subscription |
| **Settings** | Integration status for every key, free-key hints, RTL toggle |

Also included: a full **Arabic RTL mode** (mirrors the whole interface and translates the landing page), dark/light theme, and responsive mobile layouts.

---

## 🚀 Quick start

```bash
bun install      # install dependencies (Bun is the package manager)
bun run dev      # start the Vite dev server
```

The backend is Convex; in a local checkout run `npx convex dev` in a second
terminal (this project's hosted deployment already manages its own dev process).

**Sign in** at `/auth` (email OTP — no password needed) and you land on the
dashboard.

---

## 🔑 Environment variables (the Keys / API keys tab)

Keys are read **server-side only** — paste them into the project's *Keys / API
keys* settings under these exact names. The app never displays or stores them.

| Variable | Needed for | Get it free at |
| --- | --- | --- |
| `GROQ_API_KEY` | AI drafting (priority provider) | console.groq.com/keys — no credit card |
| `GEMINI_API_KEY` | AI drafting (fallback) | aistudio.google.com/apikey |
| `VLY_INTEGRATION_KEY` | Sending emails | pre-configured in this project (`sk_*`) |
| `STRIPE_SECRET_KEY` | Billing (Checkout + portal) | dashboard.stripe.com |
| `STRIPE_WEBHOOK_SECRET` | Billing webhook sync | Stripe dashboard → webhooks |
| `ZEROBOUNCE_API_KEY` | Email verification | zerobounce.net (100 checks/mo free) |
| `WHATSAPP_TOKEN` | WhatsApp sending | Meta App Dashboard (system-user token) |
| `WHATSAPP_PHONE_NUMBER_ID` | WhatsApp sending | Meta App Dashboard → WhatsApp → API Setup |
| `WHATSAPP_VERIFY_TOKEN` | WhatsApp webhook | any secret string you choose |

Only `GROQ_API_KEY` / `GEMINI_API_KEY` are needed for the core experience;
everything else is a progressive add-on. The **Settings** tab shows which are
configured and walks you through each one.

---

## 🧭 How to use it — the daily workflow

1. **Add leads** — *Leads* tab → **Import CSV** (name, phone, city, category, …),
   pull from the **Discovery Pool** (scraped yellowpages.com.om listings), or use
   the seeded sample data.
2. **Let the AI draft** — open a lead → **Draft with AI**. The app writes a
   personalized Gulf Arabic pitch (Groq first, Gemini fallback) and scores the
   lead (Hot / Warm / Cold) with human-readable reasons.
3. **Verify emails** (recommended) — *Email Outreach* → **Verify** runs the
   address through ZeroBounce so outreach doesn't bounce.
4. **Send** — *Email Outreach* (Pro+) or *WhatsApp Outreach* (Pro+), then
   approve in the review dialog. Delivery statuses update live.
5. **Follow-ups happen automatically** — every night a cron drafts a polite
   follow-up for any sent-but-unanswered lead older than 3 days. Approve, edit,
   or skip it in the *Follow-ups* tab (Pro+).
6. **Run the deal** — drag the lead through the *Pipeline* kanban, set a deal
   value, and watch open pipeline / weighted forecast / win rate update in
   Overview.

**Do-not-contact** — flip the per-lead toggle and AI drafting + sending on both
channels is blocked server-side.

---

## 💳 Plans & quotas

Quotas are enforced **server-side before every paid LLM / email / WhatsApp
call**. Usage resets monthly.

| | Free | Pro ($19/mo) | Business ($49/mo) |
| --- | --- | --- | --- |
| AI drafts / mo | 20 | 300 | 1,500 |
| Emails / mo | 0 | 200 | 1,000 |
| WhatsApp msgs / mo | 0 | 200 | 1,000 |
| Scrape sources | 1 | 5 | 20 |
| Seats | 1 | 1 | 5 |
| Pipeline, scoring, follow-ups | ✅ | ✅ | ✅ |

Upgrade in **Billing** — Stripe Checkout uses inline `price_data`, so nothing
needs to be pre-created in the Stripe dashboard.

### Webhooks (one-time setup)

- **Stripe** — add an endpoint in Stripe for `<site-url>/stripe-webhook`,
  subscribe to `checkout.session.completed`,
  `customer.subscription.created/updated/deleted`, and paste
  `STRIPE_WEBHOOK_SECRET`. Without it, upgrades won't activate automatically.
- **WhatsApp** — in the Meta App Dashboard, point the webhook at
  `<site-url>/whatsapp-webhook`, verification token
  `WHATSAPP_VERIFY_TOKEN`, subscribe to **messages**. This powers live delivery
  receipts and the verify handshake.

---

## 🧪 Testing & CI

```bash
bun run test        # vitest — 18 tests, no external services needed
bun tsc -b --noEmit # typecheck
```

Tests live in `tests/` (outside `src/convex/`, so the Convex CLI never
typechecks them) and cover the scoring rules, pipeline aggregation, and the
follow-up eligibility logic (3-day window, opt-out, one-per-lead cap, plan gate).

**GitHub CI** — `.github/workflows/ci.yml` runs the typecheck and the full test
suite on every push/PR. `src/convex/_generated` is committed to the repo (the
standard Convex pattern) so CI passes on a fresh clone without a Convex
deployment.

---

## 🛠 Development guide

- **Stack**: Vite · React 19 · React Router v7 · Tailwind v4 · shadcn/ui ·
  Convex (backend + DB) · Convex Auth · Framer Motion.
- **Layout**: pages in `src/pages`, components in `src/components`, shadcn
  primitives in `src/components/ui`, backend in `src/convex`.
- **Auth**: use `useAuth()` from `@/hooks/use-auth`; protect routes with
  `RequireAuth`. All server functions check `getAuthUserId` — never trust the
  client.
- **Convex rules**: `"use node"` action files can't hold queries/mutations —
  delegate to plain companion files (e.g. `followUps.ts` → `followUpStore.ts`).
  External HTTP lives in `src/convex/http.ts` webhooks. Schema in
  `src/convex/schema.ts` (`schemaValidation: false`).
- **Styling**: theme tokens in `src/index.css` (oklch), logical properties
  (`ms-`/`me-`/`start`/`end`) so everything mirrors under RTL (`useRtl()`).
- Do not edit `src/convex/auth.ts`, `src/convex/auth.config.ts`, or
  `src/convex/auth/emailOtp.ts`.

## 📁 Key files

```
src/convex/
  schema.ts        # all tables: leads, usage, subscriptions, followUps, …
  scoring.ts       # deterministic 0–100 lead scoring + bands
  pipeline.ts      # stages, deal values, pipeline summary
  pitch.ts         # Groq/Gemini drafting (free tier)
  outreach.ts      # email draft/send + ZeroBounce verification
  whatsapp.ts      # WhatsApp Business Cloud API sends
  followUps.ts     # 3-day follow-up cron + approve/send
  http.ts          # Stripe + WhatsApp webhooks
  billing.ts       # plans, quotas, usage metering
  crons.ts         # scheduled jobs (follow-ups, scraper)
src/components/dashboard/  # one file per dashboard tab
```
