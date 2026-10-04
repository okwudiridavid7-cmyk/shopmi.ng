"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { StoreThemeId } from "@vendors/shared-types";
import { Eye, X } from "lucide-react";
import { ShopNav } from "./shop-nav";
import { ShopFooter, type ShopFooterTone } from "./footers";
import { SiteTicker } from "@/components/site-ticker";
import { ChatWidgets } from "@/components/chat-widgets";
import { StoreThemeProvider } from "@/components/store-themes/context";
import {
  parseHexColor,
  parseStoreThemeId,
  parseThemeSettings,
  storeBrandVars,
} from "@/lib/theme";
import {
  storeThemeMeta,
  THEME_PREVIEW_PARAM,
  themePreviewStorageKey,
} from "@/lib/store-themes";
import { platformOrigin } from "@/lib/shop-host";
import { useAppName } from "@/hooks/use-branding";
import { useShop } from "@/hooks/use-catalog";
import { useUiStore } from "@/stores/ui";

const FOOTER_TONE: Record<StoreThemeId, ShopFooterTone> = {
  classic: "dark",
  mono: "light",
  runway: "dark",
  atelier: "light",
  bazaar: "dark",
  pop: "brand",
};

function ShopFavicon({ href }: { href: string | null }) {
  useEffect(() => {
    if (!href) return;
    let link = document.querySelector<HTMLLinkElement>("link[rel='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = href;
  }, [href]);
  return null;
}

/** Theme preview chosen from the seller's theme gallery (?theme=id), kept for the tab session. */
function useThemePreview(slug: string) {
  const [preview, setPreview] = useState<StoreThemeId | null>(null);

  useEffect(() => {
    const key = themePreviewStorageKey(slug);
    const fromUrl = new URLSearchParams(window.location.search).get(
      THEME_PREVIEW_PARAM
    );
    if (fromUrl) {
      const id = parseStoreThemeId(fromUrl);
      sessionStorage.setItem(key, id);
      setPreview(id);
      return;
    }
    const saved = sessionStorage.getItem(key);
    if (saved) setPreview(parseStoreThemeId(saved));
  }, [slug]);

  function exit() {
    sessionStorage.removeItem(themePreviewStorageKey(slug));
    const url = new URL(window.location.href);
    url.searchParams.delete(THEME_PREVIEW_PARAM);
    window.history.replaceState(null, "", url.toString());
    setPreview(null);
  }

  return { preview, exit };
}

function PreviewBar({ themeId, onExit }: { themeId: StoreThemeId; onExit: () => void }) {
  const meta = storeThemeMeta(themeId);
  return (
    <div data-theme-preview-bar className="fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-950 py-1.5 pl-4 pr-1.5 text-sm text-white shadow-lg ring-1 ring-white/10">
      <Eye className="h-4 w-4 shrink-0 text-white/70" aria-hidden />
      <span className="whitespace-nowrap">
        Previewing <strong className="font-semibold">{meta.name}</strong>
        <span className="hidden text-white/60 sm:inline">. Only you can see this.</span>
      </span>
      <Link
        href={`${platformOrigin()}/seller/themes?apply=${themeId}`}
        className="whitespace-nowrap rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-zinc-950 transition hover:bg-white/90"
      >
        Use this theme
      </Link>
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit preview"
        className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ShopShell({
  slug,
  children,
}: {
  slug: string;
  children: ReactNode;
}) {
  const shopQ = useShop(slug);
  const tenant = shopQ.data ?? null;
  const appName = useAppName();
  const { preview, exit } = useThemePreview(slug);

  const theme = parseThemeSettings(tenant?.themeSettings ?? null);
  const themeId: StoreThemeId = preview ?? theme.storeTheme ?? "classic";
  const meta = storeThemeMeta(themeId);
  const brand =
    parseHexColor(theme.primaryColor) ??
    parseHexColor(theme.accentColor) ??
    meta.defaultBrand;
  const accent = theme.primaryColor || theme.accentColor;
  const logo = theme.logoRectUrl || theme.logoUrl;
  const themed = themeId !== "classic";
  const loading = shopQ.isLoading;

  return (
    <StoreThemeProvider value={{ id: themeId, brand }}>
      <div
        data-shell="shop"
        data-store-theme={themeId}
        style={storeBrandVars(brand) as CSSProperties}
        className={`flex min-h-screen flex-col bg-background text-foreground ${
          themed ? "overflow-x-clip font-sans" : ""
        }`}
      >
        <ShopFavicon href={theme.logoUrl ?? null} />
        {theme.tickerEnabled && theme.tickerText && (
          <SiteTicker
            text={theme.tickerText}
            speed={theme.tickerSpeed ?? 12}
            backgroundColor={theme.tickerBg || "#111111"}
            textColor={theme.tickerColor || "#ffffff"}
            storageKey={`shop-ticker-${slug}`}
          />
        )}
        {loading ? (
          <div className="h-16 border-b border-border bg-card" aria-hidden />
        ) : (
          <ShopNav
            tenant={tenant}
            slug={slug}
            themeId={themeId}
            container={meta.container}
            onOpenFilters={() =>
              useUiStore.getState().setShopFilterDrawerOpen(true)
            }
          />
        )}
        <main
          className={`mx-auto w-full ${meta.container} flex-1 px-token-4 pb-16 pt-token-8 sm:px-token-6`}
        >
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
            tone={FOOTER_TONE[themeId]}
            container={meta.container}
          />
        ) : loading ? null : (
          <footer className="mt-auto border-t border-border px-token-6 py-token-6 text-sm text-muted-foreground">
            <Link href={`/shops/${slug}`}>Shop</Link>
          </footer>
        )}
        <ChatWidgets
          whatsappUrl={theme.whatsappUrl}
          chatbotHtml={theme.chatbotHtml}
        />
        {preview ? <PreviewBar themeId={preview} onExit={exit} /> : null}
      </div>
    </StoreThemeProvider>
  );
}
