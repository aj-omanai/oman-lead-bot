"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";

/**
 * Talks to the standalone whatsapp-service (see /whatsapp-service) over its
 * internal HTTP API. That service holds the actual Baileys connection —
 * Convex only ever proxies requests to it, since a persistent websocket
 * can't live inside a Convex action.
 *
 * Each Convex user is its own Baileys session, keyed by their userId.
 */

function serviceConfig(): { url: string; secret: string } | null {
  const url = process.env.WHATSAPP_SERVICE_URL;
  const secret = process.env.WHATSAPP_SERVICE_SECRET;
  if (!url || !secret) return null;
  return { url: url.replace(/\/$/, ""), secret };
}

const NOT_CONFIGURED_MESSAGE =
  "The WhatsApp service isn't connected yet. Deploy whatsapp-service (see its README) and add " +
  "WHATSAPP_SERVICE_URL + WHATSAPP_SERVICE_SECRET in your project's Keys / API keys settings.";

type StatusResult =
  | { ok: true; connected: boolean; qr: string | null; phoneNumber: string | null }
  | { ok: false; reason: "no-auth" | "not-configured" | "error"; message: string };

export const getConnectionStatus = action({
  args: {},
  handler: async (ctx): Promise<StatusResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, reason: "no-auth", message: "Sign in first." };

    const config = serviceConfig();
    if (!config) return { ok: false, reason: "not-configured", message: NOT_CONFIGURED_MESSAGE };

    try {
      const res = await fetch(`${config.url}/status/${userId}`, {
        headers: { "X-Service-Secret": config.secret },
      });
      if (!res.ok) {
        const body = await res.text();
        return { ok: false, reason: "error", message: `WhatsApp service returned ${res.status}: ${body.slice(0, 200)}` };
      }
      const data = (await res.json()) as { connected: boolean; qr: string | null; phoneNumber: string | null };
      return { ok: true, ...data };
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Couldn't reach the WhatsApp service.",
      };
    }
  },
});

type SendResult =
  | { ok: true }
  | {
      ok: false;
      reason: "no-auth" | "not-configured" | "opted-out" | "no-pitch" | "error";
      message: string;
    };

export const sendWhatsAppMessage = action({
  // `overrideMessage` lets a caller (e.g. follow-up automation) send different
  // text than the lead's stored pitch, without duplicating the send logic.
  args: { leadId: v.id("leads"), overrideMessage: v.optional(v.string()) },
  handler: async (ctx, args): Promise<SendResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, reason: "no-auth", message: "Sign in to send messages." };

    const config = serviceConfig();
    if (!config) return { ok: false, reason: "not-configured", message: NOT_CONFIGURED_MESSAGE };

    const lead = await ctx.runQuery(api.leads.getLead, { id: args.leadId });
    if (!lead) return { ok: false, reason: "error", message: "Lead not found." };
    if (lead.optedOut) {
      return { ok: false, reason: "opted-out", message: "This lead is on the do-not-contact list." };
    }
    const message = args.overrideMessage ?? lead.pitch;
    if (!message) {
      return { ok: false, reason: "no-pitch", message: "Draft a pitch for this lead before sending." };
    }

    try {
      const res = await fetch(`${config.url}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Service-Secret": config.secret },
        body: JSON.stringify({ sessionId: userId, phone: lead.phone, message }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        return {
          ok: false,
          reason: "error",
          message: body?.error ?? `WhatsApp service returned ${res.status}.`,
        };
      }
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Couldn't reach the WhatsApp service.",
      };
    }

    await ctx.runMutation(internal.leads.markContacted, { id: args.leadId, channel: "whatsapp" });
    return { ok: true };
  },
});

type DisconnectResult = { ok: true } | { ok: false; reason: "no-auth" | "not-configured" | "error"; message: string };

/** Clears this user's WhatsApp pairing so they can scan a fresh QR code —
 *  e.g. after switching to a different business number. */
export const disconnectWhatsApp = action({
  args: {},
  handler: async (ctx): Promise<DisconnectResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, reason: "no-auth", message: "Sign in first." };

    const config = serviceConfig();
    if (!config) return { ok: false, reason: "not-configured", message: NOT_CONFIGURED_MESSAGE };

    try {
      await fetch(`${config.url}/logout/${userId}`, {
        method: "POST",
        headers: { "X-Service-Secret": config.secret },
      });
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Couldn't reach the WhatsApp service.",
      };
    }
  },
});
