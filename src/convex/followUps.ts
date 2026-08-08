"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import { action } from "./_generated/server";
import { parseEmailDraft } from "./outreach";
import { callGemini, callGroq } from "./pitch";

/**
 * Follow-up automation — the piece that turns one-shot outreach into a
 * pipeline that chases itself.
 *
 * The daily cron action (crons.ts) finds leads that were sent a pitch more
 * than FOLLOW_UP_DELAY_MS ago with no sign of a reply, drafts a polite
 * follow-up with the same free Groq/Gemini key, and queues it as a pending
 * row. Nothing sends without a human clicking "Approve & send" in the
 * Follow-ups tab; the review action routes through the existing send paths
 * (whatsapp.ts / outreach.ts) so delivery, metering and do-not-contact stay in
 * one place.
 *
 * Per the codebase convention, all database access is delegated to the plain
 * queries/mutations in followUpStore.ts — this file only runs the LLM and
 * orchestrates.
 */

export const FOLLOW_UP_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

/** Polite follow-up prompt — a nudge, not a repeat of the original pitch. */
function buildFollowUpPrompt(lead: {
  name: string;
  category: string;
  city: string;
}): string {
  return (
    "أنت خبير تسويق B2B في دول الخليج. اكتب رسالة متابعة مهذبة بالعربية الخليجية لشركة أُرسلت لها رسالة تعريفية قبل ثلاثة أيام ولم ترد بعد.\n" +
    `- اسم الشركة: ${lead.name}\n` +
    `- القطاع: ${lead.category || "غير محدد"}\n` +
    `- المدينة: ${lead.city || "غير محدد"}\n` +
    "الشروط:\n" +
    "1. من 1 إلى 2 جمل فقط، وأقل من 30 كلمة.\n" +
    "2. لا تكرر الرسالة الأولى ولا تعيد عرض الخدمة كاملة — فقط ذكّر بلطف وباحترام.\n" +
    "3. اعتذر عن الإزعاج بكلمة مهذبة إن لزم، واختم بسؤال بسيط يدعو للرد.\n" +
    "4. لا تستخدم كلمات سبام: مجاني، احصل الآن، عاجل، خصم.\n" +
    "أعد الرسالة فقط بدون أي مقدمة أو شرح."
  );
}

/** Email follow-up prompt — same nudge in subject + body form. */
function buildFollowUpEmailPrompt(lead: {
  name: string;
  category: string;
  city: string;
}): string {
  return (
    "أنت خبير تسويق B2B في الخليج. اكتب بريد متابعة مهذباً بالعربية الخليجية لشركة أُرسل لها بريد تعريفي قبل ثلاثة أيام ولم ترد.\n" +
    `- اسم الشركة: ${lead.name}\n` +
    `- القطاع: ${lead.category || "غير محدد"}\n` +
    `- المدينة: ${lead.city || "غير محدد"}\n` +
    "الشروط:\n" +
    "1. الموضوع (SUBJECT): جملة قصيرة بالإنجليزية أو العربية، أقل من 7 كلمات، بدون علامات تعجب.\n" +
    "2. النص (BODY): من 2 إلى 3 جمل بالعربية الخليجية، أقل من 50 كلمة، تذكير مهذب دون تكرار العرض كاملاً.\n" +
    "3. لا كلمات سبام: مجاني، احصل الآن، عاجل، خصم.\n" +
    "4. اختم بسؤال بسيط يدعو للرد.\n" +
    "أعد الناتج بهذا التنسيق بالضبط، بدون أي مقدمة:\n" +
    "SUBJECT: <سطر الموضوع>\n" +
    "BODY:\n<نص الرسالة>"
  );
}

/** Groq first, Gemini second — identical priority to the manual draft path. */
async function draftText(prompt: string): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) return callGroq(prompt, groqKey);
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) return callGemini(prompt, geminiKey);
  throw new Error("No LLM key configured");
}

export type DraftFollowUpsResult = {
  ran: boolean;
  reason?: "no-key";
  queued: number;
  failed: number;
  errors: Array<{ leadId: string; error: string }>;
};

/**
 * Daily cron job — draft a follow-up for every eligible lead. Per-lead
 * failures (a flaky LLM call) are caught and logged, never aborting the batch.
 */
export const draftFollowUps = action({
  args: {},
  handler: async (ctx): Promise<DraftFollowUpsResult> => {
    if (!process.env.GROQ_API_KEY && !process.env.GEMINI_API_KEY) {
      return {
        ran: false,
        reason: "no-key",
        queued: 0,
        failed: 0,
        errors: [],
      };
    }

    const cutoff = Date.now() - FOLLOW_UP_DELAY_MS;
    const eligible = await ctx.runQuery(internal.followUpStore.listEligible, {
      cutoff,
    });

    let queued = 0;
    const errors: Array<{ leadId: string; error: string }> = [];
    for (const item of eligible) {
      try {
        const text = await draftText(
          item.channel === "email"
            ? buildFollowUpEmailPrompt(item)
            : buildFollowUpPrompt(item),
        );
        if (!text) throw new Error("The model returned an empty draft.");

        if (item.channel === "email") {
          const { subject, body } = parseEmailDraft(text);
          if (!subject || !body) {
            throw new Error("The model returned an unreadable email draft.");
          }
          await ctx.runMutation(internal.followUpStore.queueFollowUp, {
            userId: item.userId,
            leadId: item.leadId,
            channel: "email",
            draftSubject: subject,
            draftBody: body,
          });
        } else {
          await ctx.runMutation(internal.followUpStore.queueFollowUp, {
            userId: item.userId,
            leadId: item.leadId,
            channel: "whatsapp",
            draftBody: text,
          });
        }
        queued += 1;
      } catch (error) {
        errors.push({
          leadId: item.leadId,
          error: error instanceof Error ? error.message : "unknown error",
        });
      }
    }

    return { ran: true, queued, failed: errors.length, errors };
  },
});

export type ApproveResult =
  | { ok: true; channel: "whatsapp" | "email" }
  | {
      ok: false;
      reason:
        | "no-auth"
        | "not-found"
        | "not-pending"
        | "stale"
        | "send-failed"
        | "error";
      message: string;
    };

/**
 * Approve & send a pending follow-up.
 *
 * Re-checks the lead's real-world state at send time (not just at draft time):
 * if it was opted out or its status changed since drafting, the row is
 * auto-marked skipped and nothing stale is sent. Otherwise the send is routed
 * through the existing channel actions with the follow-up's text as the
 * content override, and the row is marked sent on success.
 */
export const approveAndSend = action({
  args: { id: v.id("followUps") },
  handler: async (ctx, { id }): Promise<ApproveResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        ok: false as const,
        reason: "no-auth" as const,
        message: "Sign in to approve follow-ups.",
      };
    }

    const review = await ctx.runQuery(
      internal.followUpStore.getFollowUpForReview,
      { id },
    );
    if (!review) {
      return {
        ok: false as const,
        reason: "not-found" as const,
        message: "This follow-up no longer exists.",
      };
    }
    const { row, lead } = review;

    if (row.status !== "pending") {
      return {
        ok: false as const,
        reason: "not-pending" as const,
        message: "This follow-up was already handled.",
      };
    }

    // Staleness handling — never send something stale.
    if (lead.optedOut) {
      await ctx.runMutation(api.followUpStore.skipFollowUp, { id });
      return {
        ok: false as const,
        reason: "stale" as const,
        message:
          "This lead opted out since this follow-up was drafted — skipping it.",
      };
    }
    if (lead.status !== "sent") {
      await ctx.runMutation(api.followUpStore.skipFollowUp, { id });
      return {
        ok: false as const,
        reason: "stale" as const,
        message:
          "This lead's status changed since this follow-up was drafted — skipping it.",
      };
    }

    let sendResult: { ok: boolean; message?: string };
    if (row.channel === "email") {
      sendResult = await ctx.runAction(api.outreach.sendEmail, {
        leadId: row.leadId,
        subject: row.draftSubject,
        body: row.draftBody,
      });
    } else {
      sendResult = await ctx.runAction(api.whatsapp.sendWhatsApp, {
        leadId: row.leadId,
        message: row.draftBody,
      });
    }

    if (!sendResult.ok) {
      return {
        ok: false as const,
        reason: "send-failed" as const,
        message: sendResult.message ?? "The send failed — try again.",
      };
    }

    await ctx.runMutation(api.followUpStore.markSent, { id, sentAt: Date.now() });
    return { ok: true as const, channel: row.channel };
  },
});
