"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BrandPublic,
  CategoryPublic,
  OrderPublic,
  ProductImageAsset,
  ProductPublic,
  SellerAnalytics,
  SellerStats,
  ShopCategoryPublic,
  ShopThemeSettings,
  TeamMemberPublic,
  TenantPublic,
} from "@vendors/shared-types";
import { apiFetch, ApiClientError } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export type SellerFeatures = {
  aiFeaturesEnabled: boolean;
  watermarkDefaultOn: boolean;
  imageToolsEnabled: boolean;
};

export type SellerPlanInfo = {
  tenant: TenantPublic;
  plan: {
    id: string;
    name: string;
    slug: string;
    price: number;
    currency: string;
    productLimit: number | null;
    featureFlags: unknown;
    trialDays: number;
  } | null;
  productCount: number;
  trialActive: boolean;
  trialDaysLeft: number;
};

export type SellerShop = TenantPublic & {
  description: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactFormEnabled?: boolean;
  watermarkDefaultOn: boolean | null;
  watermarkPlatformDefault: boolean;
  settlementBankCode?: string | null;
  settlementAccountNumber?: string | null;
  paystackSubaccountCode?: string | null;
};

export type SellerBranding = {
  logoUrl: string | null;
  logoRectUrl: string | null;
  logoBuilder: ShopThemeSettings["logoBuilder"];
  primaryColor: string | null;
  accentColor: string | null;
  promoProductsEnabled?: boolean;
  newArrivalsEnabled?: boolean;
  newArrivalsDays?: number;
  shopName: string;
  slug: string;
};

export type SellerUploadResult = {
  url: string;
  originalUrl: string;
  watermarkJobId: string | null;
};

export function useSellerProducts() {
  return useQuery({
    queryKey: queryKeys.seller.products,
    queryFn: async () => {
      const res = await apiFetch<{ products: ProductPublic[] }>(
        "/api/seller/products"
      );
      return res.products;
    },
  });
}

export function useSellerOrders() {
  return useQuery({
    queryKey: queryKeys.seller.orders,
    queryFn: async () => {
      const res = await apiFetch<{ orders: OrderPublic[] }>(
        "/api/seller/orders"
      );
      return res.orders;
    },
  });
}

export function useSellerOrder(id: string) {
  return useQuery({
    queryKey: [...queryKeys.seller.orders, id] as const,
    queryFn: async () => {
      const res = await apiFetch<{ order: OrderPublic }>(
        `/api/seller/orders/${id}`
      );
      return res.order;
    },
    enabled: !!id,
  });
}

export function useSellerStats() {
  return useQuery({
    queryKey: queryKeys.seller.stats,
    queryFn: async () => {
      const res = await apiFetch<{ stats: SellerStats }>("/api/seller/stats");
      return res.stats;
    },
    refetchInterval: 4 * 60 * 1000,
  });
}

export function useSellerAnalytics(
  period: "today" | "week" | "month",
  day?: string | null
) {
  const dayKey = day || "";
  return useQuery({
    queryKey: [...queryKeys.seller.analytics, period, dayKey] as const,
    queryFn: async () => {
      const qs = new URLSearchParams({ period });
      if (day) qs.set("day", day);
      const res = await apiFetch<{ analytics: SellerAnalytics }>(
        `/api/seller/analytics?${qs}`
      );
      return res.analytics;
    },
    refetchInterval: day ? false : 4 * 60 * 1000,
  });
}

export function useSellerPlan() {
  return useQuery({
    queryKey: ["seller", "plan"] as const,
    queryFn: async () => apiFetch<SellerPlanInfo>("/api/seller/plan"),
    retry: (count, err) => {
      if (err instanceof ApiClientError && err.status === 403) return false;
      return count < 2;
    },
  });
}

export function useSellerShop() {
  return useQuery({
    queryKey: ["seller", "shop"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ shop: SellerShop }>("/api/seller/shop");
      return res.shop;
    },
  });
}

export function useSellerBranding(enabled = true) {
  return useQuery({
    queryKey: ["seller", "branding"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ branding: SellerBranding }>(
        "/api/seller/branding"
      );
      return res.branding;
    },
    enabled,
  });
}

export function useSellerTeam() {
  return useQuery({
    queryKey: ["seller", "team"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ members: TeamMemberPublic[] }>(
        "/api/seller/team"
      );
      return res.members;
    },
  });
}

export function useSellerDomain() {
  return useQuery({
    queryKey: ["seller", "domain"] as const,
    queryFn: async () =>
      apiFetch<{
        customDomain: string | null;
        cnameTarget: string;
        instructions: string;
      }>("/api/seller/domain"),
  });
}

export function useSellerCatalogOptions() {
  return useQuery({
    queryKey: ["seller", "catalog-options"] as const,
    queryFn: async () => {
      const [c, b, f, sc] = await Promise.all([
        apiFetch<{ categories: CategoryPublic[] }>(
          "/api/catalog/categories?tree=1"
        ),
        apiFetch<{ brands: BrandPublic[] }>("/api/catalog/brands"),
        apiFetch<SellerFeatures>("/api/seller/tools/features").catch(
          () => null
        ),
        apiFetch<{ categories: ShopCategoryPublic[] }>(
          "/api/seller/shop-categories"
        ).catch(() => ({ categories: [] as ShopCategoryPublic[] })),
      ]);
      return {
        categories: c.categories,
        brands: b.brands,
        shopCategories: sc.categories,
        features: f,
      };
    },
  });
}

export function useSellerShopCategories() {
  return useQuery({
    queryKey: ["seller", "shop-categories"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ categories: ShopCategoryPublic[] }>(
        "/api/seller/shop-categories"
      );
      return res.categories;
    },
  });
}

/** @deprecated Prefer focused hooks — kept for transitional imports. */
export function useSellerDashboard() {
  return useQuery({
    queryKey: queryKeys.seller.dashboard,
    queryFn: async () => {
      const [p, o, s, a] = await Promise.all([
        apiFetch<{ products: ProductPublic[] }>("/api/seller/products"),
        apiFetch<{ orders: OrderPublic[] }>("/api/seller/orders"),
        apiFetch<{ stats: SellerStats }>("/api/seller/stats"),
        apiFetch<{ analytics: SellerAnalytics }>(
          "/api/seller/analytics?period=month"
        ).catch(() => null),
      ]);
      return {
        products: p.products,
        orders: o.orders,
        stats: s.stats,
        analytics: a?.analytics ?? null,
      };
    },
  });
}

export function useInvalidateSeller() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ["seller"] });
  };
}

export function useInvalidateSellerDashboard() {
  return useInvalidateSeller();
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string;
      status: "paid" | "fulfilled" | "cancelled";
    }) =>
      apiFetch<{ order: OrderPublic }>(`/api/seller/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: queryKeys.seller.orders });
      void qc.invalidateQueries({
        queryKey: [...queryKeys.seller.orders, vars.id],
      });
      void qc.invalidateQueries({ queryKey: queryKeys.seller.dashboard });
      void qc.invalidateQueries({ queryKey: queryKeys.seller.stats });
      void qc.invalidateQueries({ queryKey: queryKeys.seller.analytics });
    },
  });
}

export async function uploadSellerFile(file: File): Promise<SellerUploadResult> {
  const body = new FormData();
  body.append("file", file);
  return apiFetch<SellerUploadResult>("/api/seller/uploads", {
    method: "POST",
    body,
  });
}

export function productDisplayUrl(
  asset: ProductImageAsset,
  watermarkEnabled: boolean
): string {
  if (watermarkEnabled && asset.watermarked) return asset.watermarked;
  return asset.original;
}
