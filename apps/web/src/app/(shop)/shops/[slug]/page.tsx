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
  FilterSidebar,
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
import { apiFetch, isAuthError, isShopUnavailableError } from "@/lib/api";
import {
  shopDefaultSlides,
  toBannerSlides,
} from "@/lib/default-banners";
import { parseHexColor, parseThemeSettings } from "@/lib/theme";
import { useUiStore, type MarketplaceFilters } from "@/stores/ui";
import { addToShopCart } from "@/hooks/use-cart";
import { useToast } from "@/components/ui/toast";
import { useStoreTheme } from "@/components/store-themes/context";
import { ThemedHome } from "@/components/store-themes/home";

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
  const { toast } = useToast();
  const [filters, setFilters] = useState<MarketplaceFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const drawerOpen = useUiStore((s) => s.shopFilterDrawerOpen);
  const setDrawerOpen = useUiStore((s) => s.setShopFilterDrawerOpen);

  useEffect(() => {
    const q = searchParams.get("q") ?? "";
    const cat = searchParams.get("cat") ?? "";
    setFilters((f) =>
      f.q === q && (!cat || f.shopCategory === cat)
        ? f
        : { ...f, q, ...(cat ? { shopCategory: cat } : {}) }
    );
  }, [searchParams]);

  const { id: themeId } = useStoreTheme();

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

  const allActive = indexQ.data ?? [];
  async function addToCart(productId: string) {
    const product =
      products.find((p) => p.id === productId) ??
      allActive.find((p) => p.id === productId);
    if (!product) return;
    try {
      await addToShopCart({ slug, product, qty: 1, shopName: tenant?.name, qc });
      useUiStore.getState().setCartDrawerOpen(true);
    } catch (err) {
      if (isAuthError(err)) return;
      toast({
        title: "Couldn't add to cart",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    }
  }
  const favSet = favorites.data ?? new Set<string>();
  const shopCategories = shopCatsQ.data ?? [];

  const theme = parseThemeSettings(tenant?.themeSettings);
  const brand =
    parseHexColor(theme.primaryColor) ?? parseHexColor(theme.accentColor);

  const bannerSlides = useMemo(() => {
    const active = (bannersQ.data ?? []).filter((b) => b.active);
    if (active.length === 0) {
      return shopDefaultSlides(tenant?.name);
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

  const featured = useMemo(() => {
    const deals = allActive.filter(
      (p) => p.compareAtPrice != null && p.compareAtPrice > p.price && p.stockQty > 0
    );
    const rest = allActive.filter((p) => !deals.includes(p));
    return [...deals, ...rest];
  }, [allActive]);

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
    const unavailable = isShopUnavailableError(shopQ.error);
    return (
      <EmptyState
        title={unavailable ? "This shop is temporarily unavailable" : "Shop not found"}
        description={
          unavailable
            ? "It isn’t taking orders right now. If you’ve already ordered, you can track it from your orders page."
            : shopQ.error instanceof Error
              ? shopQ.error.message
              : undefined
        }
        actionLabel="Browse marketplace"
        actionHref="/explore"
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

  const renderCard = (p: ProductPublic) => {
    const favorited = favSet.has(p.id);
    return (
      <ProductCard
        key={p.id}
        product={p}
        className="w-full"
        favorited={favorited}
        favoriteBusy={toggleFavorite.isPending}
        onFavoriteToggle={
          isAuthenticated
            ? () => toggleFavorite.mutate({ productId: p.id, favorited })
            : () => {
                window.location.href = `/login?returnTo=${encodeURIComponent(`/shops/${slug}`)}`;
              }
        }
        onAddToCart={() => void addToCart(p.id)}
      />
    );
  };

  const pagerControls =
    pagination && pagination.pages > 1 ? (
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
    ) : null;

  if (themeId !== "classic") {
    const activeCategory = shopCategories.find((c) => c.slug === filters.shopCategory);
    const gridClass =
      themeId === "bazaar"
        ? "grid-cols-2 gap-4 md:grid-cols-3 2xl:grid-cols-4"
        : themeId === "runway" || themeId === "atelier"
          ? "grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3"
          : "grid-cols-2 gap-5 md:grid-cols-3";
    const catalog = (
      <div id="products" className="grid scroll-mt-32 gap-token-6 lg:grid-cols-[240px_1fr]">
        <FilterSidebar>
          <FilterPanel {...filterProps} />
        </FilterSidebar>
        <section className="min-w-0 space-y-token-6">
          <SectionHeader
            title={activeCategory?.name ?? "All products"}
            description={
              pagination ? `${pagination.total} product${pagination.total === 1 ? "" : "s"}` : undefined
            }
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
          {productsQ.isLoading ? (
            <div className={`grid ${gridClass}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 ? (
            <EmptyState
              title="No products found"
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <div className={`grid ${gridClass}`}>
              {products.map((p) => (
                <div key={p.id} className="flex">
                  {renderCard(p)}
                </div>
              ))}
            </div>
          )}
          {pagerControls}
        </section>
      </div>
    );

    return (
      <>
        <CampaignPopup slug={slug} />
        <ShopEntryTransition
          targetSlug={slug}
          peers={peersQ.data ?? [{ ...tenant, productCount: 0 }]}
        >
          <ThemedHome
            themeId={themeId}
            tenant={tenant}
            theme={theme}
            slides={bannerSlides}
            featured={featured}
            promo={promoProducts}
            newArrivals={newArrivals}
            categorySections={categorySections}
            renderCard={renderCard}
            onPickCategory={(catSlug) => {
              setFilter("shopCategory", catSlug);
              window.setTimeout(
                () =>
                  document
                    .getElementById("products")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" }),
                50
              );
            }}
            catalog={catalog}
          />
          <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
            <FilterPanel {...filterProps} />
          </FilterDrawer>
        </ShopEntryTransition>
      </>
    );
  }

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
            <FilterSidebar>
              <FilterPanel {...filterProps} />
            </FilterSidebar>

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
                  title="No products found"
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
