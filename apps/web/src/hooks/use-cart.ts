"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartPublic, CartSummary, ProductPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import {
  onCustomDomainNow,
  useLocalCart,
  useLocalCartSummary,
  useOnCustomDomain,
} from "@/lib/local-cart";

export function useCartSummary() {
  const onCustomDomain = useOnCustomDomain();
  const local = useLocalCartSummary();
  const q = useQuery({
    queryKey: queryKeys.cart.summary,
    queryFn: async () => {
      const res = await apiFetch<{ summary: CartSummary }>("/api/carts");
      return res.summary;
    },
    staleTime: 15_000,
    enabled: !onCustomDomain,
  });
  if (onCustomDomain) {
    return { ...q, data: local, isLoading: false, error: null };
  }
  return q;
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      shopSlug,
      itemId,
    }: {
      shopSlug: string;
      itemId: string;
    }) => {
      if (onCustomDomainNow()) {
        useLocalCart.getState().setQty(shopSlug, itemId, 0);
        return null;
      }
      return apiFetch<{ cart: CartPublic }>(
        `/api/carts/${shopSlug}/items/${itemId}`,
        { method: "DELETE" }
      );
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
    },
  });
}

/** Add to the marketplace cart, or to this browser's cart on a seller's own domain. */
export async function addToShopCart(opts: {
  slug: string;
  product: ProductPublic;
  qty?: number;
  shopName?: string;
  qc: ReturnType<typeof useQueryClient>;
}) {
  const qty = opts.qty ?? 1;
  if (onCustomDomainNow()) {
    if (opts.product.stockQty < qty) throw new Error("Insufficient stock");
    useLocalCart.getState().add(opts.slug, opts.product, qty, opts.shopName);
    return;
  }
  await apiFetch(`/api/carts/${opts.slug}/items`, {
    method: "POST",
    body: JSON.stringify({ productId: opts.product.id, qty }),
  });
  await opts.qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
}

export function invalidateCartQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
}
