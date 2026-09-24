"use client";

import { usePathname, useParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import type { TenantPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { SiteHeader } from "./site-header";
import { PlatformFooter, ShopFooter } from "./footers";

export type ShellMode = "platform" | "seller" | "buyer" | "admin" | "shop";

function modeFromPath(pathname: string): ShellMode {
  if (pathname.startsWith("/seller")) return "seller";
  if (pathname.startsWith("/buyer")) return "buyer";
  if (pathname.startsWith("/admin")) return "admin";
  if (pathname.startsWith("/shops/")) return "shop";
  return "platform";
}

function shopAccent(tenant: TenantPublic | null): string | null {
  const theme = tenant?.themeSettings;
  if (!theme || typeof theme !== "object") return null;
  const color =
    (theme as Record<string, unknown>).primaryColor ??
    (theme as Record<string, unknown>).accentColor;
  return typeof color === "string" ? color : null;
}

function shopLogo(tenant: TenantPublic | null): string | null {
  const theme = tenant?.themeSettings;
  if (!theme || typeof theme !== "object") return null;
  const logo = (theme as Record<string, unknown>).logoUrl;
  return typeof logo === "string" ? logo : null;
}

function ShopFooterLoader({ slug }: { slug: string }) {
  const [tenant, setTenant] = useState<TenantPublic | null>(null);

  useEffect(() => {
    apiFetch<{ tenant: TenantPublic }>(`/api/shops/${slug}`)
      .then((r) => setTenant(r.tenant))
      .catch(() => setTenant(null));
  }, [slug]);

  if (!tenant) {
    return <PlatformFooter />;
  }

  return (
    <ShopFooter
      shopName={tenant.name}
      slug={tenant.slug}
      accentColor={shopAccent(tenant)}
      logoUrl={shopLogo(tenant)}
      verified={tenant.verifiedBadge}
      phone={tenant.phone}
      email={tenant.email}
      address={tenant.address}
    />
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const params = useParams<{ slug?: string }>();
  const mode = modeFromPath(pathname);
  const shopSlug =
    mode === "shop" && typeof params.slug === "string" ? params.slug : null;

  return (
    <div data-shell={mode} className="flex min-h-screen flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-token-6 py-token-8">
        {children}
      </main>
      {shopSlug ? <ShopFooterLoader slug={shopSlug} /> : <PlatformFooter />}
    </div>
  );
}
