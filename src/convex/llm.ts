"use node";

import { GEMINI_MODEL, GROQ_MODEL } from "./integrations";

/**
 * Shared free-tier LLM callers — used by both pitch.ts (WhatsApp drafting)
 * and emailOutreach.ts (email drafting) so the two channels share one
 * provider-priority implementation instead of duplicating fetch calls.
 */

export async function callGroq(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
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

export async function callGemini(prompt: string, apiKey: string): Promise<string> {
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

/** Runs `run` with whichever free-tier key is configured, Groq first. Returns
 *  null if neither GROQ_API_KEY nor GEMINI_API_KEY is set. */
export async function withConfiguredProvider<T>(run: {
  groq: (apiKey: string) => Promise<T>;
  gemini: (apiKey: string) => Promise<T>;
}): Promise<
  | { ok: true; provider: "groq" | "gemini"; result: T }
  | { ok: false; reason: "no-key" }
> {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return { ok: true, provider: "groq", result: await run.groq(groqKey) };
  }
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    return { ok: true, provider: "gemini", result: await run.gemini(geminiKey) };
  }
  return { ok: false, reason: "no-key" };
}
