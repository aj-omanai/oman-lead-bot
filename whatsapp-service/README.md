# Wasl WhatsApp service

Replaces `messenger.py`'s Selenium/PyWhatKit browser automation with
[Baileys](https://github.com/WhiskeySockets/Baileys) — a library that speaks
WhatsApp Web's own protocol over a websocket instead of driving a real
Chrome window. Same "scan a QR code once" experience, but stable enough to
run unattended and one step closer to compliant than automating a browser.

**This is still not the official WhatsApp Business Cloud API.** It's a real
improvement over Selenium (no browser to babysit, no window to keep open,
much less likely to trip WhatsApp's automation detection), but the
long-term compliant path — with delivery receipts, message templates, and
Meta's blessing — is still the official Cloud API. Treat this as the
pragmatic middle step the earlier enhancement report called for.

## Why this can't run inside Convex

Convex functions are short-lived: an action runs, returns, and exits.
Baileys needs the opposite — a **persistent** websocket connection that
stays open to receive messages and keep the session alive, backed by
credentials persisted to **disk** across restarts. That means this piece
has to be its own always-on process, on a host with a persistent volume.
Convex talks to it over a small internal HTTP API (see below).

## Multi-tenant by design

Each Convex user gets their own Baileys session (`sessionId` = the user's
Convex user ID), stored under `auth_state/<sessionId>/`. Every workspace
connects its own WhatsApp number rather than sharing one — that matches
the Free/Pro/Business plan model in the main app, where each paying
workspace is expected to send from its own number.

## Running locally

```bash
cd whatsapp-service
npm install
cp .env.example .env   # set WHATSAPP_SERVICE_SECRET at minimum
npm run dev
```

Then `GET /status/<any-id>` with the `X-Service-Secret` header to get a
pairing QR code, scan it from WhatsApp → Linked Devices, and `POST /send`
to try a real message.

## API

All routes except `/health` require an `X-Service-Secret` header matching
`WHATSAPP_SERVICE_SECRET`.

| Route | Method | Body / params | Returns |
|---|---|---|---|
| `/health` | GET | — | `{ ok: true }` |
| `/status/:sessionId` | GET | — | `{ connected, qr, phoneNumber }` — starts pairing on first call |
| `/send` | POST | `{ sessionId, phone, message }` | `{ ok: true }` |
| `/logout/:sessionId` | POST | — | `{ ok: true }` — clears credentials, forces a fresh QR |

Inbound WhatsApp messages are forwarded to
`${CONVEX_SITE_URL}/whatsapp/webhook` with an `X-Webhook-Secret` header,
if `CONVEX_SITE_URL` and `CONVEX_WEBHOOK_SECRET` are set.

## Deploying

Needs an always-on host with a persistent volume — **not** Vercel/Netlify/a
serverless function. `Dockerfile` + `fly.toml` are included for
[Fly.io](https://fly.io) (cheap, has persistent volumes, one `fly deploy`);
Railway or a small VPS with Docker work the same way. Steps for Fly.io:

```bash
fly launch --no-deploy         # creates the app, keep the generated fly.toml or use the one here
fly volumes create wasl_wa_auth --size 1
fly secrets set \
  WHATSAPP_SERVICE_SECRET=$(openssl rand -hex 32) \
  CONVEX_SITE_URL=https://your-project.convex.site \
  CONVEX_WEBHOOK_SECRET=$(openssl rand -hex 32)
fly deploy
```

Then in the main app's Convex Keys settings, set:
- `WHATSAPP_SERVICE_URL` — this service's public URL
- `WHATSAPP_SERVICE_SECRET` — the same value you set above
- `WHATSAPP_WEBHOOK_SECRET` — the same value as `CONVEX_WEBHOOK_SECRET` above

## Losing the auth volume

If the persistent volume is ever lost, every connected workspace shows as
disconnected and needs to re-scan a QR code. No message history is lost on
the Convex side — leads and their status are unaffected, only the WhatsApp
pairing itself needs to be redone.
