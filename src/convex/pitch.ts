"use node";

import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import { action } from "./_generated/server";
import { GEMINI_MODEL, GROQ_MODEL } from "./integrations";

/**
 * Live "Draft with AI" — the same personalization step the local Python
 * pipeline performs (see personalize.py), running server-side so the free
 * API key never reaches the browser.
 *
 * Provider priority (both are free-tier, no credit card required):
 *   1. GROQ_API_KEY   -> llama-3.3-70b-versatile
 *   2. GEMINI_API_KEY -> gemini-2.5-flash
 *
 * Keys are read from the project's Keys / API keys settings (env vars).
 */

type LeadInfo = {
  name: string;
  category: string;
  city: string;
  rating: number;
};

function buildPrompt(lead: LeadInfo): string {
  return (
    "أنت خبير تسويق رقمي في دول مجلس التعاون الخليجي. اكتب رسالة واتساب " +
    "ترويجية قصيرة ومهنية ودافئة بالعربية الخليجية لشركة من نوع B2B.\n" +
    `- اسم الشركة: ${lead.name}\n` +
    `- القطاع: ${lead.category || "غير محدد"}\n` +
    `- المدينة: ${lead.city || "غير محدد"}\n` +
    `- تقييم الشركة: ${lead.rating || "غير معروف"}\n` +
    "الشروط:\n" +
    "1. من 2 إلى 3 جمل فقط، وأقل من 40 كلمة.\n" +
    "2. خاطبهم بلقب محترم حسب السياق واذكر اسم الشركة.\n" +
    "3. ركّز على قيمة واحدة واضحة بدلاً من قائمة عروض.\n" +
    "4. اختم بسؤال بسيط يدعو للرد، مثل: 'هل يناسبكم وقت قصير نتعرف فيه على احتياجاتكم؟'\n" +
    "5. لا تستخدم كلمات سبام مثل: مجاني، احصل الآن، عاجل، خصم 90%.\n" +
    "أعد الرسالة فقط بدون أي مقدمة أو شرح."
  );
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You write short, warm, professional Gulf Arabic WhatsApp pitches for B2B outreach.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  });
  if (!res.ok) {
    throw new Error(`Gemini API ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  return (data.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

export const generatePitch = action({
  args: { leadId: v.id("leads") },
  handler: async (ctx, { leadId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        ok: false as const,
        reason: "no-auth" as const,
        message: "Sign in to draft pitches.",
      };
    }

    const lead = await ctx.runQuery(api.leads.getLead, { id: leadId });
    if (!lead) {
      return {
        ok: false as const,
        reason: "error" as const,
        message: "Lead not found or no longer available.",
      };
    }

    const prompt = buildPrompt({
      name: lead.name,
      category: lead.category,
      city: lead.city,
      rating: lead.rating,
    });

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const pitch = await callGroq(prompt, groqKey);
        return { ok: true as const, pitch, provider: "groq" as const, model: GROQ_MODEL };
      } catch (error) {
        return {
          ok: false as const,
          reason: "error" as const,
          message: error instanceof Error ? error.message : "Groq request failed.",
        };
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const pitch = await callGemini(prompt, geminiKey);
        return { ok: true as const, pitch, provider: "gemini" as const, model: GEMINI_MODEL };
      } catch (error) {
        return {
          ok: false as const,
          reason: "error" as const,
          message: error instanceof Error ? error.message : "Gemini request failed.",
        };
      }
    }

    return {
      ok: false as const,
      reason: "no-key" as const,
      message:
        "No free-tier LLM key configured yet. Add GROQ_API_KEY or GEMINI_API_KEY in your project's Keys / API keys settings, then try again.",
    };
  },
});

/**
 * Verify a configured free-tier key with a minimal real API call.
 * Returns only a status + friendly message — never the key.
 */
type TestResult =
  | { ok: true; provider: "groq" | "gemini"; message: string }
  | { ok: false; provider: "groq" | "gemini" | null; message: string };

export const testProvider = action({
  args: {},
  handler: async (ctx): Promise<TestResult> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { ok: false, provider: null, message: "Sign in to test your keys." };
    }

    const groqKey = process.env.GROQ_API_KEY;
    if (groqKey) {
      try {
        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${groqKey}`,
          },
          body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [{ role: "user", content: "Reply with the single word: OK" }],
            max_tokens: 4,
          }),
        });
        if (!res.ok) {
          return {
            ok: false,
            provider: "groq",
            message: `Groq returned ${res.status} — check that the key is valid.`,
          };
        }
        return {
          ok: true,
          provider: "groq",
          message: `Connected to Groq (${GROQ_MODEL}). The Draft with AI button is live.`,
        };
      } catch (error) {
        return {
          ok: false,
          provider: "groq",
          message: error instanceof Error ? error.message : "Groq request failed.",
        };
      }
    }

    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(geminiKey)}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: "Reply with the single word: OK" }] }] }),
        });
        if (!res.ok) {
          return {
            ok: false,
            provider: "gemini",
            message: `Gemini returned ${res.status} — check that the key is valid.`,
          };
        }
        return {
          ok: true,
          provider: "gemini",
          message: `Connected to Gemini (${GEMINI_MODEL}). The Draft with AI button is live.`,
        };
      } catch (error) {
        return {
          ok: false,
          provider: "gemini",
          message: error instanceof Error ? error.message : "Gemini request failed.",
        };
      }
    }

    return {
      ok: false,
      provider: null,
      message:
        "No LLM key configured yet. Add GROQ_API_KEY or GEMINI_API_KEY in your project's Keys / API keys settings, then test again.",
    };
  },
});
