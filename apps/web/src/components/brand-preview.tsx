"use client";

import type { ShopThemeSettings } from "@vendors/shared-types";
import { ProductCard } from "@/components/product-card";
import { brandButtonTextColor, parseHexColor } from "@/lib/theme";

export type BrandPreviewProps = {
  shopName: string;
  theme: Pick<
    ShopThemeSettings,
    "logoUrl" | "logoRectUrl" | "primaryColor" | "accentColor"
  >;
  /** Optional sample product for the card preview. */
  sampleProduct?: {
    title: string;
    price: number;
    currency?: string;
    imageUrl?: string | null;
  };
  className?: string;
};

/**
 * Live mini storefront preview — constrained brand application only:
 * shop header bar, CTAs, accent accents. Page bg / body text stay neutral.
 */
export function BrandPreview({
  shopName,
  theme,
  sampleProduct,
  className = "",
}: BrandPreviewProps) {
  const primary =
    parseHexColor(theme.primaryColor) ??
    parseHexColor(theme.accentColor) ??
    null;
  const accent = parseHexColor(theme.accentColor) ?? primary;
  const ctaText = brandButtonTextColor(primary);
  const product = sampleProduct ?? {
    title: "Sample product",
    price: 24900,
    currency: "NGN",
    imageUrl: null,
  };
  const hasRect = !!theme.logoRectUrl;
  const hasSquare = !!theme.logoUrl;

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border bg-background shadow-sm ${className}`}
      data-brand-preview
    >
      <header
        className="flex items-center justify-between gap-token-3 px-token-4 py-token-3 text-sm"
        style={
          primary
            ? { backgroundColor: primary, color: brandButtonTextColor(primary) }
            : {
                backgroundColor: "var(--color-card)",
                color: "var(--color-foreground)",
                borderBottom: "1px solid var(--color-border)",
              }
        }
      >
        <div className="flex min-w-0 items-center gap-token-2">
          {hasRect ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.logoRectUrl!}
              alt=""
              className="h-8 max-w-[9rem] object-contain"
            />
          ) : hasSquare ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.logoUrl!}
              alt=""
              className="h-8 w-8 rounded-md object-cover"
            />
          ) : (
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-xs font-semibold"
              style={{
                backgroundColor: primary
                  ? "color-mix(in srgb, #fff 22%, transparent)"
                  : "var(--color-muted)",
              }}
              aria-hidden
            >
              {shopName.slice(0, 2).toUpperCase()}
            </span>
          )}
          {!hasRect && (
            <span className="truncate font-display text-base">{shopName}</span>
          )}
        </div>
        <span className="shrink-0 text-xs opacity-80">Shop</span>
      </header>

      <div className="space-y-token-4 bg-background p-token-4">
        <div className="flex items-center gap-token-2 text-xs">
          <span className="rounded-sm border border-border bg-muted px-token-2 py-0.5 font-medium text-foreground">
            Featured
          </span>
          <span className="text-muted-foreground">
            Neutral body text stays readable
          </span>
        </div>

        <div className="max-w-[14rem]">
          <ProductCard
            href="#"
            title={product.title}
            price={product.price}
            currency={product.currency}
            imageUrl={product.imageUrl}
            shopName={shopName}
            className="pointer-events-none"
          />
        </div>

        <div
          className="h-px w-full"
          style={{
            backgroundColor: accent
              ? `color-mix(in srgb, ${accent} 45%, transparent)`
              : "var(--color-border)",
          }}
        />

        <div className="flex flex-wrap gap-token-2">
          <button
            type="button"
            className="rounded-md px-token-4 py-token-2 text-sm font-medium shadow-sm"
            style={
              primary
                ? { backgroundColor: primary, color: ctaText }
                : {
                    backgroundColor: "var(--color-accent)",
                    color: "var(--color-accent-foreground)",
                  }
            }
          >
            Add to Cart
          </button>
          <button
            type="button"
            className="rounded-md border px-token-4 py-token-2 text-sm font-medium"
            style={
              accent
                ? { borderColor: accent, color: accent }
                : {
                    borderColor: "var(--color-border)",
                    color: "var(--color-foreground)",
                  }
            }
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
}
