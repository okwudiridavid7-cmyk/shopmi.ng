"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  Minus,
  Plus,
  RotateCcw,
  Shield,
  Star,
  Truck,
} from "lucide-react";
import type {
  ProductPublic,
  SellerTrustPublic,
  TenantPublic,
} from "@vendors/shared-types";
import { AutoScrollCarousel } from "@/components/auto-scroll-carousel";
import { ProductCard } from "@/components/product-card";
import { ProductReviews } from "@/components/product-reviews";
import { SectionHeader } from "@/components/section-header";
import { ShareButton } from "@/components/share-button";
import { UnverifiedBanner } from "@/components/shop-trust";
import { ShopLogoFallback } from "@/components/shop-logo-fallback";
import { VerifiedBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { SkeletonLines } from "@/components/skeleton";
import { ProductGallery } from "@/components/product-gallery";
import { apiFetch, formatMoney, isAuthError, productImageUrls } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useUiStore } from "@/stores/ui";
import { useAuth } from "@/hooks/use-auth";
import { useFavoriteIds, useToggleFavorite } from "@/hooks/use-catalog";
import {
  brandButtonTextColor,
  parseHexColor,
  parseThemeSettings,
} from "@/lib/theme";

export function ProductDetailClient({
  slug,
  id,
}: {
  slug: string;
  id: string;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const setCartDrawerOpen = useUiStore((s) => s.setCartDrawerOpen);
  const { isAuthenticated } = useAuth();
  const favorites = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();

  const [product, setProduct] = useState<ProductPublic | null>(null);
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [trust, setTrust] = useState<SellerTrustPublic | null>(null);
  const [moreFromSeller, setMoreFromSeller] = useState<ProductPublic[]>([]);
  const [related, setRelated] = useState<ProductPublic[]>([]);
  const [qty, setQty] = useState(1);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [prod, shop] = await Promise.all([
          apiFetch<{ product: ProductPublic }>(
            `/api/shops/${slug}/products/${id}`
          ),
          apiFetch<{ tenant: TenantPublic }>(`/api/shops/${slug}`),
        ]);
        if (cancelled) return;
        setProduct(prod.product);
        setTenant(shop.tenant);

        const trustRes = await apiFetch<{ trust: SellerTrustPublic }>(
          `/api/shops/${slug}/trust`
        ).catch(() => null);
        if (!cancelled && trustRes?.trust) {
          setTrust(trustRes.trust);
        }

        const relatedRes = await apiFetch<{ products: ProductPublic[] }>(
          `/api/shops/${slug}/products/${id}/related`
        ).catch(() => null);

        const moreRes = await apiFetch<{
          products: ProductPublic[];
        }>(`/api/shops/${slug}/products?limit=12&page=1`).catch(() => null);

        if (cancelled) return;

        const shopProducts = (moreRes?.products ?? []).filter(
          (p) => p.id !== id
        );
        setMoreFromSeller(shopProducts.slice(0, 8));

        if (relatedRes?.products?.length) {
          setRelated(relatedRes.products.filter((p) => p.id !== id).slice(0, 8));
        } else if (prod.product.category?.slug) {
          const catRes = await apiFetch<{ products: ProductPublic[] }>(
            `/api/catalog/products?category=${encodeURIComponent(prod.product.category.slug)}&limit=12`
          ).catch(() => null);
          if (!cancelled) {
            setRelated(
              (catRes?.products ?? [])
                .filter((p) => p.id !== id)
                .slice(0, 8)
            );
          }
        } else {
          setRelated(shopProducts.slice(0, 8));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [slug, id]);

  const theme = parseThemeSettings(tenant?.themeSettings);
  const brand =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);
  const ctaText = brandButtonTextColor(brand);
  const favorited = product
    ? (favorites.data?.has(product.id) ?? false)
    : false;

  async function addToCart(openDrawer = true) {
    if (!product) return;
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/carts/${slug}/items`, {
        method: "POST",
        body: JSON.stringify({ productId: product.id, qty }),
      });
      await qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
      if (openDrawer) {
        setMessage("Added to cart");
        setCartDrawerOpen(true);
      }
    } catch (err) {
      if (isAuthError(err)) return;
      setError(err instanceof Error ? err.message : "Could not add to cart");
      throw err;
    } finally {
      setBusy(false);
    }
  }

  async function buyNow() {
    try {
      await addToCart(false);
      router.push(`/cart?shop=${encodeURIComponent(slug)}`);
    } catch {
      /* error already set */
    }
  }

  async function onFavorite() {
    if (!product) return;
    if (!isAuthenticated) {
      window.location.href = `/login?next=${encodeURIComponent(`/shops/${slug}/products/${id}`)}`;
      return;
    }
    try {
      await toggleFavorite.mutateAsync({
        productId: product.id,
        favorited,
      });
      setMessage(favorited ? "Removed from favorites" : "Saved to favorites");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Favorite failed");
    }
  }

  if (error && !product) {
    return <p className="text-danger">{error}</p>;
  }
  if (!product) {
    return <SkeletonLines count={4} />;
  }

  const gallery = productImageUrls(product.images ?? []);
  const onSale =
    product.compareAtPrice != null &&
    product.compareAtPrice > product.price &&
    product.price > 0;
  const maxQty = Math.max(1, product.stockQty);
  const showProductRating =
    (product.reviewCount ?? 0) > 0 && product.avgRating != null;

  const trustCard = trust ?? null;
  const showSales = trustCard != null && trustCard.salesCount > 0;
  const showTrustRating =
    trustCard != null &&
    trustCard.reviewCount > 0 &&
    trustCard.avgRating != null;

  const wishlistOverlay = (
    <button
      type="button"
      disabled={toggleFavorite.isPending}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onFavorite();
      }}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      className="rounded-full border border-border bg-card/95 p-token-2 text-muted-foreground shadow-sm backdrop-blur transition hover:bg-card hover:text-danger disabled:opacity-50"
    >
      <Heart
        className={`h-5 w-5 ${favorited ? "fill-danger text-danger" : ""}`}
        aria-hidden
      />
    </button>
  );

  return (
    <div className="space-y-token-8">
      {tenant && !tenant.verifiedBadge && (
        <UnverifiedBanner shopName={tenant.name} />
      )}

      <div className="grid gap-token-8 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)_minmax(16rem,0.9fr)] lg:grid-cols-2">
        <ProductGallery
          images={gallery}
          title={product.title}
          overlay={wishlistOverlay}
        />

        <div className="space-y-token-5">
          <div className="space-y-token-2">
            <h1 className="font-display text-3xl text-foreground">
              {product.title}
            </h1>
            {showProductRating && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Star
                  className="h-4 w-4 fill-warning text-warning"
                  aria-hidden
                />
                <span className="font-medium text-foreground">
                  {product.avgRating!.toFixed(1)}
                </span>
                <span>({product.reviewCount})</span>
              </p>
            )}
            <div className="flex flex-wrap items-baseline gap-token-2">
              <p
                className="text-2xl font-semibold text-accent"
                style={brand ? { color: brand } : undefined}
              >
                {formatMoney(product.price, product.currency)}
              </p>
              {onSale && (
                <p className="text-base text-muted-foreground line-through">
                  {formatMoney(product.compareAtPrice!, product.currency)}
                </p>
              )}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {product.stockQty > 0
              ? `In stock (${product.stockQty})`
              : "Out of stock"}
            {product.location ? ` · ${product.location}` : ""}
          </p>

          <div className="flex flex-wrap items-center gap-token-3">
            <div className="inline-flex items-center rounded-md border border-border bg-card">
              <button
                type="button"
                aria-label="Decrease quantity"
                disabled={qty <= 1}
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="px-token-3 py-token-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="min-w-[2.5rem] text-center text-sm font-medium tabular-nums">
                {qty}
              </span>
              <button
                type="button"
                aria-label="Increase quantity"
                disabled={qty >= maxQty}
                onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                className="px-token-3 py-token-2 text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-token-3">
            <Button
              type="button"
              disabled={busy || product.stockQty < 1}
              onClick={() => void addToCart(true)}
              className="min-w-[8.5rem]"
              style={
                brand
                  ? { backgroundColor: brand, color: ctaText }
                  : undefined
              }
            >
              Add to Cart
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || product.stockQty < 1}
              onClick={() => void buyNow()}
              className="min-w-[8.5rem] border-accent text-accent hover:bg-accent-soft"
              style={
                brand
                  ? { borderColor: brand, color: brand }
                  : undefined
              }
            >
              Buy Now
            </Button>
            <ShareButton
              title={product.title}
              text={product.title}
              onShared={(r) =>
                setMessage(r === "shared" ? "Shared" : "Link copied")
              }
            />
          </div>

          {message && <p className="text-sm text-accent">{message}</p>}
          {error && <p className="text-sm text-danger">{error}</p>}
        </div>

        <aside className="space-y-token-4 lg:col-span-2 xl:col-span-1">
          <Card>
            <CardBody className="space-y-token-3">
              <p className="text-sm font-semibold text-foreground">
                Delivery & Returns
              </p>
              <ul className="space-y-token-3 text-sm text-muted-foreground">
                <li className="flex gap-token-3">
                  <Truck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>
                    Delivery options vary by seller location. Check with the
                    shop for timelines.
                  </span>
                </li>
                <li className="flex gap-token-3">
                  <RotateCcw className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>
                    Returns accepted per the seller’s policy — contact the shop
                    within a reasonable window after delivery.
                  </span>
                </li>
                <li className="flex gap-token-3">
                  <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                  <span>
                    Secure checkout through the marketplace. Prefer verified
                    shops when possible.
                  </span>
                </li>
              </ul>
            </CardBody>
          </Card>

          {(trustCard || tenant) && (
            <Card>
              <CardBody className="space-y-token-4">
                <div className="flex flex-wrap items-start justify-between gap-token-3">
                  <p className="text-sm font-semibold text-foreground">
                    Seller information
                  </p>
                  <Link
                    href={`/shops/${slug}`}
                    className="text-sm font-medium text-accent transition hover:text-accent-deep dark:text-accent-on-dark"
                  >
                    View Store
                  </Link>
                </div>
                <div className="flex min-w-0 items-start gap-token-3">
                  {trustCard?.logoUrl || theme.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={trustCard?.logoUrl || theme.logoUrl || ""}
                      alt=""
                      className="h-12 w-12 rounded-md border border-border object-cover"
                    />
                  ) : (
                    <ShopLogoFallback size="lg" />
                  )}
                  <div className="min-w-0 space-y-token-1">
                    <div className="flex flex-wrap items-center gap-token-2">
                      <Link
                        href={`/shops/${slug}`}
                        className="font-medium text-foreground transition hover:text-accent"
                      >
                        {trustCard?.shopName ?? tenant?.name}
                      </Link>
                      {(trustCard?.verifiedBadge ?? tenant?.verifiedBadge) && (
                        <VerifiedBadge size="sm" />
                      )}
                    </div>
                    {(() => {
                      const meta = [
                        trustCard && trustCard.yearsOnPlatform > 0
                          ? `${trustCard.yearsOnPlatform}+ year${
                              trustCard.yearsOnPlatform === 1 ? "" : "s"
                            } on platform`
                          : null,
                        showSales
                          ? `${trustCard!.salesCount.toLocaleString()} sales`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ");
                      if (meta) {
                        return (
                          <p className="text-xs text-muted-foreground">{meta}</p>
                        );
                      }
                      if (trustCard && trustCard.salesCount === 0) {
                        return (
                          <p className="text-xs text-muted-foreground">New</p>
                        );
                      }
                      return null;
                    })()}
                    {showTrustRating && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star
                          className="h-3.5 w-3.5 fill-warning text-warning"
                          aria-hidden
                        />
                        <span className="font-medium text-foreground">
                          {trustCard!.avgRating!.toFixed(1)}
                        </span>
                        <span>({trustCard!.reviewCount})</span>
                      </p>
                    )}
                  </div>
                </div>
                {(trustCard?.qualityPercent != null ||
                  trustCard?.deliveryPercent != null) && (
                  <div className="space-y-token-3 border-t border-border pt-token-3">
                    {trustCard.qualityPercent != null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Quality</span>
                          <span className="font-medium text-foreground">
                            {trustCard.qualityPercent}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-success"
                            style={{ width: `${trustCard.qualityPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                    {trustCard.deliveryPercent != null && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Delivery</span>
                          <span className="font-medium text-foreground">
                            {trustCard.deliveryPercent}%
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-accent"
                            style={{ width: `${trustCard.deliveryPercent}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </CardBody>
            </Card>
          )}
        </aside>
      </div>

      {product.description?.trim() && (
        <section className="space-y-token-3 border-t border-border pt-token-6">
          <SectionHeader title="Description" />
          <p className="whitespace-pre-wrap text-muted-foreground">
            {product.description}
          </p>
        </section>
      )}

      <ProductReviews slug={slug} productId={id} />

      {moreFromSeller.length > 0 && (
        <section className="space-y-token-4 border-t border-border pt-token-6">
          <SectionHeader
            title="More from this seller"
            description="Other listings from the same shop."
          />
          <AutoScrollCarousel threshold={4} itemClassName="w-56 shrink-0 sm:w-64">
            {moreFromSeller.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </AutoScrollCarousel>
        </section>
      )}

      {related.length > 0 && (
        <section className="space-y-token-4 border-t border-border pt-token-6">
          <SectionHeader
            title="Related products"
            description="You might also like these."
          />
          <AutoScrollCarousel threshold={4} itemClassName="w-56 shrink-0 sm:w-64">
            {related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </AutoScrollCarousel>
        </section>
      )}
    </div>
  );
}
