"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { OrderPublic, ProductPublic, UserPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";

export function useBuyerOrders() {
  return useQuery({
    queryKey: queryKeys.buyer.orders,
    queryFn: async () => {
      const res = await apiFetch<{ orders: OrderPublic[] }>("/api/buyer/orders");
      return res.orders;
    },
    refetchInterval: 4 * 60 * 1000,
  });
}

export function useBuyerOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.buyer.order(id),
    queryFn: async () => {
      const res = await apiFetch<{ order: OrderPublic }>(
        `/api/buyer/orders/${id}`
      );
      return res.order;
    },
    enabled: !!id,
  });
}

export function useBuyerFavorites() {
  return useQuery({
    queryKey: queryKeys.buyer.favorites,
    queryFn: async () => {
      const res = await apiFetch<{
        favorites: { id: string; product: ProductPublic }[];
      }>("/api/buyer/favorites");
      return res.favorites;
    },
    refetchInterval: 4 * 60 * 1000,
  });
}

export function useBuyerMe() {
  return useQuery({
    queryKey: queryKeys.buyer.me,
    queryFn: async () => {
      const res = await apiFetch<{ user: UserPublic }>("/api/buyer/me");
      return res.user;
    },
  });
}

export function useRemoveFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) =>
      apiFetch(`/api/buyer/favorites/${productId}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.buyer.favorites });
    },
  });
}

export function useUpdateBuyerProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name?: string | null;
      phone?: string | null;
      whatsappNumber?: string | null;
      notificationPrefs?: { orderEmails?: boolean; whatsappOrders?: boolean };
    }) =>
      apiFetch<{ user: UserPublic }>("/api/buyer/me", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.buyer.me });
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (body: { currentPassword: string; newPassword: string }) =>
      apiFetch("/api/buyer/me/password", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
