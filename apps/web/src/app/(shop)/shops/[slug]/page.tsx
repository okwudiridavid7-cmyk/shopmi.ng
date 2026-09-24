"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type {
  ProductPublic,
  ShopBannerPublic,
  ShopCategoryPublic,
} from "@vendors/shared-types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { BannerCarousel } from "@/components/banner-carousel";
import { AutoScrollCarousel } from "@/components/auto-scroll-carousel";
import { CampaignPopup } from "@/components/campaign-popup";
import { SectionHeader } from "@/components/section-header";
import { ShopEntryTransition } from "@/components/shop-swipe";
import { EmptyState } from "@/components/empty-state";
import { ProductCardSkeleton, SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import {
  FilterDrawer,
  FilterPanel,
} from "@/components/marketplace-filters";
import {
  useCatalogMeta,
  useFavoriteIds,
  useShop,
  useShopProductIndex,
  useShopProducts,
  useShops,
  useToggleFavorite,
} from "@/hooks/use-catalog";
import { useAuth } from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api";
import {
  DEFAULT_SHOP_BANNER,
  toBannerSlides,
} from "@/lib/default-banners";
import { parseHexColor, parseThemeSettings } from "@/lib/theme";
import { useUiStore, type MarketplaceFilters } from "@/stores/ui";
import { queryKeys } from "@/lib/query-keys";

const emptyFilters: MarketplaceFilters = {
  category: "",
  shopCategory: "",
  brand: "",
  location: "",
  countryCode: "",
  stateCode: "",
  minPrice: "",
  maxPrice: "",
  q: "",
  sort: "relevance",
};

function useShopBanners(slug: string) {
  return useQuery({
    queryKey: ["shops", slug, "banners"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ banners: ShopBannerPublic[] }>(
        `/api/shops/${slug}/banners`
      );
      return res.banners;
    },
    enabled: !!slug,
  });
}

function useShopCategories(slug: string) {
  return useQuery({
    queryKey: ["shops", slug, "shop-categories"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ categories: ShopCategoryPublic[] }>(
        `/api/shops/${slug}/shop-categories`
      );
      return res.categories;
    },
    enabled: !!slug,
  });
}

function ProductRow({
  products,
  favSet,
  isAuthenticated,
  slug,
  toggleFavorite,
  busy,
  onAddToCart,
}: {
  products: ProductPublic[];
  favSet: Set<string>;
  isAuthenticated: boolean;
  slug: string;
  toggleFavorite: ReturnType<typeof useToggleFavorite>;
  busy: boolean;
  onAddToCart: (productId: string) => void;
}) {
  const cards = products.map((p) => {
    const favorited = favSet.has(p.id);
    return (
      <ProductCard
        key={p.id}
        product={p}
        favorited={favorited}
        favoriteBusy={busy}
        onFavoriteToggle={
          isAuthenticated
            ? () => toggleFavorite.mutate({ productId: p.id, favorited })
            : () => {
                window.location.href = `/login?returnTo=${encodeURIComponent(`/shops/${slug}`)}`;
              }
        }
        onAddToCart={() => onAddToCart(p.id)}
      />
    );
  });

  return (
    <AutoScrollCarousel itemClassName="w-[min(100%,15rem)] shrink-0 sm:w-60">
      {cards}
    </AutoScrollCarousel>
  );
}

export default function ShopPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;
  const searchParams = useSearchParams();
  const qc = useQueryClient();
  const [filters, setFilters] = useState<MarketplaceFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const drawerOpen = useUiStore((s) => s.shopFilterDrawerOpen);
  const setDrawerOpen = useUiStore((s) => s.setShopFilterDrawerOpen);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    setFilters((f) => (f.q === q ? f : { ...f, q }));
  }, [searchParams]);

  const shopQ = useShop(slug);
  const peersQ = useShops(12);
  const meta = useCatalogMeta();
  const productsQ = useShopProducts(slug, filters, page, 24);
  const indexQ = useShopProductIndex(slug);
  const bannersQ = useShopBanners(slug);
  const shopCatsQ = useShopCategories(slug);
  const favorites = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const { isAuthenticated } = useAuth();

  const tenant = shopQ.data;
  const products = productsQ.data?.products ?? [];
  const pagination = productsQ.data?.pagination;

  async function addToCart(productId: string) {
    await apiFetch(`/api/carts/${slug}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, qty: 1 }),
    });
    await qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
    useUiStore.getState().setCartDrawerOpen(true);
  }
  const allActive = indexQ.data ?? [];
  const favSet = favorites.data ?? new Set<string>();
  const shopCategories = shopCatsQ.data ?? [];

  const theme = parseThemeSettings(tenant?.themeSettings);
  const brand =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);

  const bannerSlides = useMemo(() => {
    const active = (bannersQ.data ?? []).filter((b) => b.active);
    if (active.length === 0) {
      return toBannerSlides([
        {
          id: "default",
          ...DEFAULT_SHOP_BANNER,
          title: tenant ? `${tenant.name}` : DEFAULT_SHOP_BANNER.title,
          ctaUrl: "#products",
        },
      ]);
    }
    return toBannerSlides(active);
  }, [bannersQ.data, tenant]);

  const promoProducts = useMemo(() => {
    if (!theme.promoProductsEnabled) return [];
    return allActive.filter(
      (p) =>
        p.compareAtPrice != null &&
        p.compareAtPrice > p.price &&
        p.stockQty > 0
    );
  }, [allActive, theme.promoProductsEnabled]);

  const newArrivals = useMemo(() => {
    if (!theme.newArrivalsEnabled) return [];
    const days = theme.newArrivalsDays ?? 30;
    const since = Date.now() - days * 86_400_000;
    const recent = allActive.filter(
      (p) => new Date(p.createdAt).getTime() >= since
    );
    if (recent.length > 0) return recent.slice(0, 12);
    return [...allActive]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      .slice(0, 8);
  }, [allActive, theme.newArrivalsEnabled, theme.newArrivalsDays]);

  const categorySections = useMemo(() => {
    if (shopCategories.length === 0) return [];
    return shopCategories
      .map((cat) => ({
        category: cat,
        products: allActive.filter((p) => p.shopCategoryId === cat.id),
      }))
      .filter((s) => s.products.length > 0);
  }, [shopCategories, allActive]);

  const hasShopCategoryFilter = !!filters.shopCategory;
  const showCategorySections =
    !hasShopCategoryFilter &&
    categorySections.length > 0 &&
    !filters.brand &&
    !filters.q &&
    !filters.minPrice &&
    !filters.maxPrice;

  function setFilter<K extends keyof MarketplaceFilters>(
    key: K,
    value: MarketplaceFilters[K]
  ) {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  }

  function clearFilters() {
    setPage(1);
    setFilters(emptyFilters);
  }

  const filterProps = useMemo(
    () => ({
      filters,
      setFilter,
      clearFilters,
      categories: meta.data?.categories ?? [],
      shopCategories,
      brands: meta.data?.brands ?? [],
      locations: meta.data?.locations ?? [],
      hideSearch: true as const,
      hidePlatformCategory: true as const,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filters, meta.data, shopCategories]
  );

  if (shopQ.error) {
    return (
      <EmptyState
        title="Shop not found"
        description={
          shopQ.error instanceof Error
            ? shopQ.error.message
            : "This shop may be unavailable."
        }
        actionLabel="Browse marketplace"
        actionHref="/"
      />
    );
  }

  if (shopQ.isLoading || !tenant) {
    return <SkeletonLines count={4} />;
  }

  const rowProps = {
    favSet,
    isAuthenticated,
    slug,
    toggleFavorite,
    busy: toggleFavorite.isPending,
    onAddToCart: (id: string) => void addToCart(id),
  };

  return (
    <>
      <CampaignPopup slug={slug} />
      <ShopEntryTransition
        targetSlug={slug}
        peers={peersQ.data ?? [{ ...tenant, productCount: 0 }]}
      >
        <div className="space-y-token-8">
          <BannerCarousel slides={bannerSlides} brandColor={brand} />

          {promoProducts.length > 0 && (
            <section className="space-y-token-4" id="promos">
              <SectionHeader title="Promo Products" />
              <ProductRow products={promoProducts} {...rowProps} />
            </section>
          )}

          {newArrivals.length > 0 && (
            <section className="space-y-token-4" id="new-arrivals">
              <SectionHeader title="New Arrivals" />
              <ProductRow products={newArrivals} {...rowProps} />
            </section>
          )}

          <div
            id="products"
            className="grid gap-token-6 lg:grid-cols-[220px_1fr]"
          >
            <aside className="hidden lg:block">
              <div className="sticky top-24 rounded-lg border border-border bg-card p-token-4">
              <h2 className="mb-token-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Filters
              </h2>
              <FilterPanel {...filterProps} />
              </div>
            </aside>

            <section className="space-y-token-8">
              <SectionHeader
                title={showCategorySections ? "Shop by category" : "Products"}
                actions={
                  <Button
                    variant="outline"
                    size="sm"
                    className="lg:hidden"
                    onClick={() => setDrawerOpen(true)}
                  >
                    Filters
                  </Button>
                }
              />

              {showCategorySections ? (
                categorySections.map(({ category, products: catProducts }) => (
                  <div key={category.id} className="space-y-token-4">
                    <SectionHeader
                      title={category.name}
                      actions={
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setFilter("shopCategory", category.slug)
                          }
                        >
                          View all
                        </Button>
                      }
                    />
                    <ProductRow products={catProducts} {...rowProps} />
                  </div>
                ))
              ) : productsQ.isLoading ? (
                <div className="grid grid-cols-2 gap-token-3 xl:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <EmptyState
                  title="No products in this shop"
                  description="Try clearing filters or check back when the seller lists more items."
                  actionLabel="Clear filters"
                  onAction={clearFilters}
                />
              ) : (
                <>
                  {products.length > 7 ? (
                    <ProductRow products={products} {...rowProps} />
                  ) : (
                    <div className="grid grid-cols-2 gap-token-3 xl:grid-cols-3">
                      {products.map((p) => {
                        const favorited = favSet.has(p.id);
                        return (
                          <ProductCard
                            key={p.id}
                            product={p}
                            favorited={favorited}
                            favoriteBusy={toggleFavorite.isPending}
                            onFavoriteToggle={
                              isAuthenticated
                                ? () =>
                                    toggleFavorite.mutate({
                                      productId: p.id,
                                      favorited,
                                    })
                                : () => {
                                    window.location.href = `/login?returnTo=${encodeURIComponent(`/shops/${slug}`)}`;
                                  }
                            }
                            onAddToCart={() => void addToCart(p.id)}
                          />
                        );
                      })}
                    </div>
                  )}
                  {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-token-3">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= pagination.pages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>

          <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <FilterPanel {...filterProps} />
          </FilterDrawer>
        </div>
      </ShopEntryTransition>
    </>
  );
}
