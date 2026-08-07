"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";

/**
 * WhatsApp Business Cloud API — the official, ToS-compliant delivery channel
 * that replaces the WhatsApp Web (Selenium/PyWhatKit) automation.
 *
 * Sending is gated to Pro and above, metered against the monthly `whatsapp`
 * quota (billing.ts), and blocked for leads with do-not-contact enabled.
 * Delivery receipts (sent → delivered → read) arrive on the
 * `/whatsapp-webhook` route in http.ts and are written back to the lead.
 *
 * Env vars (project's Keys settings):
 *   WHATSAPP_TOKEN            — permanent system-user access token
 *   WHATSAPP_PHONE_NUMBER_ID  — the business phone number ID from Meta
 *   WHATSAPP_VERIFY_TOKEN     — arbitrary secret for webhook verification
 */

type SendResult =
  | { ok: true; wamid: string | null; status: "sent" }
  | {
      ok: false;
      reason: "no-auth" | "no-key" | "no-message" | "plan" | "quota" | "opted-out" | "error";
      message: string;
    };

/** Digits-only international number for the Graph API ("to" field). */
function digitsOnly(phone: string): string {
  return phone.replace(/\D/g, "");
}

export const sendWhatsApp = action({
  args: {
    leadId: v.id("leads"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, { leadId, message }): Promise<SendResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { ok: false as const, reason: "no-auth" as const, message: "Sign in to send WhatsApp messages." };
    }

    const lead = await ctx.runQuery(api.leads.getLead, { id: leadId });
    if (!lead) {
      return { ok: false as const, reason: "error" as const, message: "Lead not found or no longer available." };
    }

    if (lead.optedOut) {
      return {
        ok: false as const,
        reason: "opted-out" as const,
        message: "This lead opted out — WhatsApp sending is blocked.",
      };
    }

    const body = (message ?? lead.pitch ?? "").trim();
    if (!body) {
      return {
        ok: false as const,
        reason: "no-message" as const,
        message: "Draft a pitch first — the AI-generated message is required before sending.",
      };
    }

    const usage = await ctx.runQuery(api.billing.snapshotUsage);
    if (!usage) {
      return { ok: false as const, reason: "error" as const, message: "Could not read your plan usage — try again." };
    }
    if (usage.plan === "free") {
      return {
        ok: false as const,
        reason: "plan" as const,
        message:
          "WhatsApp sending is a Pro feature. Upgrade to Pro ($19/mo) or Business ($49/mo) in the Billing tab.",
      };
    }
    if (usage.whatsappUsed >= usage.limits.whatsapp) {
      return {
        ok: false as const,
        reason: "quota" as const,
        message: `You've used all ${usage.limits.whatsapp} WhatsApp messages this month — they reset next billing cycle.`,
      };
    }

    const token = process.env.WHATSAPP_TOKEN;
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneNumberId) {
      return {
        ok: false as const,
        reason: "no-key" as const,
        message:
          "WhatsApp isn't configured. Add WHATSAPP_TOKEN and WHATSAPP_PHONE_NUMBER_ID in your project's Keys / API keys settings.",
      };
    }

    const to = digitsOnly(lead.phone);
    if (!to) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: `This lead has an unreadable phone number (${lead.phone}).`,
      };
    }

    let data: Record<string, unknown>;
    try {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            recipient_type: "individual",
            to,
            type: "text",
            text: { body },
          }),
        },
      );
      data = (await res.json()) as Record<string, unknown>;
      if (!res.ok) {
        const err = data?.error as Record<string, unknown> | undefined;
        return {
          ok: false as const,
          reason: "error" as const,
          message: `WhatsApp API error ${res.status}: ${(err?.message as string) ?? "unknown"}`,
        };
      }
    } catch (error) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: `WhatsApp request failed: ${error instanceof Error ? error.message : "network error"}`,
      };
    }

    const wamid =
      (Array.isArray(data.messages) && (data.messages[0] as Record<string, unknown>)?.id) ?? null;
    const wamidString = typeof wamid === "string" ? wamid : null;

    await ctx.runMutation(api.billing.recordUsage, { counter: "whatsapp" });
    await ctx.runMutation(api.leads.setWhatsappResult, {
      id: leadId,
      whatsappStatus: "sent",
      whatsappMessageId: wamidString ?? undefined,
    });

    return { ok: true as const, wamid: wamidString, status: "sent" as const };
  },
});
