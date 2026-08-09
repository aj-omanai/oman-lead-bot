"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action, internalAction } from "./_generated/server";
import { splitSubjectAndBody } from "./emailOutreach";
import { callGemini, callGroq, withConfiguredProvider } from "./llm";

/**
 * Follow-up automation: a daily cron drafts a follow-up for any lead whose
 * sent pitch got no reply in 3 days, then a human approves/edits/skips it
 * from the Follow-ups tab. Nothing sends without that click — see
 * docs/superpowers/specs/2026-08-08-follow-up-automation-design.md.
 */

type FollowUpLeadInfo = { name: string; category: string; city: string };

const WHATSAPP_FOLLOWUP_SYSTEM_PROMPT =
  "You write short, warm, professional Gulf Arabic WhatsApp follow-up messages for B2B outreach. " +
  "This is a polite nudge after no reply — not a repeat of the original pitch.";

function buildWhatsAppFollowUpPrompt(lead: FollowUpLeadInfo): string {
  return (
    "أنت خبير تسويق رقمي في دول مجلس التعاون الخليجي. سبق أن أرسلت رسالة تعريفية لهذه " +
    "الشركة قبل ثلاثة أيام ولم يصلك رد. اكتب رسالة متابعة قصيرة ومهذبة بالعربية الخليجية — " +
    "وليست تكراراً للرسالة الأولى.\n" +
    `- اسم الشركة: ${lead.name}\n` +
    `- القطاع: ${lead.category || "غير محدد"}\n` +
    `- المدينة: ${lead.city || "غير محدد"}\n` +
    "الشروط:\n" +
    "1. جملتان إلى ثلاث جمل فقط، وأقل من 30 كلمة.\n" +
    "2. لهجة ودية ولا تبدو كإلحاح أو ضغط.\n" +
    "3. اذكر أنها متابعة لرسالة سابقة دون تكرار محتواها.\n" +
    "4. اختم بسؤال بسيط يدعو للرد.\n" +
    "أعد الرسالة فقط بدون أي مقدمة أو شرح."
  );
}

const EMAIL_FOLLOWUP_SYSTEM_PROMPT =
  "You write short, professional B2B cold-outreach follow-up emails for the GCC market. " +
  "This is a polite nudge after no reply — not a repeat of the original pitch. " +
  "Return strictly two lines: the first line is 'Subject: ...', the second is the email body.";

function buildEmailFollowUpPrompt(lead: FollowUpLeadInfo): string {
  return (
    "Write a short, polite follow-up email to a business that received a cold outreach " +
    "email 3 days ago and hasn't replied. Don't repeat the original pitch — just a brief, " +
    "friendly nudge. 2-3 sentences max.\n" +
    `- Company: ${lead.name}\n` +
    `- Sector: ${lead.category || "unspecified"}\n` +
    `- City: ${lead.city || "unspecified"}\n` +
    "Return exactly:\nSubject: <subject line>\n<email body>"
  );
}

/**
 * Daily cron target. Drafts a follow-up for every eligible lead (see
 * followUpsData.listEligibleLeads for the eligibility rules) and queues it
 * for review. One lead's failure doesn't abort the rest of the batch.
 */
export const generateDue = internalAction({
  args: {},
  handler: async (ctx) => {
    const groqKey = process.env.GROQ_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;
    if (!groqKey && !geminiKey) return; // nothing configured — exit immediately, no scan needed

    const leads = await ctx.runQuery(internal.followUpsData.listEligibleLeads, {});

    for (const lead of leads) {
      try {
        // Quota check happens per-lead, after confirming a key exists — a
        // missing key shouldn't cost a draft, same rule as manual drafting.
        const usage = await ctx.runMutation(internal.usage.checkAndIncrementUsage, {
          userId: lead.userId,
          kind: "aiDrafts",
        });
        if (!usage.ok) continue; // out of quota this month — skip, don't queue

        const channel = lead.lastContactChannel ?? "whatsapp";
        const leadInfo: FollowUpLeadInfo = { name: lead.name, category: lead.category, city: lead.city };

        if (channel === "email") {
          const prompt = buildEmailFollowUpPrompt(leadInfo);
          const draft = await withConfiguredProvider({
            groq: (key) => callGroq(EMAIL_FOLLOWUP_SYSTEM_PROMPT, prompt, key),
            gemini: (key) => callGemini(`${EMAIL_FOLLOWUP_SYSTEM_PROMPT}\n\n${prompt}`, key),
          });
          if (!draft.ok) continue;
          const { subject, body } = splitSubjectAndBody(draft.result);
          await ctx.runMutation(internal.followUpsData.enqueueFollowUp, {
            leadId: lead._id,
            userId: lead.userId,
            channel: "email",
            draftSubject: subject,
            draftBody: body,
          });
        } else {
          const prompt = buildWhatsAppFollowUpPrompt(leadInfo);
          const draft = await withConfiguredProvider({
            groq: (key) => callGroq(WHATSAPP_FOLLOWUP_SYSTEM_PROMPT, prompt, key),
            gemini: (key) => callGemini(`${WHATSAPP_FOLLOWUP_SYSTEM_PROMPT}\n\n${prompt}`, key),
          });
          if (!draft.ok) continue;
          await ctx.runMutation(internal.followUpsData.enqueueFollowUp, {
            leadId: lead._id,
            userId: lead.userId,
            channel: "whatsapp",
            draftBody: draft.result,
          });
        }
      } catch (error) {
        // A flaky LLM call for one lead must not abort the rest of the batch.
        console.error(`[followUps.generateDue] draft failed for lead ${lead._id}:`, error);
      }
    }
  },
});

type ApproveResult =
  | { ok: true }
  | { ok: false; reason: "no-auth" | "not-found" | "stale" | "error"; message: string };

/**
 * Approve & send a pending follow-up. Re-validates the lead's CURRENT status
 * and opt-out flag right before sending (not just at draft time) — a lead
 * can reply or get opted out in the days between drafting and review.
 */
export const approveAndSend = action({
  args: { id: v.id("followUps") },
  handler: async (ctx, args): Promise<ApproveResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { ok: false, reason: "no-auth", message: "Sign in first." };

    const followUp = await ctx.runQuery(internal.followUpsData.getFollowUp, { id: args.id });
    if (!followUp || followUp.userId !== userId || followUp.status !== "pending") {
      return { ok: false, reason: "not-found", message: "This follow-up is no longer pending." };
    }

    const lead = await ctx.runQuery(api.leads.getLead, { id: followUp.leadId });
    if (!lead || lead.status !== "sent" || lead.optedOut) {
      await ctx.runMutation(internal.followUpsData.markSkippedByStaleness, { id: args.id });
      return {
        ok: false,
        reason: "stale",
        message: "This lead replied (or was opted out) since this was drafted — skipping.",
      };
    }

    if (followUp.channel === "whatsapp") {
      const result = await ctx.runAction(api.whatsapp.sendWhatsAppMessage, {
        leadId: followUp.leadId,
        overrideMessage: followUp.draftBody,
      });
      if (!result.ok) return { ok: false, reason: "error", message: result.message };
    } else {
      const result = await ctx.runAction(api.emailOutreach.sendEmail, {
        leadId: followUp.leadId,
        subject: followUp.draftSubject ?? "Following up",
        body: followUp.draftBody,
      });
      if (!result.ok) return { ok: false, reason: "error", message: result.message };
    }

    await ctx.runMutation(internal.followUpsData.markSent, { id: args.id });
    return { ok: true };
  },
});
