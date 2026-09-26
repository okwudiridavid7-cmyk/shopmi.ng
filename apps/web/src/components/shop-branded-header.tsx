"use client";

import Link from "next/link";
import type { TenantPublic } from "@vendors/shared-types";
import {
  VerifiedBadge,
  UnverifiedShopBanner,
} from "@/components/shell/trust-badge";
import { ShopLogoFallback } from "@/components/shop-logo-fallback";
import { Button } from "@/components/ui/button";
import {
  brandButtonTextColor,
  parseHexColor,
  parseThemeSettings,
} from "@/lib/theme";

/**
 * Shop page header — brand color on the bar only.
 * Page background and body text use platform neutrals.
 */
export function ShopBrandedHeader({
  tenant,
  cartHref,
}: {
  tenant: TenantPublic;
  cartHref?: string;
}) {
  const theme = parseThemeSettings(tenant.themeSettings);
  const primary =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);
  const textColor = brandButtonTextColor(primary);

  return (
    <header
      className="overflow-hidden rounded-lg border border-border shadow-sm"
      data-shop-branded-header
    >
      <div
        className="flex flex-wrap items-center justify-between gap-token-4 px-token-5 py-token-5"
        style={
          primary
            ? { backgroundColor: primary, color: textColor }
            : {
                backgroundColor: "var(--color-card)",
                color: "var(--color-foreground)",
              }
        }
      >
        <div className="flex min-w-0 items-center gap-token-3">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.logoUrl}
              alt=""
              className="h-14 w-14 rounded-md border border-white/20 object-cover"
            />
          ) : (
            <ShopLogoFallback size="lg" />
          )}
          <div className="min-w-0 space-y-token-1">
            <p className="text-xs uppercase tracking-[0.18em] opacity-80">
              Shop
            </p>
            <h1 className="flex items-center gap-1.5 font-display text-2xl tracking-tight md:text-3xl">
              <span>{tenant.name}</span>
              {tenant.verifiedBadge && <VerifiedBadge size="sm" />}
            </h1>
          </div>
        </div>
        {cartHref && (
          <Link href={cartHref}>
            <Button
              size="sm"
              variant="secondary"
              style={
                primary
                  ? {
                      backgroundColor:
                        "color-mix(in srgb, #fff 92%, transparent)",
                      color: primary,
                    }
                  : undefined
              }
            >
              View cart
            </Button>
          </Link>
        )}
      </div>
      <div className="space-y-token-3 bg-background px-token-5 py-token-4">
        {!tenant.verifiedBadge && (
          <UnverifiedShopBanner
            shopName={tenant.name}
            storageKey={`unverified-banner:${tenant.slug}`}
          />
        )}
        {tenant.location && (
          <p className="text-sm text-muted-foreground">{tenant.location}</p>
        )}
      </div>
    </header>
  );
}
