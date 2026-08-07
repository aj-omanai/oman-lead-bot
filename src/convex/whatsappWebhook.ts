"use node";

import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

/**
 * Receives inbound WhatsApp messages forwarded by whatsapp-service
 * (see whatsapp-service/src/convexClient.ts). Verified with a shared
 * secret — WHATSAPP_WEBHOOK_SECRET here must match CONVEX_WEBHOOK_SECRET
 * on the service.
 */
export const whatsappWebhook = httpAction(async (ctx, request) => {
  const secret = process.env.WHATSAPP_WEBHOOK_SECRET;
  if (!secret) {
    return new Response("WhatsApp webhook is not configured on this deployment.", { status: 500 });
  }
  if (request.headers.get("x-webhook-secret") !== secret) {
    return new Response("Unauthorized.", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as
    | { sessionId?: string; fromPhone?: string; text?: string }
    | null;
  if (!body?.sessionId || !body.fromPhone || !body.text) {
    return new Response("sessionId, fromPhone and text are required.", { status: 400 });
  }

  const lead = await ctx.runQuery(internal.leads.findByPhone, {
    userId: body.sessionId as Id<"users">,
    phone: body.fromPhone,
  });

  if (lead) {
    await ctx.runMutation(internal.leads.markReplied, { id: lead._id, replyText: body.text });
  }
  // No matching lead (e.g. a wrong number, or a message outside the
  // pipeline) — nothing to update, but still acknowledge the webhook.

  return new Response(null, { status: 200 });
});
