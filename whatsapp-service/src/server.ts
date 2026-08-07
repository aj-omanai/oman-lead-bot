import express from "express";
import { getOrCreateSession, getStatus, logoutSession, sendMessage } from "./sessionManager.js";

const app = express();
app.use(express.json());

const SERVICE_SECRET = process.env.WHATSAPP_SERVICE_SECRET;
if (!SERVICE_SECRET) {
  console.error(
    "WHATSAPP_SERVICE_SECRET is not set — refusing to start with an unauthenticated API. " +
      "Set it to a random string and configure the same value as WHATSAPP_SERVICE_SECRET in Convex.",
  );
  process.exit(1);
}

// Unauthenticated liveness check only — everything else requires the shared
// secret Convex sends as X-Service-Secret, since this API can trigger real
// WhatsApp sends and expose pairing QR codes.
app.get("/health", (_req, res) => res.json({ ok: true }));

app.use((req, res, next) => {
  if (req.headers["x-service-secret"] !== SERVICE_SECRET) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  next();
});

app.get("/status/:sessionId", async (req, res) => {
  try {
    await getOrCreateSession(req.params.sessionId);
    res.json(getStatus(req.params.sessionId));
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : "failed to get status" });
  }
});

app.post("/send", async (req, res) => {
  const { sessionId, phone, message } = (req.body ?? {}) as {
    sessionId?: string;
    phone?: string;
    message?: string;
  };
  if (!sessionId || !phone || !message) {
    res.status(400).json({ error: "sessionId, phone and message are required" });
    return;
  }
  try {
    await sendMessage(sessionId, phone, message);
    res.json({ ok: true });
  } catch (error) {
    res.status(422).json({ error: error instanceof Error ? error.message : "send failed" });
  }
});

app.post("/logout/:sessionId", (req, res) => {
  logoutSession(req.params.sessionId);
  res.json({ ok: true });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`WhatsApp service listening on :${port}`);
});
