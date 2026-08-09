"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { planAtLeast } from "../lib/plans";
import { vly } from "../lib/vly-integrations";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { callGemini, callGroq } from "./llm";

/**
 * Email Outreach — the second delivery channel alongside WhatsApp.
 * Pro and Business plans only (see src/lib/plans.ts). Sending goes through
 * @vly-ai/integrations' email service, billed to the project's own
 * VLY_INTEGRATION_KEY, so there's no separate email provider to configure.
 */

const EMAIL_SYSTEM_PROMPT =
  "You write short, professional B2B cold outreach emails for the GCC market. " +
  "Return strictly two lines: the first line is 'Subject: ...', the second is the email body.";

type LeadInfo = { name: string; category: string; city: string; rating: number };

function buildEmailPrompt(lead: LeadInfo): string {
  return (
    "Write a short, professional cold outreach email introducing a digital " +
    "marketing service to the business below. 3-4 sentences, no more. Warm but " +
    "not salesy; one clear value proposition; end with a simple call to reply.\n" +
    `- Company: ${lead.name}\n` +
    `- Sector: ${lead.category || "unspecified"}\n` +
    `- City: ${lead.city || "unspecified"}\n` +
    `- Rating: ${lead.rating || "unknown"}\n` +
    "Return exactly:\nSubject: <subject line>\n<email body>"
  );
}

/** Exported for reuse by followUps.ts, which drafts follow-up emails through
 *  the same "Subject: ...\n<body>" convention. */
export function splitSubjectAndBody(raw: string): { subject: string; body: string } {
  const match = raw.match(/^subject:\s*(.+)\n+([\s\S]+)$/i);
  if (match) return { subject: match[1].trim(), body: match[2].trim() };
  return { subject: "A quick idea for your team", body: raw.trim() };
}

type DraftResult =
  | { ok: true; subject: string; body: string; provider: "groq" | "gemini" }
  | { ok: false; reason: "no-auth" | "no-plan" | "opted-out" | "no-email" | "quota-exceeded" | "no-key" | "error"; message: string };

export const draftEmailPitch = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<DraftResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, reason: "no-auth", message: "Sign in to draft emails." };

    const usageInfo = await ctx.runQuery(api.usage.getUsage, {});
    if (!usageInfo || !planAtLeast(usageInfo.plan, "pro")) {
      return {
        ok: false,
        reason: "no-plan",
        message: "Email outreach is available on the Pro plan and above. Upgrade in Settings → Billing.",
      };
    }

    const lead = await ctx.runQuery(api.leads.getLead, { id: leadId });
    if (!lead) return { ok: false, reason: "error", message: "Lead not found." };
    if (lead.optedOut) {
      return { ok: false, reason: "opted-out", message: "This lead is on the do-not-contact list." };
    }
    if (!lead.email) {
      return { ok: false, reason: "no-email", message: "This lead has no email address on file." };
    }

    const prompt = buildEmailPrompt(lead);
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!groqKey && !geminiKey) {
      return {
        ok: false,
        reason: "no-key",
        message: "No free-tier LLM key configured yet. Add GROQ_API_KEY or GEMINI_API_KEY in Keys settings.",
      };
    }

    // Check the quota only after confirming a key exists — a missing key
    // shouldn't cost the user one of their monthly drafts.
    const usage = await ctx.runMutation(internal.usage.checkAndIncrementUsage, {
      userId,
      kind: "aiDrafts",
    });
    if (!usage.ok) {
      return {
        ok: false,
        reason: "quota-exceeded",
        message: `You've used all ${usage.limit} AI drafts on the ${usage.plan} plan this month.`,
      };
    }

    try {
      if (groqKey) {
        const raw = await callGroq(EMAIL_SYSTEM_PROMPT, prompt, groqKey);
        const { subject, body } = splitSubjectAndBody(raw);
        return { ok: true, subject, body, provider: "groq" };
      }
      if (geminiKey) {
        const raw = await callGemini(`${EMAIL_SYSTEM_PROMPT}\n\n${prompt}`, geminiKey);
        const { subject, body } = splitSubjectAndBody(raw);
        return { ok: true, subject, body, provider: "gemini" };
      }
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Draft request failed.",
      };
    }

    return {
      ok: false,
      reason: "no-key",
      message: "No free-tier LLM key configured yet. Add GROQ_API_KEY or GEMINI_API_KEY in Keys settings.",
    };
  },
});

type SendResult =
  | { ok: true }
  | { ok: false; reason: "no-auth" | "no-plan" | "opted-out" | "no-email" | "quota-exceeded" | "error"; message: string };

export const sendEmail = action({
  args: { leadId: v.id("leads"), subject: v.string(), body: v.string() },
  handler: async (ctx, args): Promise<SendResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, reason: "no-auth", message: "Sign in to send email." };

    const usageInfo = await ctx.runQuery(api.usage.getUsage, {});
    if (!usageInfo || !planAtLeast(usageInfo.plan, "pro")) {
      return { ok: false, reason: "no-plan", message: "Email outreach requires the Pro plan or above." };
    }

    const lead = await ctx.runQuery(api.leads.getLead, { id: args.leadId });
    if (!lead) return { ok: false, reason: "error", message: "Lead not found." };
    if (lead.optedOut) {
      return { ok: false, reason: "opted-out", message: "This lead is on the do-not-contact list." };
    }
    if (!lead.email) {
      return { ok: false, reason: "no-email", message: "This lead has no email address on file." };
    }

    const usage = await ctx.runMutation(internal.usage.checkAndIncrementUsage, {
      userId,
      kind: "emails",
    });
    if (!usage.ok) {
      return {
        ok: false,
        reason: "quota-exceeded",
        message: `You've sent all ${usage.limit} emails on the ${usage.plan} plan this month.`,
      };
    }

    try {
      const result = await vly.email.send({
        to: lead.email,
        subject: args.subject,
        text: args.body,
        html: `<p>${args.body.replace(/\n/g, "<br/>")}</p>`,
      });
      if (!result.success) {
        return { ok: false, reason: "error", message: result.error ?? "Email send failed." };
      }
    } catch (error) {
      return {
        ok: false,
        reason: "error",
        message: error instanceof Error ? error.message : "Email send failed.",
      };
    }

    await ctx.runMutation(internal.leads.markContacted, { id: args.leadId, channel: "email" });
    return { ok: true };
  },
});
