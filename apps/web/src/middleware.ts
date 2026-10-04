import { NextRequest, NextResponse } from "next/server";
import {
  isApexPlatformHost,
  isPlatformOnlyPath,
  platformOrigin,
} from "@/lib/shop-host";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ResolveHostResponse = {
  platform?: boolean;
  tenant?: { slug?: string } | null;
  /** Set when the domain is verified but the shop's plan no longer includes it. */
  redirect?: string;
};

type HostResolution = { slug: string | null; redirect: string | null };

const hostCache = new Map<string, { value: HostResolution; exp: number }>();
const HOST_CACHE_MS = 60_000;

async function resolveHost(host: string): Promise<HostResolution> {
  const hit = hostCache.get(host);
  if (hit && hit.exp > Date.now()) return hit.value;

  let value: HostResolution = { slug: null, redirect: null };
  try {
    const resolveUrl = `${API_URL}/api/shops/resolve-host?host=${encodeURIComponent(host)}`;
    const res = await fetch(resolveUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as ResolveHostResponse;
      if (data.redirect) value = { slug: null, redirect: data.redirect };
      else if (!data.platform && data.tenant?.slug) {
        value = { slug: data.tenant.slug, redirect: null };
      }
    }
  } catch {
    return value;
  }
  hostCache.set(host, { value, exp: Date.now() + HOST_CACHE_MS });
  return value;
}

/**
 * Subdomain / custom-domain → slug shop routes.
 * Tenant lookup uses GET /api/shops/resolve-host (same host resolver).
 *
 * Order matters:
 * 1. Apex platform host → pass through ( /login, /signup, marketplace, etc. )
 * 2. Shop host → send platform pages to the marketplace; rewrite everything else to /shops/[slug]/…
 */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  if (isApexPlatformHost(host) || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const { slug, redirect } = await resolveHost(host);
  if (redirect) {
    const path = pathname === "/" ? "" : pathname;
    return NextResponse.redirect(`${redirect.replace(/\/$/, "")}${path}${search}`);
  }
  if (!slug) {
    // Unknown host - let Next serve a normal 404, do not guess a tenant.
    return NextResponse.next();
  }

  // Shop links use /shops/:slug/...; a shop host only serves its own shop.
  if (pathname.startsWith("/shops/")) {
    const pathSlug = pathname.split("/")[2]?.toLowerCase();
    if (pathSlug === slug) return NextResponse.next();
    return NextResponse.redirect(`${platformOrigin()}${pathname}${search}`);
  }

  // Cart, checkout, sign-in and dashboards live on the marketplace.
  if (isPlatformOnlyPath(pathname)) {
    return NextResponse.redirect(`${platformOrigin()}${pathname}${search}`);
  }

  const url = req.nextUrl.clone();
  url.pathname =
    pathname === "/" ? `/shops/${slug}` : `/shops/${slug}${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
