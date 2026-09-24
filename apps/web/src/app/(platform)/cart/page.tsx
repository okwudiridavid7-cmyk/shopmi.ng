"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { CartPublic } from "@vendors/shared-types";
import { apiFetch, formatMoney, productImageUrl } from "@/lib/api";

function CartInner() {
  const search = useSearchParams();
  const shop = search.get("shop") ?? "";
  const [cart, setCart] = useState<CartPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function load() {
    if (!shop) return;
    apiFetch<{ cart: CartPublic }>(`/api/carts/${shop}`)
      .then((res) => setCart(res.cart))
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed");
      });
  }

  useEffect(load, [shop]);

  async function updateQty(itemId: string, qty: number) {
    await apiFetch(`/api/carts/${shop}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ qty }),
    });
    load();
  }

  async function checkout() {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<{
        authorizationUrl: string;
      }>(`/api/checkout/${shop}/initialize`, { method: "POST" });
      window.location.href = res.authorizationUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  if (!shop) {
    return (
      <p className="text-muted-foreground">
        Missing shop. Open a cart from a shop page.
      </p>
    );
  }

  if (error && !cart) {
    return <p className="text-red-700 dark:text-red-400">{error}</p>;
  }

  if (!cart) {
    return <p className="text-muted-foreground">Loading cart…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-token-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl">Cart</h1>
        <Link href={`/shops/${shop}`} className="text-sm text-accent underline">
          Continue shopping
        </Link>
      </div>

      {cart.items.length === 0 ? (
        <p className="text-muted-foreground">Your cart is empty.</p>
      ) : (
        <ul className="space-y-token-4">
          {cart.items.map((item) => {
            const img = productImageUrl(item.product.images);
            return (
              <li
                key={item.id}
                className="flex gap-4 rounded-lg border border-border bg-card p-token-4"
              >
                <div className="h-20 w-20 overflow-hidden rounded-md bg-muted">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <p className="font-medium">{item.product.title}</p>
                  <p className="text-sm text-accent">
                    {formatMoney(item.product.price, item.product.currency)}
                  </p>
                  <div className="flex items-center gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, Math.max(0, item.qty - 1))}
                      className="rounded border border-border px-2"
                    >
                      −
                    </button>
                    <span>{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.id, item.qty + 1)}
                      className="rounded border border-border px-2"
                    >
                      +
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {cart.items.length > 0 && (
        <div className="space-y-token-3 border-t border-border pt-token-4">
          <p className="text-lg font-semibold">
            Subtotal: {formatMoney(cart.subtotal, cart.currency)}
          </p>
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={checkout}
            className="w-full rounded-md bg-accent py-3 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Redirecting to Paystack…" : "Checkout with Paystack"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <CartInner />
    </Suspense>
  );
}
