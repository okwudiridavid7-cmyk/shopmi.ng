/**
 * Seller- and admin-supplied links end up in href attributes. Only allow schemes that
 * can't run script: http(s), mailto, tel, same-site paths and in-page anchors.
 */
export function safeHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (value.startsWith("#")) return value;
  if (value.startsWith("/")) {
    // "//host" and "/\host" are protocol-relative in browsers.
    return value.startsWith("//") || value.startsWith("/\\") ? null : value;
  }
  try {
    const url = new URL(value);
    return ["http:", "https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

const WHATSAPP_HOSTS = new Set(["wa.me", "api.whatsapp.com", "chat.whatsapp.com", "whatsapp.com", "www.whatsapp.com"]);

/** wa.me / whatsapp.com links pass through; a bare phone number becomes a wa.me link. */
export function whatsappHref(raw: string | null | undefined): string | null {
  const value = raw?.trim();
  if (!value) return null;
  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      return url.protocol === "https:" && WHATSAPP_HOSTS.has(url.hostname) ? url.href : null;
    } catch {
      return null;
    }
  }
  const digits = value.replace(/\D/g, "");
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}
