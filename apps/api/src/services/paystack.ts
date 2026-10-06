import crypto from "crypto";
import { env } from "../config/env";

const BASE = "https://api.paystack.co";

export class PaystackError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

type PaystackEnvelope<T> = { status: boolean; message: string; data?: T };

export function paystackConfigured(): boolean {
  return Boolean(env.paystackSecretKey);
}

export async function paystackRequest<T>(
  path: string,
  init: { method?: "GET" | "POST" | "PUT"; body?: unknown } = {}
): Promise<T> {
  if (!env.paystackSecretKey) throw new PaystackError("Paystack is not configured", 503);
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: init.method ?? "GET",
      headers: {
        Authorization: `Bearer ${env.paystackSecretKey}`,
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new PaystackError("Could not reach Paystack", 502);
  }
  let json: PaystackEnvelope<T> | null = null;
  try {
    json = (await res.json()) as PaystackEnvelope<T>;
  } catch {
    json = null;
  }
  if (!res.ok || !json?.status || json.data === undefined) {
    throw new PaystackError(json?.message || `Paystack error ${res.status}`, res.status >= 500 ? 502 : 400);
  }
  return json.data;
}

/** HMAC-SHA512 of the raw body with the secret key, compared in constant time. */
export function verifyPaystackSignature(rawBody: Buffer, signature: string | undefined): boolean {
  if (!env.paystackSecretKey || !signature || !/^[0-9a-f]{128}$/i.test(signature)) return false;
  const expected = crypto.createHmac("sha512", env.paystackSecretKey).update(rawBody).digest();
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

/** The fields of a Paystack transaction we act on. */
export type PaystackCharge = {
  reference: string;
  status: string;
  amount: number;
  currency: string;
};

export function chargeFromEvent(data: unknown): PaystackCharge | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (typeof d.reference !== "string" || typeof d.status !== "string") return null;
  const amount = Number(d.amount);
  if (!Number.isInteger(amount) || amount < 0) return null;
  return {
    reference: d.reference,
    status: d.status,
    amount,
    currency: typeof d.currency === "string" ? d.currency.toUpperCase() : "",
  };
}

export async function verifyTransaction(reference: string): Promise<PaystackCharge | null> {
  const data = await paystackRequest<unknown>(
    `/transaction/verify/${encodeURIComponent(reference)}`
  );
  return chargeFromEvent(data);
}

export async function initializeTransaction(body: Record<string, unknown>): Promise<{
  authorization_url: string;
  access_code: string;
  reference: string;
}> {
  return paystackRequest("/transaction/initialize", { method: "POST", body });
}

/** Full refund of a transaction. Paystack processes it asynchronously (refund.processed webhook). */
export async function refundTransaction(
  reference: string,
  opts: { amountKobo?: number; reason?: string } = {}
): Promise<{ status?: string }> {
  return paystackRequest("/refund", {
    method: "POST",
    body: {
      transaction: reference,
      ...(opts.amountKobo ? { amount: opts.amountKobo } : {}),
      ...(opts.reason ? { merchant_note: opts.reason.slice(0, 200) } : {}),
    },
  });
}

/** Major units to the smallest unit (kobo for NGN). */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

/** Random, unguessable payment reference with a routing prefix (ord_, pln_, dom_). */
export function newReference(prefix: string): string {
  return `${prefix}${crypto.randomBytes(12).toString("hex")}`;
}
