/**
 * Host parsing for subdomain routing.
 * Apex vs shop-subdomain detection must stay in sync with
 * GET /api/shops/resolve-host (see README — Middleware).
 */

const DEFAULT_SHOP_BASE = "localhost:3000";
const DEFAULT_WEB_URL = "http://localhost:3000";

/** Platform routes that must not appear on a shop subdomain. */
export const PLATFORM_ONLY_PREFIXES = [
  "/login",
  "/signup",
  "/seller",
  "/buyer",
  "/admin",
  "/onboarding",
  "/cart",
  "/checkout",
  "/about",
  "/support",
  "/privacy",
  "/terms",
  "/hello",
] as const;

export function getHostname(host: string): string {
  return host.split(":")[0]?.toLowerCase() ?? "";
}

function shopBaseHostname(): string {
  return (
    process.env.NEXT_PUBLIC_SHOP_BASE_DOMAIN ?? DEFAULT_SHOP_BASE
  )
    .split(":")[0]
    ?.toLowerCase() ?? "";
}

function platformHostname(): string {
  const raw =
    process.env.NEXT_PUBLIC_WEB_URL ??
    process.env.WEB_URL ??
    DEFAULT_WEB_URL;
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "localhost";
  }
}

/** True for marketplace apex — never rewrite these hosts. */
export function isApexPlatformHost(host: string): boolean {
  const hostname = getHostname(host);
  if (!hostname) return true;

  const shopBase = shopBaseHostname();
  const platformHost = platformHostname();

  const apex = new Set(
    [
      "localhost",
      "127.0.0.1",
      "lvh.me",
      platformHost,
      shopBase,
      shopBase ? `www.${shopBase}` : "",
      platformHost ? `www.${platformHost}` : "",
    ].filter(Boolean)
  );

  return apex.has(hostname);
}

/**
 * Leftmost tenant label when host is a subdomain of SHOP_BASE_DOMAIN
 * (e.g. shop1.lvh.me → shop1). Returns null on apex or non-matching host.
 */
export function extractShopSubdomain(host: string): string | null {
  const hostname = getHostname(host);
  const shopBase = shopBaseHostname();
  if (!hostname || !shopBase || hostname === shopBase) return null;
  if (hostname === `www.${shopBase}`) return null;
  if (!hostname.endsWith(`.${shopBase}`)) return null;

  const sub = hostname.slice(0, -(shopBase.length + 1));
  const label = sub.includes(".") ? (sub.split(".")[0] ?? "") : sub;
  if (!label || label === "www") return null;
  return label;
}

export function isPlatformOnlyPath(pathname: string): boolean {
  return PLATFORM_ONLY_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}
