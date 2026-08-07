"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { vly } from "../lib/vly-integrations";
import { api } from "./_generated/api";
import { action } from "./_generated/server";
import { GEMINI_MODEL, GROQ_MODEL } from "./integrations";
import { callGemini, callGroq } from "./pitch";

/**
 * Email outreach — the second delivery channel next to WhatsApp.
 *
 * The AI subject + body reuse the same free Groq/Gemini key as pitch drafts,
 * and sends go through the built-in email integration (@vly-ai/integrations,
 * billed to VLY_INTEGRATION_KEY — no separate provider to configure).
 *
 * Both drafting and sending are gated to Pro and above, metered against the
 * monthly aiDrafts / emails quotas (billing.ts), and blocked for leads with
 * do-not-contact enabled.
 */

type LeadInfo = {
  name: string;
  category: string;
  city: string;
};

function buildEmailPrompt(lead: LeadInfo): string {
  return (
    "أنت خبير تسويق B2B في دول الخليج. اكتب بريداً ترويجياً مهنياً بالعربية الخليجية لشركة.\n" +
    `- اسم الشركة: ${lead.name}\n` +
    `- القطاع: ${lead.category || "غير محدد"}\n` +
    `- المدينة: ${lead.city || "غير محدد"}\n` +
    "الشروط:\n" +
    "1. الموضوع (SUBJECT): جملة قصيرة بالإنجليزية أو العربية، أقل من 8 كلمات، بدون علامات تعجب.\n" +
    "2. النص (BODY): من 3 إلى 4 جمل بالعربية الخليجية، من 60 إلى 90 كلمة، قيمة واحدة واضحة.\n" +
    "3. لا كلمات سبام: مجاني، احصل الآن، عاجل، خصم.\n" +
    "4. اختم بسؤال بسيط يدعو للرد.\n" +
    "أعد الناتج بهذا التنسيق بالضبط، بدون أي مقدمة:\n" +
    "SUBJECT: <سطر الموضوع>\n" +
    "BODY:\n<نص الرسالة>"
  );
}

function parseEmailDraft(text: string): { subject: string; body: string } {
  const subjectMatch = text.match(/SUBJECT:\s*(.+)/i);
  const bodyMatch = text.match(/BODY:\s*([\s\S]+)/i);
  const subject = (subjectMatch?.[1] ?? "").trim().replace(/^["']|["']$/g, "").slice(0, 200);
  const body = (bodyMatch?.[1] ?? text).trim();
  return { subject, body };
}

type EmailDraftResult =
  | {
      ok: true;
      subject: string;
      body: string;
      provider: "groq" | "gemini";
      model: string;
    }
  | {
      ok: false;
      reason: "no-auth" | "no-key" | "plan" | "quota" | "opted-out" | "error";
      message: string;
    };

/** AI-draft a subject + body for a lead, save it, and meter one aiDraft. */
export const draftEmail = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<EmailDraftResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { ok: false as const, reason: "no-auth" as const, message: "Sign in to draft emails." };
    }

    const lead = await ctx.runQuery(api.leads.getLead, { id: leadId });
    if (!lead) {
      return { ok: false as const, reason: "error" as const, message: "Lead not found or no longer available." };
    }

    if (lead.optedOut) {
      return {
        ok: false as const,
        reason: "opted-out" as const,
        message: "This lead opted out — email drafting and sending are blocked.",
      };
    }

    const usage = await ctx.runQuery(api.billing.snapshotUsage);
    if (!usage) {
      return { ok: false as const, reason: "error" as const, message: "Could not read your plan usage — try again." };
    }

    // Email outreach is a Pro+ feature.
    if (usage.plan === "free") {
      return {
        ok: false as const,
        reason: "plan" as const,
        message:
          "Email outreach is a Pro feature. Upgrade to Pro ($19/mo, 300 AI drafts + 200 emails) or Business ($49/mo, 1,500 drafts + 1,000 emails) in the Billing tab.",
      };
    }

    if (usage.aiDraftsUsed >= usage.limits.aiDrafts) {
      return {
        ok: false as const,
        reason: "quota" as const,
        message: `You've used all ${usage.limits.aiDrafts} AI drafts this month — email drafting counts toward the same quota. They reset next billing cycle.`,
      };
    }

    const prompt = buildEmailPrompt({
      name: lead.name,
      category: lead.category,
      city: lead.city,
    });

    const groqKey = process.env.GROQ_API_KEY;
    let text: string;
    let provider: "groq" | "gemini";
    if (groqKey) {
      text = await callGroq(prompt, groqKey);
      provider = "groq";
    } else if (process.env.GEMINI_API_KEY) {
      text = await callGemini(prompt, process.env.GEMINI_API_KEY);
      provider = "gemini";
    } else {
      return {
        ok: false as const,
        reason: "no-key" as const,
        message:
          "No free-tier LLM key configured. Add GROQ_API_KEY or GEMINI_API_KEY in your project's Keys / API keys settings.",
      };
    }

    const { subject, body } = parseEmailDraft(text);
    if (!subject || !body) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: "The model returned an unreadable draft — try again.",
      };
    }

    await ctx.runMutation(api.leads.setEmailDraft, {
      id: leadId,
      emailSubject: subject,
      emailBody: body,
    });
    await ctx.runMutation(api.billing.recordUsage, { counter: "aiDrafts" });

    return {
      ok: true as const,
      subject,
      body,
      provider,
      model: provider === "groq" ? GROQ_MODEL : GEMINI_MODEL,
    };
  },
});

type SendResult =
  | { ok: true; status: "sent" | "queued" }
  | {
      ok: false;
      reason: "no-auth" | "no-email" | "no-draft" | "plan" | "quota" | "opted-out" | "error";
      message: string;
    };

/** Send the drafted email via the vly email integration, metered as one email. */
export const sendEmail = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }): Promise<SendResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { ok: false as const, reason: "no-auth" as const, message: "Sign in to send emails." };
    }

    const lead = await ctx.runQuery(api.leads.getLead, { id: leadId });
    if (!lead) {
      return { ok: false as const, reason: "error" as const, message: "Lead not found or no longer available." };
    }

    if (lead.optedOut) {
      return {
        ok: false as const,
        reason: "opted-out" as const,
        message: "This lead opted out — sending is blocked.",
      };
    }
    if (!lead.email) {
      return {
        ok: false as const,
        reason: "no-email" as const,
        message: "Add an email address to this lead first (in the Leads or Email Outreach tab).",
      };
    }
    if (!lead.emailSubject || !lead.emailBody) {
      return {
        ok: false as const,
        reason: "no-draft" as const,
        message: "Draft the email first — the AI subject and body are required before sending.",
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
        message: "Email outreach is a Pro feature. Upgrade in the Billing tab to send emails.",
      };
    }
    if (usage.emailsUsed >= usage.limits.emails) {
      return {
        ok: false as const,
        reason: "quota" as const,
        message: `You've used all ${usage.limits.emails} emails this month — they reset next billing cycle.`,
      };
    }

    const emailBody = lead.emailBody;
    const safeHtml = emailBody
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br/>");

    const result = await vly.email.send({
      to: lead.email,
      subject: lead.emailSubject,
      text: emailBody,
      html: `<div dir="rtl" lang="ar" style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;font-size:15px;line-height:1.9;color:#1f2937;">${safeHtml}</div>`,
    });

    if (!result.success) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: `Email send failed: ${result.error ?? "unknown error"}`,
      };
    }
    const status = result.data?.status;
    if (status === "failed") {
      return {
        ok: false as const,
        reason: "error" as const,
        message: `Email send failed: ${result.data?.error ?? "the provider rejected it"}`,
      };
    }

    await ctx.runMutation(api.billing.recordUsage, { counter: "emails" });
    await ctx.runMutation(api.leads.setStatus, { id: leadId, status: "sent" });

    return { ok: true as const, status: status === "sent" ? "sent" : "queued" };
  },
});
