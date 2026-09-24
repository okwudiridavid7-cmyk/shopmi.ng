/**
 * Public shop URLs — prefer subdomain when SHOP_BASE_DOMAIN is set,
 * fall back to path-style `/shops/{slug}` on plain localhost.
 */

const DEFAULT_SHOP_BASE = "localhost:3000";

function shopBaseDomain(): string {
  return (
    process.env.NEXT_PUBLIC_SHOP_BASE_DOMAIN ??
    process.env.SHOP_BASE_DOMAIN ??
    DEFAULT_SHOP_BASE
  ).trim();
}

function webOrigin(): string {
  const raw =
    process.env.NEXT_PUBLIC_WEB_URL ??
    process.env.WEB_URL ??
    "http://localhost:3000";
  try {
    return new URL(raw).origin;
  } catch {
    return "http://localhost:3000";
  }
}

/** True when subdomain hosts are practical (e.g. lvh.me, real domains). */
export function prefersShopSubdomain(): boolean {
  const base = shopBaseDomain().split(":")[0]?.toLowerCase() ?? "";
  if (!base || base === "localhost" || base === "127.0.0.1") return false;
  return true;
}

/**
 * Absolute URL for a shop’s live storefront.
 * Opens cleanly in a new tab from the seller dashboard.
 */
export function buildPublicShopUrl(slug: string): string {
  const clean = slug.trim().toLowerCase();
  if (!clean) return webOrigin();

  if (prefersShopSubdomain()) {
    const base = shopBaseDomain();
    const proto = base.includes("localhost") || base.includes("127.")
      ? "http"
      : "https";
    // Preserve port if present on shop base (e.g. lvh.me:3000)
    return `${proto}://${clean}.${base}`;
  }

  return `${webOrigin()}/shops/${clean}`;
}

/** Path-style URL always available for in-app Link components. */
export function shopPathUrl(slug: string): string {
  return `/shops/${slug.trim().toLowerCase()}`;
}
