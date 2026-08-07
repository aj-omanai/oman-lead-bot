/**
 * Reports inbound WhatsApp messages back to the Convex backend so a reply
 * can flip a lead's status. Silently does nothing if the webhook isn't
 * configured (e.g. running this service standalone during development).
 */
export async function notifyConvex(sessionId: string, fromPhone: string, text: string): Promise<void> {
  const siteUrl = process.env.CONVEX_SITE_URL;
  const secret = process.env.CONVEX_WEBHOOK_SECRET;
  if (!siteUrl || !secret) return;

  const res = await fetch(`${siteUrl.replace(/\/$/, "")}/whatsapp/webhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Webhook-Secret": secret,
    },
    body: JSON.stringify({ sessionId, fromPhone, text }),
  });
  if (!res.ok) {
    throw new Error(`Convex webhook responded ${res.status}`);
  }
}
