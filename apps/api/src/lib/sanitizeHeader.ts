/**
 * Reject email-header values that contain CRLF or other ASCII controls
 * (header-injection / subject smuggling). Does not silently strip — callers
 * should return 400 to the client when this throws.
 */
export class HeaderInjectionError extends Error {
  readonly code = "INVALID_SUBJECT" as const;

  constructor(message = "Subject contains invalid characters.") {
    super(message);
    this.name = "HeaderInjectionError";
  }
}

const CONTROL_CHAR = /[\r\n\0\x01-\x1f\x7f]/;
const CONTROL_CHARS_GLOBAL = /[\r\n\0\x01-\x1f\x7f]/g;

/**
 * Validate a user-supplied email subject (or similar header fragment).
 * NFC-normalizes, trims, enforces length, rejects control characters.
 */
export function sanitizeEmailSubject(
  raw: string,
  opts?: { min?: number; max?: number }
): string {
  const min = opts?.min ?? 3;
  const max = opts?.max ?? 160;
  const normalized = raw.normalize("NFC");
  if (CONTROL_CHAR.test(normalized)) {
    throw new HeaderInjectionError();
  }
  const trimmed = normalized.trim();
  if (trimmed.length < min || trimmed.length > max) {
    throw new HeaderInjectionError(
      `Subject must be between ${min} and ${max} characters.`
    );
  }
  return trimmed;
}

/**
 * For system-controlled strings (app name, shop name) placed into subjects:
 * strip controls rather than failing the whole request.
 */
export function sanitizeHeaderFragment(raw: string, max = 80): string {
  return raw
    .normalize("NFC")
    .replace(CONTROL_CHARS_GLOBAL, "")
    .trim()
    .slice(0, max);
}
