"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BrandPublic,
  CategoryPublic,
  ProductPublic,
  TenantPublic,
} from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import type { MarketplaceFilters } from "@/stores/ui";
import { useAuth } from "@/hooks/use-auth";

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  pages: number;
};

export function filtersToQueryString(
  filters: MarketplaceFilters,
  page = 1,
  limit = 24
): string {
  const params = new URLSearchParams();
  if (filters.category) params.set("category", filters.category);
  if (filters.shopCategory) params.set("shopCategory", filters.shopCategory);
  if (filters.brand) params.set("brand", filters.brand);
  if (filters.location) params.set("location", filters.location);
  if (filters.countryCode) params.set("countryCode", filters.countryCode);
  if (filters.stateCode) params.set("stateCode", filters.stateCode);
  if (filters.minPrice) params.set("minPrice", filters.minPrice);
  if (filters.maxPrice) params.set("maxPrice", filters.maxPrice);
  if (filters.q) params.set("q", filters.q);
  if (filters.sort) params.set("sort", filters.sort);
  params.set("page", String(page));
  params.set("limit", String(limit));
  return params.toString();
}

export function useCatalogMeta() {
  return useQuery({
    queryKey: ["catalog", "meta"] as const,
    queryFn: async () => {
      const [c, b, l] = await Promise.all([
        apiFetch<{ categories: CategoryPublic[] }>(
          "/api/catalog/categories?tree=1"
        ),
        apiFetch<{ brands: BrandPublic[] }>("/api/catalog/brands"),
        apiFetch<{ locations: string[] }>("/api/catalog/locations"),
      ]);
      return {
        categories: c.categories,
        brands: b.brands,
        locations: l.locations,
      };
    },
  });
}

export function useCategoryBreadcrumb(slug: string) {
  return useQuery({
    queryKey: ["catalog", "breadcrumb", slug] as const,
    queryFn: async () => {
      const res = await apiFetch<{ breadcrumb: CategoryPublic[] }>(
        `/api/catalog/categories/breadcrumb?slug=${encodeURIComponent(slug)}`
      );
      return res.breadcrumb;
    },
    enabled: !!slug,
  });
}

export function useCatalogProducts(
  filters: MarketplaceFilters,
  page = 1,
  limit = 24
) {
  const qs = filtersToQueryString(filters, page, limit);
  return useQuery({
    queryKey: queryKeys.catalog.products(qs),
    queryFn: async () => {
      const res = await apiFetch<{
        products: ProductPublic[];
        pagination: Pagination;
      }>(`/api/catalog/products?${qs}`);
      return res;
    },
  });
}

export type ShopListItem = TenantPublic & { productCount: number };

export function useShops(limit = 12) {
  return useQuery({
    queryKey: ["shops", "list", limit] as const,
    queryFn: async () => {
      const res = await apiFetch<{ shops: ShopListItem[] }>(
        `/api/shops?limit=${limit}`
      );
      return res.shops;
    },
  });
}

export function useShop(slug: string) {
  return useQuery({
    queryKey: ["shops", slug] as const,
    queryFn: async () => {
      const res = await apiFetch<{ tenant: TenantPublic }>(
        `/api/shops/${slug}`
      );
      return res.tenant;
    },
    enabled: !!slug,
  });
}

export function useShopProducts(
  slug: string,
  filters: MarketplaceFilters,
  page = 1,
  limit = 24
) {
  const qs = filtersToQueryString(filters, page, limit);
  return useQuery({
    queryKey: ["shops", slug, "products", qs] as const,
    queryFn: async () => {
      const res = await apiFetch<{
        products: ProductPublic[];
        pagination: Pagination;
      }>(`/api/shops/${slug}/products?${qs}`);
      return res;
    },
    enabled: !!slug,
  });
}

/** All active shop products for dropdown search (higher limit). */
export function useShopProductIndex(slug: string) {
  return useQuery({
    queryKey: ["shops", slug, "product-index"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ products: ProductPublic[] }>(
        `/api/shops/${slug}/products?limit=48&page=1`
      );
      return res.products;
    },
    enabled: !!slug,
  });
}

export function useFavoriteIds() {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: queryKeys.buyer.favorites,
    queryFn: async () => {
      const res = await apiFetch<{
        favorites: { id: string; product: ProductPublic }[];
      }>("/api/buyer/favorites");
      return new Set(res.favorites.map((f) => f.product.id));
    },
    enabled: isAuthenticated,
  });
}

export function useToggleFavorite() {
  const qc = useQueryClient();
  const { isAuthenticated } = useAuth();
  return useMutation({
    mutationFn: async ({
      productId,
      favorited,
    }: {
      productId: string;
      favorited: boolean;
    }) => {
      if (!isAuthenticated) {
        throw new Error("Sign in to save favorites");
      }
      if (favorited) {
        await apiFetch(`/api/buyer/favorites/${productId}`, {
          method: "DELETE",
        });
      } else {
        await apiFetch(`/api/buyer/favorites/${productId}`, {
          method: "POST",
        });
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.buyer.favorites });
    },
  });
}
