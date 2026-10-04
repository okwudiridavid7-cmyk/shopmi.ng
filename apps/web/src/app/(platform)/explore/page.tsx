"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ProductCard } from "@/components/product-card";
import { BannerCarousel } from "@/components/banner-carousel";
import { EmptyState } from "@/components/empty-state";
import { ProductCardSkeleton } from "@/components/skeleton";
import { SectionHeader } from "@/components/section-header";
import { MarketplacePagination } from "@/components/marketplace-pagination";
import {
  FilterDrawer,
  FilterPanel,
  FilterSidebar,
} from "@/components/marketplace-filters";
import { ArrowLeft, ArrowUpDown, Search, SlidersHorizontal } from "lucide-react";
import type { CategoryPublic } from "@vendors/shared-types";
import { CategoryRail } from "@/components/category-rail";
import {
  useCatalogMeta,
  useCatalogProducts,
  useCategoryBreadcrumb,
  useFavoriteIds,
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
  platformDefaultSlides,
  toBannerSlides,
} from "@/lib/default-banners";
import { ThemeCycleToggle } from "@/components/theme-cycle-toggle";
import { Select } from "@/components/ui/select";

const SORT_OPTIONS: { value: MarketplaceSort; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

function findCategory(tree: CategoryPublic[], slug: string): CategoryPublic | null {
  for (const c of tree) {
    if (c.slug === slug) return c;
    const hit = c.children ? findCategory(c.children, slug) : null;
    if (hit) return hit;
  }
  return null;
}

export default function ExplorePage() {
  const { filters, setFilter, clearFilters } = useMarketplaceFilters();
  const [page, setPage] = useState(1);

  const meta = useCatalogMeta();
  const productsQuery = useCatalogProducts(filters, page, 24);
  const [filtersOpen, setFiltersOpen] = useState(false);
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
  const loading = productsQuery.isLoading;
  const fetching = productsQuery.isFetching;
  const breadcrumb = breadcrumbQ.data ?? [];

  const favSet = favorites.data ?? new Set<string>();

  // Searches handed off from the home hero arrive as ?q= or ?category= - apply them, then glide to the results.
  const [scrollToResults, setScrollToResults] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q")?.trim() ?? "";
    const category = params.get("category")?.trim() ?? "";
    if (!q && !category) return;
    const store = useMarketplaceFilters.getState();
    if (store.filters.q !== q || store.filters.category !== category) {
      store.clearFilters();
      if (q) store.setFilter("q", q);
      if (category) store.setFilter("category", category);
    }
    setPage(1);
    setScrollToResults(true);
  }, []);
  useEffect(() => {
    if (!scrollToResults || loading) return;
    setScrollToResults(false);
    const timer = window.setTimeout(() => {
      document
        .getElementById("products")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [scrollToResults, loading]);

  const platformSlides = useMemo(() => {
    const list = bannersQ.data ?? [];
    if (list.length === 0) return platformDefaultSlides();
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

  const topCategories = categories.filter((c) => !c.parentId);
  const activeTop = filters.category ? (breadcrumb[0]?.slug ?? filters.category) : "";
  const subcategories = useMemo(() => {
    if (!filters.category) return [];
    const node = findCategory(categories, filters.category);
    if (node?.children?.length) return node.children;
    const parentSlug = breadcrumb.length > 1 ? breadcrumb[breadcrumb.length - 2]?.slug : null;
    return parentSlug ? (findCategory(categories, parentSlug)?.children ?? []) : [];
  }, [categories, filters.category, breadcrumb]);

  const selectCategory = (slug: string) => {
    setPage(1);
    setFilter("category", slug);
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const resultsLabel = pagination
    ? `${pagination.total} result${pagination.total === 1 ? "" : "s"}${filters.q ? ` for “${filters.q}”` : ""}`
    : undefined;

  const sortControl = (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="sr-only">Sort</span>
      <div className="w-[11rem] sm:w-[12.5rem]">
        <Select
          icon={<ArrowUpDown />}
          value={filters.sort}
          onChange={(e) => {
            setPage(1);
            setFilter("sort", e.target.value as MarketplaceSort);
          }}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
    </label>
  );

  const filtersButton = (extra = "") => (
    <button
      type="button"
      onClick={() => setFiltersOpen(true)}
      className={`inline-flex h-10 items-center gap-2 rounded-md border border-border bg-card px-3.5 text-sm font-medium text-foreground transition hover:bg-muted ${extra}`}
    >
      <SlidersHorizontal className="h-4 w-4" aria-hidden />
      Filters
    </button>
  );

  const productGrid = (gridClass: string) =>
    loading ? (
      <div className={gridClass}>
        {Array.from({ length: 8 }).map((_, i) => (
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
        title={hasActiveFilters ? "No products match your search" : "No products yet"}
        icon={Search}
        actionLabel={hasActiveFilters ? "Clear search & filters" : undefined}
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
        <div className={`${gridClass} ${fetching ? "opacity-70" : ""}`}>
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
                    ? () => toggleFavorite.mutate({ productId: p.id, favorited })
                    : () => {
                        window.location.href = `/login?next=${encodeURIComponent("/explore")}`;
                      }
                }
                onAddToCart={shopSlug ? () => void addToCart(p.id, shopSlug) : undefined}
              />
            );
          })}
        </div>
        {pagination && (
          <MarketplacePagination page={pagination.page} pages={pagination.pages} onPageChange={setPage} />
        )}
      </>
    );

  return (
    <div>
      {!hasActiveFilters ? (
        <div className="mx-auto w-full max-w-[100rem] px-token-4 pt-token-4 sm:px-token-6 sm:pt-token-5">
          <BannerCarousel slides={platformSlides} />
        </div>
      ) : null}

      <div className="mx-auto max-w-[100rem] space-y-token-8 px-token-4 pb-token-16 pt-token-6 sm:px-token-6 sm:pt-token-8">
        <section aria-labelledby="explore-categories">
          <h2
            id="explore-categories"
            className={hasActiveFilters ? "sr-only" : "mb-token-3 font-display text-xl font-bold text-foreground"}
          >
            Shop by category
          </h2>
          <CategoryRail categories={topCategories} active={activeTop} onSelect={selectCategory} />
        </section>


        {hasActiveFilters ? (
          <div className="grid gap-token-6 lg:grid-cols-[260px_minmax(0,1fr)]">
            <FilterSidebar>
              <FilterPanel {...filterProps} />
            </FilterSidebar>

            <section id="products" className="min-w-0 scroll-mt-24 space-y-token-4">
              <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <button
                  type="button"
                  onClick={() => {
                    setPage(1);
                    clearFilters();
                  }}
                  className="inline-flex items-center gap-1 font-medium hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden />
                  All products
                </button>
                {filters.category
                  ? breadcrumb.map((c) => (
                      <span key={c.id} className="inline-flex items-center gap-1.5">
                        <span aria-hidden>/</span>
                        <button
                          type="button"
                          onClick={() => selectCategory(c.slug)}
                          className={c.slug === filters.category ? "font-medium text-foreground" : "hover:text-foreground"}
                        >
                          {c.name}
                        </button>
                      </span>
                    ))
                  : null}
              </nav>

              {subcategories.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {subcategories.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => selectCategory(c.slug)}
                        aria-pressed={c.slug === filters.category}
                        className={`inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition ${
                          c.slug === filters.category
                            ? "border-accent-strong bg-accent-strong text-white"
                            : "border-border bg-card text-foreground hover:bg-muted"
                        }`}
                      >
                        {c.name}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}

              <SectionHeader
                title={breadcrumb.length && filters.category ? breadcrumb[breadcrumb.length - 1]!.name : filters.q ? "Search results" : "Products"}
                description={resultsLabel}
                actions={
                  <div className="flex items-center gap-2">
                    {filtersButton("lg:hidden")}
                    {sortControl}
                  </div>
                }
              />
              {productGrid("grid grid-cols-2 gap-token-3 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4")}
            </section>
          </div>
        ) : (
          <section id="products" className="scroll-mt-24 space-y-token-4">
            <SectionHeader
              title="All products"
              description={resultsLabel}
              actions={
                <div className="flex items-center gap-2">
                  {filtersButton()}
                  {sortControl}
                </div>
              }
            />
            {productGrid("grid grid-cols-2 gap-token-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5")}
          </section>
        )}
      </div>

      <FilterDrawer open={filtersOpen} onClose={() => setFiltersOpen(false)} desktop={!hasActiveFilters}>
        <FilterPanel {...filterProps} />
      </FilterDrawer>

      <FilterDrawer open={navDrawerOpen} onClose={() => setNavDrawerOpen(false)}>
        <div className="mb-token-6 space-y-1 text-sm">
          <Link
            href="/#about"
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
