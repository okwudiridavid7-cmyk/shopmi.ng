import crypto from "crypto";

export type ContactLogOutcome =
  | "sent"
  | "queued"
  | "awaiting_confirm"
  | "failed"
  | "honeypot"
  | "rate_limited"
  | "rejected"
  | "captcha_failed"
  | "confirmed";

export type ContactLogEvent = {
  requestId: string;
  route: "platform" | "shop";
  slug?: string | null;
  inquiryId?: string | null;
  outcome: ContactLogOutcome;
  latencyMs: number;
  code?: string | null;
  replay?: boolean;
};

const counters = new Map<string, number>();

export function resetContactMetrics(): void {
  counters.clear();
}

export function getContactMetric(name: string): number {
  return counters.get(name) ?? 0;
}

function bump(name: string) {
  counters.set(name, (counters.get(name) ?? 0) + 1);
}

/** Structured JSON log line for contact pipeline (REM-11). */
export function logContactEvent(event: ContactLogEvent): void {
  bump(`contact.${event.outcome}`);
  if (event.code) bump(`contact.code.${event.code}`);
  // eslint-disable-next-line no-console
  console.info(
    JSON.stringify({
      type: "contact.event",
      ts: new Date().toISOString(),
      ...event,
    })
  );
}

export function newContactRequestId(): string {
  return crypto.randomBytes(8).toString("hex");
}
