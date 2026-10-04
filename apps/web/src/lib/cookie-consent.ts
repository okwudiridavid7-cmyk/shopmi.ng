export type ConsentCategory = "functional" | "analytics" | "marketing";

export type CookieConsent = {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  version: number;
  updatedAt: string;
};

export const CONSENT_COOKIE = "shopmi_consent";
/** Bump when categories change so everyone is asked again. */
export const CONSENT_VERSION = 1;
const MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export function readConsent(): CookieConsent | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
    ?.slice(CONSENT_COOKIE.length + 1);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw)) as Partial<CookieConsent>;
    if (parsed.version !== CONSENT_VERSION) return null;
    return {
      functional: !!parsed.functional,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      version: CONSENT_VERSION,
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export function writeConsent(
  choice: Pick<CookieConsent, ConsentCategory>
): CookieConsent {
  const consent: CookieConsent = {
    ...choice,
    version: CONSENT_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(
    JSON.stringify(consent)
  )}; Max-Age=${MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  return consent;
}
