# Contributing to Oman Lead Bot

Thanks for wanting to help! This project is a zero-cost AI marketing & sales
toolkit for Oman/GCC businesses, and it's built to be easy to contribute to.

Please read the [README](README.md) first — it covers the stack, the feature
map, and the daily workflow.

## Ground rules

- **Be kind and constructive.** This is a small, friendly project.
- **No secrets in code.** Keys live in the project's *Keys / API keys* tab and
  are read server-side only. Never add a key to a file, a commit, or a PR.
- **Respect do-not-contact.** Outreach is a sensitive area: the per-lead
  do-not-contact flag is enforced *server-side* on every draft/send path. A PR
  that weakens that enforcement will not be merged.
- **Automation drafts, humans decide.** This project deliberately keeps a human
  approval step before anything sends. Keep it that way.
- **Keep it zero-cost.** The core loop runs on free tiers (Groq/Gemini,
  ZeroBounce free tier, WhatsApp Business Cloud). Prefer free-tier-friendly
  choices and make paid features opt-in.

## Getting started

```bash
bun install          # Bun is the package manager — do not use npm/yarn
bun run dev          # Vite dev server
bun run test         # vitest test suite
bun tsc -b --noEmit  # typecheck
```

The backend is Convex; sign in at `/auth` (email OTP). For backend work you may
need a Convex deployment — `npx convex dev` in a second terminal for a local
checkout.

## Where things live

- `src/pages/` — routes (Landing, Auth, Dashboard, …)
- `src/components/dashboard/` — one file per dashboard tab
- `src/components/ui/` — shadcn/ui primitives
- `src/convex/` — backend: `schema.ts`, plus one module per feature
  (`scoring.ts`, `pipeline.ts`, `followUps.ts`, `outreach.ts`, `whatsapp.ts`,
  `billing.ts`, …)
- `src/convex/http.ts` — webhooks (Stripe, WhatsApp)
- `tests/` — vitest tests (kept *outside* `src/convex/` so the Convex CLI
  doesn't typecheck them)

## Code conventions

- **TypeScript everywhere**, strict. Follow the surrounding style.
- **Convex rules:**
  - `"use node"` action files cannot define queries/mutations directly —
    delegate DB work to a plain companion file (e.g. `followUps.ts` →
    `followUpStore.ts`).
  - Queries/mutations check `getAuthUserId` server-side; never trust the client.
  - Schema changes go in `src/convex/schema.ts` (`schemaValidation: false`).
- **RTL is first-class.** The whole UI mirrors in Arabic. Use logical CSS
  properties (`ms-`/`me-`/`start`/`end`) instead of `ml-`/`mr-`/`left`/`right`
  so new UI mirrors for free. Run `useRtl()` where direction matters.
- **UI**: shadcn/ui + Tailwind v4, theme tokens in `src/index.css` (oklch).
  Reuse existing components before adding new abstractions.
- **Never edit** `src/convex/auth.ts`, `src/convex/auth.config.ts`, or
  `src/convex/auth/emailOtp.ts`.
- **Do not edit** `vite.config.ts` (platform-managed, HMR must stay disabled).

## Testing

- Every backend feature should come with tests in `tests/` (vitest). Existing
  coverage: scoring rules, pipeline aggregation, follow-up eligibility.
- `bun run test` must pass before you open a PR.
- CI (`.github/workflows/ci.yml`) runs the typecheck and the full suite on
  every push/PR — a red CI blocks the merge.

## Making a change

1. **Open an issue** first for anything non-trivial, or pick an existing one —
   say what you're working on so nobody duplicates it.
2. **Branch off `main`**: `git checkout -b feat/your-change`.
3. Make focused commits with clear messages.
4. Run the checks: `bun tsc -b --noEmit` and `bun run test`.
5. **Open a PR** describing what changed, why, and how to verify it. Reference
   the issue if there is one.

### PR checklist

- [ ] Typecheck passes (`bun tsc -b --noEmit`)
- [ ] Tests pass (`bun run test`) — new tests added for new backend behavior
- [ ] No secrets/keys introduced anywhere
- [ ] RTL: new UI uses logical properties and mirrors correctly
- [ ] Quota/usage gates (billing) and do-not-contact are enforced server-side
- [ ] README updated if user-facing behavior changed

## Questions?

Open an issue — maintainers and contributors hang out there.
