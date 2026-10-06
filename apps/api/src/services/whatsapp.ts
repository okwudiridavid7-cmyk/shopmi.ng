import crypto from "crypto";
import { env } from "../config/env";

/** Digits only, no leading +. Empty string if we can't make a sensible number. */
export function toE164Digits(raw: string, defaultCountry = "234"): string {
  let digits = raw.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (!digits) return "";
  // Local Nigerian mobiles: 0803… → 234803…
  if (defaultCountry === "234" && /^0[789]\d{9}$/.test(digits)) {
    digits = `234${digits.slice(1)}`;
  } else if (defaultCountry === "234" && /^[789]\d{9}$/.test(digits)) {
    digits = `234${digits}`;
  }
  // WhatsApp Cloud API wants 8–15 digits without a plus.
  if (digits.length < 8 || digits.length > 15) return "";
  return digits;
}

export function whatsappConfigured(): boolean {
  return Boolean(env.whatsappToken && env.whatsappPhoneNumberId);
}

export type NewOrderTemplateParams = {
  shopName: string;
  amountLabel: string;
  itemsSummary: string;
  reference: string;
};

function graphUrl(path: string): string {
  const version = env.whatsappGraphVersion.replace(/^\/+|\/+$/g, "") || "v21.0";
  return `https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`;
}

/**
 * Sends the approved `new_order` utility template. Free-form text is rejected by
 * Meta outside the 24-hour customer-care window, so templates are required.
 */
export async function sendNewOrderTemplate(
  toRaw: string,
  params: NewOrderTemplateParams
): Promise<{ sent: boolean; skipped?: boolean; messageId?: string }> {
  const to = toE164Digits(toRaw);
  if (!to) return { sent: false, skipped: true };

  if (!whatsappConfigured()) {
    console.info(
      `[whatsapp] would notify ${to}: ${params.shopName} ${params.amountLabel} (${params.reference})`
    );
    return { sent: false, skipped: true };
  }

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: env.whatsappTemplateNewOrder,
      language: { code: env.whatsappTemplateLang },
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: params.shopName.slice(0, 60) },
            { type: "text", text: params.amountLabel.slice(0, 60) },
            { type: "text", text: params.itemsSummary.slice(0, 120) || "—" },
            { type: "text", text: params.reference.slice(0, 60) },
          ],
        },
      ],
    },
  };

  const res = await fetch(graphUrl(`${env.whatsappPhoneNumberId}/messages`), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[whatsapp] send failed", res.status, text.slice(0, 400));
    throw new Error(`WhatsApp API ${res.status}`);
  }

  const data = (await res.json()) as { messages?: { id?: string }[] };
  return { sent: true, messageId: data.messages?.[0]?.id };
}

/** Timing-safe check of Meta's X-Hub-Signature-256 header. */
export function verifyWhatsAppSignature(rawBody: Buffer, header: string | undefined): boolean {
  if (!env.whatsappAppSecret) return false;
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto.createHmac("sha256", env.whatsappAppSecret).update(rawBody).digest("hex");
  const got = header.slice("sha256=".length);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(got, "hex"));
  } catch {
    return false;
  }
}
