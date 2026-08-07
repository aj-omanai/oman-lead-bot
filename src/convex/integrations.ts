import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

/**
 * Shared LLM provider settings for the live "Draft with AI" feature.
 * Keys live in the project's Keys / API keys settings (env vars) and are
 * read server-side — the client only ever sees whether they're configured.
 */

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const GEMINI_MODEL = "gemini-2.5-flash";

export type ActiveProvider = "groq" | "gemini" | null;

/** Whether each provider's env var is present. Never returns the key itself. */
export const integrationStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return {
        configured: false,
        providers: { groq: false, gemini: false },
        activeProvider: null as ActiveProvider,
        activeModel: null as string | null,
        stripeConfigured: false,
        stripeWebhookConfigured: false,
        emailConfigured: false,
      };
    }

    const groq = Boolean(process.env.GROQ_API_KEY);
    const gemini = Boolean(process.env.GEMINI_API_KEY);
    // Priority matches pitch.ts: Groq first, then Gemini.
    const active: ActiveProvider = groq ? "groq" : gemini ? "gemini" : null;

    return {
      configured: groq || gemini,
      providers: { groq, gemini },
      activeProvider: active,
      activeModel: active === "groq" ? GROQ_MODEL : active === "gemini" ? GEMINI_MODEL : null,
      stripeConfigured: Boolean(process.env.STRIPE_SECRET_KEY),
      stripeWebhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      emailConfigured: Boolean(process.env.VLY_INTEGRATION_KEY),
    };
  },
});
