import { NextRequest, NextResponse } from "next/server";
import {
  isApexPlatformHost,
  isPlatformOnlyPath,
} from "@/lib/shop-host";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ResolveHostResponse = {
  platform?: boolean;
  tenant?: { slug?: string } | null;
};

async function resolveShopFromHost(host: string): Promise<string | null> {
  try {
    const resolveUrl = `${API_URL}/api/shops/resolve-host?host=${encodeURIComponent(host)}`;
    const res = await fetch(resolveUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as ResolveHostResponse;
    if (data.platform || !data.tenant?.slug) return null;
    return data.tenant.slug;
  } catch {
    return null;
  }
}

/**
 * Subdomain / custom-domain → slug shop routes.
 * Tenant lookup uses GET /api/shops/resolve-host (same host resolver).
 *
 * Order matters:
 * 1. Apex platform host → pass through ( /login, /signup, marketplace, etc. )
 * 2. Shop host → block platform-only paths; rewrite everything else to /shops/[slug]/…
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get("host") ?? "";

  // 1. Marketplace apex — no tenant rewrite on localhost, lvh.me root, or production apex.
  if (isApexPlatformHost(host)) {
    return NextResponse.next();
  }

  // Internal slug routes and Next assets (matcher also skips static files).
  if (pathname.startsWith("/shops/") || pathname.startsWith("/_next")) {
    return NextResponse.next();
  }

  const slug = await resolveShopFromHost(host);
  if (!slug) {
    // Unknown host — let Next serve a normal 404, do not guess a tenant.
    return NextResponse.next();
  }

  // Shop subdomain/custom domain: hide platform auth & dashboards.
  if (isPlatformOnlyPath(pathname)) {
    const url = req.nextUrl.clone();
    url.pathname = `/shops/${slug}`;
    return NextResponse.redirect(url);
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
