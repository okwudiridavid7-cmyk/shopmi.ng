import { Router, raw } from "express";
import { env } from "../config/env";
import { verifyWhatsAppSignature } from "../services/whatsapp";

/**
 * Meta WhatsApp Cloud API webhook.
 * GET verifies the subscription; POST receives delivery / read status (logged only for now).
 */
export const whatsappWebhookRouter = Router();

whatsappWebhookRouter.get("/webhook", (req, res) => {
  const mode = String(req.query["hub.mode"] ?? "");
  const token = String(req.query["hub.verify_token"] ?? "");
  const challenge = String(req.query["hub.challenge"] ?? "");
  if (mode === "subscribe" && env.whatsappVerifyToken && token === env.whatsappVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

whatsappWebhookRouter.post(
  "/webhook",
  raw({ type: "*/*", limit: "256kb" }),
  (req, res) => {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(typeof req.body === "string" ? req.body : "");
    const signature = req.header("x-hub-signature-256") ?? undefined;
    if (!verifyWhatsAppSignature(rawBody, signature)) {
      return res.sendStatus(401);
    }
    try {
      const payload = JSON.parse(rawBody.toString("utf8")) as {
        entry?: { changes?: { value?: { statuses?: unknown[] } }[] }[];
      };
      const statuses = payload.entry?.[0]?.changes?.[0]?.value?.statuses;
      if (Array.isArray(statuses) && statuses.length) {
        console.info(`[whatsapp] status update ×${statuses.length}`);
      }
    } catch {
      /* ignore malformed */
    }
    return res.sendStatus(200);
  }
);
