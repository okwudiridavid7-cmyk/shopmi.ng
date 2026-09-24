"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CartPublic, CartSummary } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useCartSummary() {
  return useQuery({
    queryKey: queryKeys.cart.summary,
    queryFn: async () => {
      const res = await apiFetch<{ summary: CartSummary }>("/api/carts");
      return res.summary;
    },
    staleTime: 15_000,
  });
}

export function useRemoveCartItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      shopSlug,
      itemId,
    }: {
      shopSlug: string;
      itemId: string;
    }) =>
      apiFetch<{ cart: CartPublic }>(
        `/api/carts/${shopSlug}/items/${itemId}`,
        { method: "DELETE" }
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
    },
  });
}

export function invalidateCartQueries(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: queryKeys.cart.summary });
}
