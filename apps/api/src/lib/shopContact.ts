import { z } from "zod";

const emailSchema = z.string().email();

export type ShopContactTheme = Record<string, unknown>;

/**
 * Resolve a validated shop inbox address. Never falls back to platform support.
 */
export function resolveShopContactRecipient(opts: {
  tenantEmail: string | null | undefined;
  theme: ShopContactTheme;
}): string | null {
  const candidates = [
    opts.tenantEmail,
    typeof opts.theme.contactEmail === "string"
      ? opts.theme.contactEmail
      : null,
  ];
  for (const raw of candidates) {
    const trimmed = raw?.trim();
    if (!trimmed) continue;
    const parsed = emailSchema.safeParse(trimmed);
    if (parsed.success) return parsed.data;
  }
  return null;
}

/** Default true when unset; only explicit false disables. */
export function isShopContactFormEnabled(theme: ShopContactTheme): boolean {
  return theme.contactFormEnabled !== false;
}
