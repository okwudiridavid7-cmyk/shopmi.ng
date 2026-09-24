"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { SiteHeader, MobileMarketplaceSearch } from "./site-header";
import { PlatformFooter } from "./footers";
import { FaviconSync } from "@/components/favicon-sync";
import { SiteTicker } from "@/components/site-ticker";
import { ChatWidgets } from "@/components/chat-widgets";
import { usePlatformBranding } from "@/hooks/use-branding";

function dashboardMode(pathname: string): "buyer" | "seller" | "admin" | null {
  if (pathname.startsWith("/seller")) return "seller";
  if (pathname.startsWith("/buyer")) return "buyer";
  if (pathname.startsWith("/admin")) return "admin";
  return null;
}

const AUTH_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
];

/** Marketplace / auth / dashboard shell — never used for shop storefronts. */
export function PlatformShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const mode = dashboardMode(pathname);
  const isDashboard = mode != null;
  const isAuth = AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
  const isHome = pathname === "/";
  const isMarketing =
    isHome ||
    pathname === "/about" ||
    pathname === "/contact" ||
    pathname === "/privacy" ||
    pathname === "/terms" ||
    pathname === "/faq" ||
    pathname === "/support";
  const branding = usePlatformBranding().data;
  const ticker = branding?.ticker;

  if (isAuth) {
    return (
      <div data-shell="auth" className="min-h-screen">
        <FaviconSync />
        {children}
      </div>
    );
  }

  return (
    <div
      data-shell={mode ?? "platform"}
      className="flex min-h-screen flex-col"
    >
      <FaviconSync />
      {ticker?.enabled && ticker.text && (
        <SiteTicker
          text={ticker.text}
          speed={ticker.speed}
          backgroundColor={ticker.backgroundColor}
          textColor={ticker.textColor}
          storageKey="platform-ticker"
        />
      )}
      <SiteHeader />
      {isHome && <MobileMarketplaceSearch />}
      {isDashboard ? (
        children
      ) : isMarketing ? (
        <main className="w-full flex-1 motion-safe:animate-page-enter">
          {children}
        </main>
      ) : (
        <main className="mx-auto w-full max-w-6xl flex-1 px-token-6 py-token-8 motion-safe:animate-page-enter">
          {children}
        </main>
      )}
      {!isDashboard && <PlatformFooter />}
      <ChatWidgets
        whatsappUrl={branding?.whatsappUrl}
        chatbotHtml={branding?.chatbotHtml}
      />
    </div>
  );
}
