/**
 * Optional contact-form phone validation (REM-12).
 * Accepts E.164 and common Nigerian local formats; normalizes to E.164 when possible.
 */

export class InvalidPhoneError extends Error {
  readonly code = "INVALID_PHONE" as const;

  constructor(message = "Please enter a valid phone number.") {
    super(message);
    this.name = "InvalidPhoneError";
  }
}

const MAX_LEN = 40;

/** Strip spaces, dashes, dots, parentheses. */
function stripFormatting(raw: string): string {
  return raw.replace(/[\s().\-]/g, "");
}

/**
 * Normalize an optional phone field.
 * - empty / whitespace → undefined
 * - E.164 (`+` + 8–15 digits) kept as-is
 * - NG local `0[789]XXXXXXXXX` → `+234…`
 * - `234…` without `+` → `+234…`
 * - other bare international digit strings (10–15 digits) → prefixed with `+`
 */
export function normalizeContactPhone(
  raw: string | undefined | null
): string | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > MAX_LEN) {
    throw new InvalidPhoneError();
  }

  const stripped = stripFormatting(trimmed);
  if (!stripped || stripped.length > MAX_LEN) {
    throw new InvalidPhoneError();
  }

  if (/^\+[1-9]\d{7,14}$/.test(stripped)) {
    return stripped;
  }

  // Nigerian mobile: 0803… / 0701… / 0901… (11 digits)
  if (/^0[789]\d{9}$/.test(stripped)) {
    return `+234${stripped.slice(1)}`;
  }

  // 234803… without plus
  if (/^234[789]\d{9}$/.test(stripped)) {
    return `+${stripped}`;
  }

  // Bare country-code + national number (no leading 0)
  if (/^[1-9]\d{9,14}$/.test(stripped)) {
    return `+${stripped}`;
  }

  throw new InvalidPhoneError();
}
