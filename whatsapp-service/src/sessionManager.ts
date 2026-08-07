import fs from "node:fs";
import path from "node:path";
import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  type WASocket,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import pino from "pino";
import { notifyConvex } from "./convexClient.js";

/**
 * One Baileys socket per Convex user (sessionId = Convex userId), so each
 * paying workspace connects its own WhatsApp number instead of sharing one
 * global connection. Auth state is persisted to disk per session — this
 * process must run on a host with a persistent volume, not a serverless
 * platform (see README.md).
 */

const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR ?? "./auth_state";
const logger = pino({ level: process.env.LOG_LEVEL ?? "warn" });

interface Session {
  sessionId: string;
  sock: WASocket | null;
  qr: string | null; // latest pairing QR, rendered as a data URL
  connected: boolean;
  phoneNumber: string | null;
}

const sessions = new Map<string, Session>();
// Dedupe concurrent getOrCreateSession calls for the same sessionId — the
// status endpoint gets polled by the dashboard, and two overlapping polls
// must not spin up two sockets for the same user.
const pendingStarts = new Map<string, Promise<Session>>();

function authDirFor(sessionId: string): string {
  // sessionId comes from a Convex user id — sanitize before touching disk.
  const safe = sessionId.replace(/[^a-zA-Z0-9_-]/g, "");
  return path.join(AUTH_DIR, safe);
}

export async function getOrCreateSession(sessionId: string): Promise<Session> {
  const existing = sessions.get(sessionId);
  if (existing) return existing;

  const pending = pendingStarts.get(sessionId);
  if (pending) return pending;

  const startPromise = startSession(sessionId).finally(() => {
    pendingStarts.delete(sessionId);
  });
  pendingStarts.set(sessionId, startPromise);
  return startPromise;
}

async function startSession(sessionId: string): Promise<Session> {
  const dir = authDirFor(sessionId);
  fs.mkdirSync(dir, { recursive: true });
  const { state, saveCreds } = await useMultiFileAuthState(dir);

  const session: Session = {
    sessionId,
    sock: null,
    qr: null,
    connected: false,
    phoneNumber: null,
  };
  sessions.set(sessionId, session);

  const sock = makeWASocket({ auth: state, logger });
  session.sock = sock;

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      QRCode.toDataURL(qr)
        .then((dataUrl) => {
          session.qr = dataUrl;
        })
        .catch((error) => logger.error({ error, sessionId }, "failed to render QR"));
    }

    if (connection === "open") {
      session.connected = true;
      session.qr = null;
      session.phoneNumber = sock.user?.id?.split(":")[0] ?? null;
      logger.info({ sessionId }, "WhatsApp connected");
    }

    if (connection === "close") {
      session.connected = false;
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;
      logger.warn({ sessionId, statusCode, loggedOut }, "WhatsApp connection closed");
      sessions.delete(sessionId);
      if (!loggedOut) {
        // Transient disconnect (network blip, server restart, etc.) — the
        // saved credentials are still valid, so reconnect automatically.
        void startSession(sessionId);
      }
      // If logged out, the credentials are dead. Leave the stale auth dir in
      // place for a human to see the disconnected status; call /logout to
      // clear it and get a fresh QR.
    }
  });

  sock.ev.on("messages.upsert", ({ messages, type }) => {
    if (type !== "notify") return;
    for (const msg of messages) {
      if (msg.key.fromMe) continue; // only forward inbound messages
      const from = msg.key.remoteJid?.split("@")[0] ?? null;
      const text = msg.message?.conversation ?? msg.message?.extendedTextMessage?.text ?? null;
      if (!from || !text) continue;
      notifyConvex(sessionId, from, text).catch((error) =>
        logger.error({ error, sessionId }, "failed to notify Convex of an inbound message"),
      );
    }
  });

  return session;
}

export async function sendMessage(sessionId: string, phone: string, text: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session?.sock || !session.connected) {
    throw new Error("WhatsApp is not connected for this workspace yet — pair it in Settings first.");
  }
  const jid = `${phone.replace(/[^\d]/g, "")}@s.whatsapp.net`;
  await session.sock.sendMessage(jid, { text });
}

export function getStatus(sessionId: string): {
  connected: boolean;
  qr: string | null;
  phoneNumber: string | null;
} {
  const session = sessions.get(sessionId);
  if (!session) return { connected: false, qr: null, phoneNumber: null };
  return { connected: session.connected, qr: session.qr, phoneNumber: session.phoneNumber };
}

export function logoutSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session?.sock) {
    session.sock.logout().catch(() => {});
  }
  sessions.delete(sessionId);
  fs.rmSync(authDirFor(sessionId), { recursive: true, force: true });
}
