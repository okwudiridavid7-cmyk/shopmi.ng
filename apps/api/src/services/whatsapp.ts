import { env } from "../config/env";

/**
 * Send a WhatsApp text via Meta Cloud API.
 * Without WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID, logs and skips.
 */
export async function sendWhatsAppText(
  toE164: string,
  body: string
): Promise<{ sent: boolean; skipped?: boolean }> {
  const phone = toE164.replace(/[^\d+]/g, "");
  if (!phone) {
    return { sent: false, skipped: true };
  }

  if (!env.whatsappToken || !env.whatsappPhoneNumberId) {
    console.warn(
      "[whatsapp] WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID not set — skipping notification"
    );
    console.info(`[whatsapp] would send to ${phone}: ${body.slice(0, 120)}…`);
    return { sent: false, skipped: true };
  }

  const url = `https://graph.facebook.com/v19.0/${env.whatsappPhoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: phone.replace(/^\+/, ""),
      type: "text",
      text: { body },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("[whatsapp] send failed", res.status, text);
    return { sent: false };
  }

  return { sent: true };
}
