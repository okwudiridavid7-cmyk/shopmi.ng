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

export function formatE164(raw: string): string | null {
  const digits = toE164Digits(raw);
  return digits ? `+${digits}` : null;
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

export type OrderUpdateTemplateParams = {
  statusLabel: string;
  shopName: string;
  detail: string;
  reference: string;
};

export type ReminderTemplateParams = {
  title: string;
  body: string;
  actionHint: string;
};

type SendResult = { sent: boolean; skipped?: boolean; messageId?: string };

function graphUrl(path: string): string {
  const version = env.whatsappGraphVersion.replace(/^\/+|\/+$/g, "") || "v21.0";
  return `https://graph.facebook.com/${version}/${path.replace(/^\//, "")}`;
}

async function sendTemplate(
  toRaw: string,
  templateName: string,
  bodyParams: string[],
  logLabel: string,
  buttonCopyCode?: string
): Promise<SendResult> {
  const to = toE164Digits(toRaw);
  if (!to) return { sent: false, skipped: true };

  if (!whatsappConfigured()) {
    console.info(`[whatsapp] would send ${logLabel} to ${to}: ${bodyParams.join(" | ")}`);
    return { sent: false, skipped: true };
  }

  const components: Record<string, unknown>[] = [
    {
      type: "body",
      parameters: bodyParams.map((text) => ({
        type: "text",
        text: text.slice(0, 120) || "—",
      })),
    },
  ];
  // Authentication templates with a copy-code / OTP button need the code on the button too.
  if (buttonCopyCode) {
    components.push({
      type: "button",
      sub_type: "otp",
      index: "0",
      parameters: [{ type: "text", text: buttonCopyCode.slice(0, 15) }],
    });
  }

  const body = {
    messaging_product: "whatsapp",
    to,
    type: "template",
    template: {
      name: templateName,
      language: { code: env.whatsappTemplateLang },
      components,
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

/**
 * Sends the approved `new_order` utility template to sellers.
 */
export async function sendNewOrderTemplate(
  toRaw: string,
  params: NewOrderTemplateParams
): Promise<SendResult> {
  return sendTemplate(
    toRaw,
    env.whatsappTemplateNewOrder,
    [params.shopName, params.amountLabel, params.itemsSummary || "Order", params.reference],
    "new_order"
  );
}

/** Authentication / OTP template. Body {{1}} = code. */
export async function sendPhoneOtpTemplate(
  toRaw: string,
  code: string
): Promise<SendResult> {
  return sendTemplate(
    toRaw,
    env.whatsappTemplatePhoneOtp,
    [code],
    "phone_otp",
    code
  );
}

/** Buyer order status update (paid / fulfilled / refunded). */
export async function sendOrderUpdateTemplate(
  toRaw: string,
  params: OrderUpdateTemplateParams
): Promise<SendResult> {
  return sendTemplate(
    toRaw,
    env.whatsappTemplateOrderUpdate,
    [params.statusLabel, params.shopName, params.detail, params.reference],
    "order_update"
  );
}

/** Generic reminder (plan expiry, incomplete checkout, etc.). */
export async function sendReminderTemplate(
  toRaw: string,
  params: ReminderTemplateParams
): Promise<SendResult> {
  return sendTemplate(
    toRaw,
    env.whatsappTemplateReminder,
    [params.title, params.body, params.actionHint],
    "reminder"
  );
}

export function hashOtp(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

export function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 999999));
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
