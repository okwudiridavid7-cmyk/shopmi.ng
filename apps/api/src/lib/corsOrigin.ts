export type CorsAllowConfig = {
  isProd: boolean;
  webUrl: string;
  shopBaseDomain: string;
  /** Extra absolute origins (e.g. preview deploys), from ALLOWED_ORIGINS. */
  allowedOrigins?: string[];
};

function hostnameOf(urlOrHost: string): string {
  try {
    if (urlOrHost.includes("://")) {
      return new URL(urlOrHost).hostname.toLowerCase();
    }
  } catch {
    /* fall through */
  }
  return urlOrHost.split(":")[0]?.toLowerCase() ?? "";
}

/**
 * Whether a browser Origin is allowed to call the API with credentials.
 * Missing Origin (non-browser / same-origin proxies) remains allowed — same
 * as the previous middleware behavior.
 */
export function isCorsOriginAllowed(
  origin: string | undefined,
  cfg: CorsAllowConfig
): boolean {
  if (!origin) return true;

  let host: string;
  let originNormalized: string;
  try {
    const o = new URL(origin);
    host = o.hostname.toLowerCase();
    originNormalized = o.origin;
  } catch {
    return false;
  }

  try {
    const webOrigin = new URL(cfg.webUrl).origin;
    if (originNormalized === webOrigin) return true;
  } catch {
    /* ignore bad WEB_URL */
  }

  for (const extra of cfg.allowedOrigins ?? []) {
    const trimmed = extra.trim();
    if (!trimmed) continue;
    try {
      if (originNormalized === new URL(trimmed).origin) return true;
    } catch {
      /* skip invalid entries */
    }
  }

  const shopBase = hostnameOf(cfg.shopBaseDomain);
  if (
    shopBase &&
    shopBase !== "localhost" &&
    shopBase !== "127.0.0.1" &&
    (host === shopBase || host.endsWith(`.${shopBase}`))
  ) {
    return true;
  }

  // Dev-only hosts — never in production.
  if (!cfg.isProd) {
    if (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "lvh.me" ||
      host.endsWith(".lvh.me")
    ) {
      return true;
    }
    // Local shop base like "localhost:3000" — allow subdomain-style only in non-prod
    if (
      shopBase === "localhost" ||
      shopBase === "127.0.0.1" ||
      shopBase === "lvh.me"
    ) {
      if (host === shopBase || host.endsWith(`.${shopBase}`)) return true;
    }
  }

  return false;
}

export function parseAllowedOrigins(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
