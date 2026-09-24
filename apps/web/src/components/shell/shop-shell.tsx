"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import type { TenantPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { ShopNav } from "./shop-nav";
import { ShopFooter } from "./footers";
import { SiteTicker } from "@/components/site-ticker";
import { ChatWidgets } from "@/components/chat-widgets";
import { parseThemeSettings } from "@/lib/theme";
import { useAppName } from "@/hooks/use-branding";
import { useUiStore } from "@/stores/ui";

function ShopFavicon({ href, title }: { href: string | null; title: string }) {
  useEffect(() => {
    if (title) document.title = title;
    if (!href) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [href, title]);
  return null;
}

export function ShopShell({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const appName = useAppName();

  useEffect(() => {
    apiFetch<{ tenant: TenantPublic }>(`/api/shops/${slug}`)
      .then((r) => setTenant(r.tenant))
      .catch(() => setTenant(null));
  }, [slug]);

  const theme = parseThemeSettings(tenant?.themeSettings ?? null);
  const accent = theme.primaryColor || theme.accentColor;
  const logo = theme.logoRectUrl || theme.logoUrl;

  return (
    <div data-shell="shop" className="flex min-h-screen flex-col bg-background">
      <ShopFavicon
        href={theme.logoUrl ?? null}
        title={tenant?.name ?? slug}
      />
      {theme.tickerEnabled && theme.tickerText && (
        <SiteTicker
          text={theme.tickerText}
          speed={theme.tickerSpeed ?? 12}
          backgroundColor={theme.tickerBg || "#111111"}
          textColor={theme.tickerColor || "#ffffff"}
          storageKey={`shop-ticker-${slug}`}
        />
      )}
      <ShopNav
        tenant={tenant}
        slug={slug}
        onOpenFilters={() =>
          useUiStore.getState().setShopFilterDrawerOpen(true)
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-token-6 pb-token-16 pt-token-8">
        {children}
      </main>
      {tenant ? (
        <ShopFooter
          shopName={tenant.name}
          slug={tenant.slug}
          accentColor={accent}
          logoUrl={logo}
          verified={tenant.verifiedBadge}
          phone={tenant.phone}
          email={tenant.email}
          address={tenant.address}
          socialLinks={tenant.socialLinks}
          platformName={appName}
          aboutText={theme.shopDescription}
        />
      ) : (
        <footer className="mt-auto border-t border-border px-token-6 py-token-6 text-sm text-muted-foreground">
          <Link href={`/shops/${slug}`}>Shop</Link>
        </footer>
      )}
      <ChatWidgets
        whatsappUrl={theme.whatsappUrl}
        chatbotHtml={theme.chatbotHtml}
      />
    </div>
  );
}
