import { z } from "zod";

/**
 * Links that end up in href/src attributes. Only schemes that can't run script:
 * http(s), mailto, tel, same-site paths and in-page anchors.
 */
export function isSafeLink(raw: string): boolean {
  const value = raw.trim();
  if (!value) return false;
  if (value.startsWith("#")) return true;
  if (value.startsWith("/")) return !value.startsWith("//") && !value.startsWith("/\\");
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export function isHttpsUrl(raw: string): boolean {
  try {
    return new URL(raw.trim()).protocol === "https:";
  } catch {
    return false;
  }
}

const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com", "www.whatsapp.com"]);

/** A wa.me / whatsapp.com https link, or a phone number. */
export function isWhatsappTarget(raw: string): boolean {
  const value = raw.trim();
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && WHATSAPP_HOSTS.has(url.hostname);
    } catch {
      return false;
    }
  }
  return /^\+?[\d\s()-]{7,20}$/.test(value);
}

export const safeLink = (max = 2000) =>
  z.string().trim().max(max).refine(isSafeLink, { message: "Use an https:// link or a path starting with /" });

export const whatsappTarget = z
  .string()
  .trim()
  .max(500)
  .refine(isWhatsappTarget, { message: "Use a wa.me link or a phone number" });
