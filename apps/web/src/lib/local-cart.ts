"use client";

import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartSummary, ProductPublic } from "@vendors/shared-types";
import { isCustomDomainHost, platformOrigin } from "@/lib/shop-host";

/**
 * Cart for shoppers on a seller's own domain. Platform cookies don't reach
 * custom domains reliably, so items stay in this browser and move to the
 * marketplace cart at checkout (see /cart/import).
 */
type LocalCartLine = { product: ProductPublic; qty: number };

type LocalCartState = {
  shops: Record<string, { shopName?: string; lines: LocalCartLine[] }>;
  add: (slug: string, product: ProductPublic, qty: number, shopName?: string) => void;
  setQty: (slug: string, productId: string, qty: number) => void;
  clear: (slug: string) => void;
};

export const useLocalCart = create<LocalCartState>()(
  persist(
    (set) => ({
      shops: {},
      add: (slug, fullProduct, qty, shopName) =>
        set((s) => {
          const product = { ...fullProduct, description: "" };
          const shop = s.shops[slug] ?? { lines: [] };
          const existing = shop.lines.find((l) => l.product.id === product.id);
          const cap = Math.max(1, Math.min(99, product.stockQty || 99));
          const lines = existing
            ? shop.lines.map((l) =>
                l.product.id === product.id
                  ? { product, qty: Math.min(cap, l.qty + qty) }
                  : l
              )
            : [...shop.lines, { product, qty: Math.min(cap, qty) }];
          return {
            shops: { ...s.shops, [slug]: { shopName: shopName ?? shop.shopName, lines } },
          };
        }),
      setQty: (slug, productId, qty) =>
        set((s) => {
          const shop = s.shops[slug];
          if (!shop) return s;
          const lines =
            qty <= 0
              ? shop.lines.filter((l) => l.product.id !== productId)
              : shop.lines.map((l) =>
                  l.product.id === productId ? { ...l, qty: Math.min(99, qty) } : l
                );
          return { shops: { ...s.shops, [slug]: { ...shop, lines } } };
        }),
      clear: (slug) =>
        set((s) => {
          const shops = { ...s.shops };
          delete shops[slug];
          return { shops };
        }),
    }),
    { name: "shopmi-local-cart-v1" }
  )
);

/** Client-only: false during SSR and the first render to avoid hydration mismatches. */
export function useOnCustomDomain(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    setOn(isCustomDomainHost(window.location.host));
  }, []);
  return on;
}

export function onCustomDomainNow(): boolean {
  return typeof window !== "undefined" && isCustomDomainHost(window.location.host);
}

/** Same shape as the API cart summary so the cart drawer can render either. */
export function useLocalCartSummary(): CartSummary {
  const shops = useLocalCart((s) => s.shops);
  const carts = Object.entries(shops)
    .filter(([, shop]) => shop.lines.length > 0)
    .map(([slug, shop]) => {
      const items = shop.lines.map((l) => ({
        id: l.product.id,
        productId: l.product.id,
        qty: l.qty,
        product: l.product,
      }));
      return {
        id: null,
        tenantId: items[0]?.product.tenantId ?? slug,
        shopSlug: slug,
        shopName: shop.shopName,
        items,
        subtotal: items.reduce((sum, i) => sum + i.product.price * i.qty, 0),
        currency: items[0]?.product.currency ?? "NGN",
        available: true,
      };
    });
  return {
    itemCount: carts.reduce((n, c) => n + c.items.reduce((s, i) => s + i.qty, 0), 0),
    carts,
  };
}

/** Marketplace URL that loads this browser's cart for a shop, then opens checkout. */
export function localCartHandoffUrl(slug: string): string {
  const shop = useLocalCart.getState().shops[slug];
  const items = (shop?.lines ?? []).map((l) => `${l.product.id}:${l.qty}`).join(",");
  const params = new URLSearchParams({ shop: slug, items });
  if (typeof window !== "undefined") params.set("return", window.location.origin);
  return `${platformOrigin()}/cart/import?${params.toString()}`;
}

/** Send the shopper to the marketplace with their cart; clears the local copy. */
export function goToLocalCheckout(slug: string) {
  const url = localCartHandoffUrl(slug);
  useLocalCart.getState().clear(slug);
  window.location.href = url;
}
