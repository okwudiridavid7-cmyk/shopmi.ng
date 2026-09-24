"use client";

import Link from "next/link";
import { Heart, ShoppingCart, Star } from "lucide-react";
import type { ProductPublic } from "@vendors/shared-types";
import { VerifiedBadge } from "@/components/shell/trust-badge";
import { formatMoney, productImageUrl } from "@/lib/api";

const NEW_BADGE_DAYS = 30;

export type ProductCardProps = {
  href: string;
  imageUrl?: string | null;
  title: string;
  price: number;
  compareAtPrice?: number | null;
  currency?: string;
  shopName?: string | null;
  shopVerified?: boolean | null;
  reviewCount?: number;
  avgRating?: number | null;
  /** ISO date — used for neutral “New” badge when not on sale. */
  createdAt?: string | null;
  favorited?: boolean;
  onFavoriteToggle?: () => void;
  favoriteBusy?: boolean;
  onAddToCart?: () => void;
  addToCartBusy?: boolean;
  className?: string;
};

function isRecentProduct(createdAt?: string | null): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= NEW_BADGE_DAYS * 86_400_000;
}

/**
 * Product card — image, title, prominent price, muted meta.
 * Max one priority badge (discount % wins; else “New”). Stars only when reviewCount > 0.
 */
export function ProductCard(
  props:
    | ProductCardProps
    | {
        product: ProductPublic;
        favorited?: boolean;
        onFavoriteToggle?: () => void;
        favoriteBusy?: boolean;
        onAddToCart?: () => void;
        addToCartBusy?: boolean;
        className?: string;
      }
) {
  if ("product" in props) {
    return (
      <ProductCardFromProduct
        product={props.product}
        favorited={props.favorited}
        onFavoriteToggle={props.onFavoriteToggle}
        favoriteBusy={props.favoriteBusy}
        onAddToCart={props.onAddToCart}
        addToCartBusy={props.addToCartBusy}
        className={props.className}
      />
    );
  }
  return <ProductCardView {...props} />;
}

function ProductCardView({
  href,
  imageUrl,
  title,
  price,
  compareAtPrice,
  currency = "NGN",
  shopName,
  shopVerified,
  reviewCount = 0,
  avgRating,
  createdAt,
  favorited,
  onFavoriteToggle,
  favoriteBusy,
  onAddToCart,
  addToCartBusy,
  className = "",
}: ProductCardProps) {
  const onSale =
    compareAtPrice != null && compareAtPrice > price && price > 0;
  const pctOff = onSale
    ? Math.round(((compareAtPrice! - price) / compareAtPrice!) * 100)
    : 0;
  const showRating = reviewCount > 0 && avgRating != null;
  /** Discount wins; otherwise one neutral “New” badge — never stack. */
  const priorityBadge =
    onSale && pctOff > 0
      ? ({ kind: "discount" as const, label: `−${pctOff}%` })
      : isRecentProduct(createdAt)
        ? ({ kind: "new" as const, label: "New" })
        : null;

  return (
    <article
      className={`group relative overflow-hidden rounded-lg border border-border bg-card shadow-sm transition motion-safe:duration-200 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-md ${className}`}
    >
      <Link href={href} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageUrl}
              alt={title}
              className="h-full w-full object-cover motion-safe:transition motion-safe:duration-300 motion-safe:group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No image
            </div>
          )}
          {priorityBadge?.kind === "discount" && (
            <span className="absolute left-token-3 top-token-3 rounded-md bg-accent px-token-2 py-0.5 text-xs font-semibold text-accent-foreground shadow-sm">
              {priorityBadge.label}
            </span>
          )}
          {priorityBadge?.kind === "new" && (
            <span className="absolute left-token-3 top-token-3 rounded-md border border-border bg-card/95 px-token-2 py-0.5 text-xs font-semibold text-foreground shadow-sm backdrop-blur">
              {priorityBadge.label}
            </span>
          )}
        </div>
        <div className="space-y-token-2 p-token-4 sm:p-token-5">
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-card-foreground">
            {title}
          </h3>
          <div className="flex flex-wrap items-baseline gap-token-2">
            <p className="text-base font-semibold text-accent">
              {formatMoney(price, currency)}
            </p>
            {onSale && (
              <p className="text-sm text-muted-foreground line-through">
                {formatMoney(compareAtPrice!, currency)}
              </p>
            )}
          </div>
          {shopName ? (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="truncate">{shopName}</span>
              {shopVerified && <VerifiedBadge size="sm" />}
            </p>
          ) : null}
          {showRating && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star
                className="h-3.5 w-3.5 fill-warning text-warning"
                aria-hidden
              />
              <span className="font-medium text-foreground">
                {avgRating!.toFixed(1)}
              </span>
              <span>({reviewCount})</span>
            </p>
          )}
        </div>
      </Link>
      {onFavoriteToggle && (
        <button
          type="button"
          disabled={favoriteBusy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onFavoriteToggle();
          }}
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          aria-pressed={!!favorited}
          className="absolute right-token-3 top-token-3 rounded-full border border-border bg-card/95 p-token-2 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-card hover:text-danger disabled:opacity-50 motion-safe:active:scale-95"
        >
          <Heart
            className={`h-4 w-4 ${favorited ? "fill-danger text-danger" : ""}`}
            aria-hidden
          />
        </button>
      )}
      {onAddToCart && (
        <button
          type="button"
          disabled={addToCartBusy}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onAddToCart();
          }}
          aria-label="Add to cart"
          className="absolute bottom-[5.5rem] right-token-3 rounded-full border border-border bg-card/95 p-token-2 text-foreground shadow-sm opacity-100 transition hover:bg-accent hover:text-accent-foreground disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
        >
          <ShoppingCart className="h-4 w-4" aria-hidden />
        </button>
      )}
    </article>
  );
}

export function ProductCardFromProduct({
  product,
  favorited,
  onFavoriteToggle,
  favoriteBusy,
  onAddToCart,
  addToCartBusy,
  className,
}: {
  product: ProductPublic;
  favorited?: boolean;
  onFavoriteToggle?: () => void;
  favoriteBusy?: boolean;
  onAddToCart?: () => void;
  addToCartBusy?: boolean;
  className?: string;
}) {
  const href = product.tenant
    ? `/shops/${product.tenant.slug}/products/${product.id}`
    : `/catalog/${product.id}`;
  return (
    <ProductCardView
      href={href}
      imageUrl={productImageUrl(product.images)}
      title={product.title}
      price={product.price}
      compareAtPrice={product.compareAtPrice}
      currency={product.currency}
      shopName={
        product.tenant?.name
          ? `${product.tenant.name}${product.location ? ` · ${product.location}` : ""}`
          : product.location
      }
      shopVerified={product.tenant?.verifiedBadge ?? false}
      reviewCount={product.reviewCount ?? 0}
      avgRating={product.avgRating}
      createdAt={product.createdAt}
      favorited={favorited}
      onFavoriteToggle={onFavoriteToggle}
      favoriteBusy={favoriteBusy}
      onAddToCart={onAddToCart}
      addToCartBusy={addToCartBusy}
      className={className}
    />
  );
}
