import Link from "next/link";
import { VerifiedBadge } from "@/components/shell/trust-badge";
import { ShopLogoFallback } from "@/components/shop-logo-fallback";
import { parseHexColor, parseThemeSettings } from "@/lib/theme";

export type ShopCardShop = {
  id: string;
  name: string;
  slug: string;
  verifiedBadge: boolean;
  productCount?: number;
  themeSettings?: unknown;
};

/** Shop discovery card for marketplace listings. */
export function ShopCard({ shop }: { shop: ShopCardShop }) {
  const theme = parseThemeSettings(shop.themeSettings);
  const accent =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);

  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="group block w-52 shrink-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm transition motion-safe:duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md"
    >
      <div
        className={`h-1.5 w-full ${accent ? "" : "bg-muted"}`}
        style={accent ? { backgroundColor: accent } : undefined}
      />
      <div className="space-y-token-3 p-token-5">
        <div className="flex items-center gap-token-3">
          {theme.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={theme.logoUrl}
              alt=""
              className="h-10 w-10 rounded-md border border-border bg-muted object-cover"
            />
          ) : (
            <ShopLogoFallback />
          )}
          <div className="min-w-0">
            <p className="flex items-center gap-1 truncate text-sm font-semibold text-foreground">
              <span className="truncate">{shop.name}</span>
              {shop.verifiedBadge && <VerifiedBadge size="sm" />}
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {(shop.productCount ?? 0) > 0
            ? `${shop.productCount} items`
            : "Browse shop"}
        </p>
      </div>
    </Link>
  );
}
