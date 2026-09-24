"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { BannerCarousel } from "@/components/banner-carousel";
import { AutoScrollCarousel } from "@/components/auto-scroll-carousel";
import { EmptyState } from "@/components/empty-state";
import { ShopCard } from "@/components/shop-card";
import { ProductCardSkeleton } from "@/components/skeleton";
import { SectionHeader } from "@/components/section-header";
import { MarketplacePagination } from "@/components/marketplace-pagination";
import {
  FilterDrawer,
  FilterPanel,
} from "@/components/marketplace-filters";
import { Search } from "lucide-react";
import {
  useCatalogMeta,
  useCatalogProducts,
  useCategoryBreadcrumb,
  useFavoriteIds,
  useShops,
  useToggleFavorite,
} from "@/hooks/use-catalog";
import { useAuth } from "@/hooks/use-auth";
import {
  useMarketplaceFilters,
  useUiStore,
  type MarketplaceSort,
} from "@/stores/ui";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  DEFAULT_PLATFORM_BANNER,
  toBannerSlides,
} from "@/lib/default-banners";
import { ThemeCycleToggle } from "@/components/theme-cycle-toggle";

const SORT_OPTIONS: { value: MarketplaceSort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export default function HomePage() {
  const { filters, setFilter, clearFilters } = useMarketplaceFilters();
  const [page, setPage] = useState(1);

  const meta = useCatalogMeta();
  const productsQuery = useCatalogProducts(filters, page, 24);
  const shopsQuery = useShops(12);
  const breadcrumbQ = useCategoryBreadcrumb(filters.category);
  const bannersQ = useQuery({
    queryKey: ["catalog", "homepage-banners"] as const,
    queryFn: async () => {
      const res = await apiFetch<{
        banners: {
          id: string;
          imageUrl: string;
          title?: string | null;
          subtitle?: string | null;
          ctaText?: string | null;
          ctaUrl?: string | null;
          scrollSpeed?: number;
          active?: boolean;
        }[];
      }>("/api/catalog/homepage-banners");
      return res.banners;
    },
  });
  const favorites = useFavoriteIds();
  const toggleFavorite = useToggleFavorite();
  const { isAuthenticated } = useAuth();
  const qc = useQueryClient();
  const navDrawerOpen = useUiStore((s) => s.navDrawerOpen);
  const setNavDrawerOpen = useUiStore((s) => s.setNavDrawerOpen);

  const categories = meta.data?.categories ?? [];
  const brands = meta.data?.brands ?? [];
  const locations = meta.data?.locations ?? [];
  const products = productsQuery.data?.products ?? [];
  const pagination = productsQuery.data?.pagination;
  const shops = shopsQuery.data ?? [];
  const loading = productsQuery.isLoading;
  const fetching = productsQuery.isFetching;
  const breadcrumb = breadcrumbQ.data ?? [];

  const favSet = favorites.data ?? new Set<string>();

  const platformSlides = useMemo(() => {
    const list = bannersQ.data ?? [];
    if (list.length === 0) {
      return toBannerSlides([{ id: "default", ...DEFAULT_PLATFORM_BANNER }]);
    }
    return toBannerSlides(list);
  }, [bannersQ.data]);

  const filterProps = useMemo(
    () => ({
      filters,
      setFilter: <K extends keyof typeof filters>(
        key: K,
        value: (typeof filters)[K]
      ) => {
        setPage(1);
        setFilter(key, value);
      },
      clearFilters: () => {
        setPage(1);
        clearFilters();
      },
      categories,
      brands,
      locations,
      hideSearch: true as const,
    }),
    [filters, setFilter, clearFilters, categories, brands, locations]
  );

  async function addToCart(productId: string, shopSlug: string) {
    await apiFetch(`/api/carts/${shopSlug}/items`, {
      method: "POST",
      body: JSON.stringify({ productId, qty: 1 }),
    });
    await qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
    useUiStore.getState().setCartDrawerOpen(true);
  }

  const hasActiveFilters =
    !!filters.q ||
    !!filters.category ||
    !!filters.brand ||
    !!filters.location ||
    !!filters.minPrice ||
    !!filters.maxPrice;

  return (
    <div>
      <div className="mx-auto max-w-[100rem] px-token-4 pt-token-2 sm:px-token-6">
        <BannerCarousel slides={platformSlides} className="rounded-none sm:rounded-xl" />
      </div>

      <div className="mx-auto max-w-[100rem] space-y-token-8 px-token-4 pb-token-10 pt-token-8 sm:px-token-6 sm:pt-token-12">
        <section className="space-y-token-4">
          <SectionHeader
            title="Shops"
            description="Independent storefronts — open one to browse their catalog."
          />
          {shopsQuery.isLoading ? (
            <div className="flex gap-token-3 overflow-hidden">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="h-28 w-48 shrink-0 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : shops.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Shops will appear here as sellers go live.
            </p>
          ) : (
            <AutoScrollCarousel threshold={7} itemClassName="w-52 shrink-0">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </AutoScrollCarousel>
          )}
        </section>

        <div className="grid gap-token-6 lg:grid-cols-[260px_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 space-y-token-4 rounded-lg border border-border bg-card p-token-4 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Filters
              </h2>
              <FilterPanel {...filterProps} />
            </div>
          </aside>

          <section className="space-y-token-4">
            {filters.category && breadcrumb.length > 0 && (
              <nav
                aria-label="Category breadcrumb"
                className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
              >
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    setFilter("category", "");
                  }}
                  className="hover:text-foreground hover:underline"
                >
                  All
                </button>
                {breadcrumb.map((c) => (
                  <span key={c.id} className="inline-flex items-center gap-1">
                    <span aria-hidden>/</span>
                    <button
                      type="button"
                      onClick={() => {
                        setPage(1);
                        setFilter("category", c.slug);
                      }}
                      className={
                        c.slug === filters.category
                          ? "font-medium text-foreground"
                          : "hover:text-foreground hover:underline"
                      }
                    >
                      {c.name}
                    </button>
                  </span>
                ))}
              </nav>
            )}

            <SectionHeader
              title="Products"
              description={
                pagination
                  ? `${pagination.total} result${pagination.total === 1 ? "" : "s"}${
                      filters.q ? ` for “${filters.q}”` : ""
                    }`
                  : undefined
              }
              actions={
                <label className="flex items-center gap-token-2 text-sm text-muted-foreground">
                  <span className="sr-only sm:not-sr-only">Sort</span>
                  <select
                    value={filters.sort}
                    onChange={(e) => {
                      setPage(1);
                      setFilter("sort", e.target.value as MarketplaceSort);
                    }}
                    className="rounded-md border border-border bg-card px-token-3 py-token-2 text-sm text-foreground"
                  >
                    {SORT_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              }
            />

            {loading ? (
              <div className="grid grid-cols-2 gap-token-3 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            ) : productsQuery.error ? (
              <p className="text-sm text-danger">
                {productsQuery.error instanceof Error
                  ? productsQuery.error.message
                  : "Couldn’t load products. Check your connection and try again."}
              </p>
            ) : products.length === 0 ? (
              <EmptyState
                title="No products match your search"
                icon={Search}
                description={
                  hasActiveFilters
                    ? "Try clearing filters or searching for something else."
                    : "Nothing listed yet — sellers are still stocking the shelves."
                }
                actionLabel={
                  hasActiveFilters ? "Clear search & filters" : undefined
                }
                onAction={
                  hasActiveFilters
                    ? () => {
                        clearFilters();
                        setPage(1);
                      }
                    : undefined
                }
              />
            ) : (
              <>
                <div
                  className={`grid grid-cols-2 gap-token-3 xl:grid-cols-3 ${
                    fetching ? "opacity-70" : ""
                  }`}
                >
                  {products.map((p) => {
                    const favorited = favSet.has(p.id);
                    const shopSlug = p.tenant?.slug;
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
                                window.location.href = `/login?next=${encodeURIComponent("/")}`;
                              }
                        }
                        onAddToCart={
                          shopSlug
                            ? () => void addToCart(p.id, shopSlug)
                            : undefined
                        }
                      />
                    );
                  })}
                </div>
                {pagination && (
                  <MarketplacePagination
                    page={pagination.page}
                    pages={pagination.pages}
                    onPageChange={setPage}
                  />
                )}
              </>
            )}
          </section>
        </div>
      </div>

      <FilterDrawer open={navDrawerOpen} onClose={() => setNavDrawerOpen(false)}>
        <div className="mb-token-6 space-y-1 text-sm">
          <Link
            href="/about"
            className="block rounded-md px-2 py-2 hover:bg-muted"
          >
            About Us
          </Link>
          <Link
            href="/contact"
            className="block rounded-md px-2 py-2 hover:bg-muted"
          >
            Contact Us
          </Link>
          <Link
            href="/faq"
            className="block rounded-md px-2 py-2 hover:bg-muted"
          >
            FAQs
          </Link>
          <div className="px-2 py-3">
            <ThemeCycleToggle />
          </div>
        </div>
        <FilterPanel {...filterProps} />
      </FilterDrawer>
    </div>
  );
}
