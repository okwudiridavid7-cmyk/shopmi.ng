import { env } from "../config/env";

export class CaptchaError extends Error {
  readonly code: "CAPTCHA_FAILED" | "CAPTCHA_UNAVAILABLE" | "CAPTCHA_REQUIRED";

  constructor(
    code: CaptchaError["code"],
    message: string
  ) {
    super(message);
    this.name = "CaptchaError";
    this.code = code;
  }
}

export type TurnstileVerifyDeps = {
  fetchFn?: typeof fetch;
  secret?: string;
  isProd?: boolean;
  bypass?: boolean;
};

/**
 * Whether contact endpoints must enforce Turnstile.
 * - Prod: always required (fail closed even if secret missing → CAPTCHA_UNAVAILABLE)
 * - Non-prod: required only when TURNSTILE_SECRET_KEY is set
 * - Bypass: CONTACT_CAPTCHA_BYPASS=true and not prod
 */
export function isCaptchaRequired(deps?: TurnstileVerifyDeps): boolean {
  const isProd = deps?.isProd ?? env.isProd;
  const bypass = deps?.bypass ?? env.contactCaptchaBypass;
  if (bypass && !isProd) return false;
  if (isProd) return true;
  const secret = deps?.secret ?? env.turnstileSecretKey;
  return Boolean(secret);
}

/**
 * Verify a Cloudflare Turnstile token via siteverify.
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteIp: string | null | undefined,
  deps?: TurnstileVerifyDeps
): Promise<void> {
  if (!isCaptchaRequired(deps)) return;

  const secret = deps?.secret ?? env.turnstileSecretKey;
  const isProd = deps?.isProd ?? env.isProd;

  if (!secret) {
    throw new CaptchaError(
      "CAPTCHA_UNAVAILABLE",
      isProd
        ? "Captcha is required but not configured."
        : "Captcha secret is not configured."
    );
  }

  const trimmed = token?.trim();
  if (!trimmed) {
    throw new CaptchaError(
      "CAPTCHA_REQUIRED",
      "Please complete the captcha challenge."
    );
  }

  const fetchFn = deps?.fetchFn ?? fetch;
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", trimmed);
  if (remoteIp) body.set("remoteip", remoteIp);

  let data: { success?: boolean; "error-codes"?: string[] };
  try {
    const res = await fetchFn(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    data = (await res.json()) as typeof data;
  } catch {
    throw new CaptchaError(
      "CAPTCHA_FAILED",
      "Captcha verification failed. Please try again."
    );
  }

  if (!data.success) {
    throw new CaptchaError(
      "CAPTCHA_FAILED",
      "Captcha verification failed. Please try again."
    );
  }
}
