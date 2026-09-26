"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Heart, Minus, Plus, ShoppingCart, X } from "lucide-react";
import type { CartPublic } from "@vendors/shared-types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { formatMoney, productImageUrl, apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import {
  invalidateCartQueries,
  useCartSummary,
  useRemoveCartItem,
} from "@/hooks/use-cart";
import { useQueryClient } from "@tanstack/react-query";
import { useUiStore } from "@/stores/ui";

/**
 * Cart Overview dropdown — header, subtotal + CTAs, scrollable lines with qty.
 */
export function CartNav() {
  const { data: summary, isLoading } = useCartSummary();
  const open = useUiStore((s) => s.cartDrawerOpen);
  const setOpen = useUiStore((s) => s.setCartDrawerOpen);
  const toggle = useUiStore((s) => s.toggleCartDrawer);
  const count = summary?.itemCount ?? 0;

  const grandSubtotal = useMemo(() => {
    if (!summary?.carts.length) return null;
    const currency = summary.carts[0]?.currency ?? "NGN";
    const total = summary.carts.reduce((s, c) => s + c.subtotal, 0);
    return { total, currency };
  }, [summary]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggle}
        data-tour="nav-cart"
        aria-label={count > 0 ? `Cart, ${count} items` : "Cart"}
        aria-expanded={open}
        className="relative rounded-md p-token-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <ShoppingCart className="h-5 w-5" aria-hidden />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default bg-foreground/20"
            aria-label="Close cart"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Cart Overview"
            className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-1rem,24rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3.5">
              <p className="text-base font-bold text-foreground">
                Cart Overview
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                aria-label="Close cart"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            {isLoading ? (
              <div className="p-4">
                <SkeletonLines count={2} />
              </div>
            ) : !summary || summary.carts.length === 0 ? (
              <div className="p-4">
                <EmptyState
                  title="Cart is empty"
                  description="Browse the marketplace and add items from any shop."
                  actionLabel="Browse marketplace"
                  actionHref="/explore"
                />
              </div>
            ) : (
              <>
                <div className="space-y-3 border-b border-border px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <span className="relative text-emerald-600 dark:text-emerald-400">
                        <ShoppingCart className="h-5 w-5" aria-hidden />
                        <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-bold text-white">
                          {count}
                        </span>
                      </span>
                      Cart
                    </div>
                    {grandSubtotal ? (
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Subtotal</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatMoney(
                            grandSubtotal.total,
                            grandSubtotal.currency
                          )}
                        </p>
                      </div>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link
                      href="/cart"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-11 items-center justify-center rounded-full border-2 border-accent text-sm font-semibold text-accent transition hover:bg-accent/5 dark:text-accent-on-dark"
                    >
                      Go to Cart
                    </Link>
                    <Link
                      href="/cart"
                      onClick={() => setOpen(false)}
                      className="inline-flex h-11 items-center justify-center rounded-full bg-accent text-sm font-semibold text-white transition hover:bg-accent-deep"
                    >
                      Checkout ({count})
                    </Link>
                  </div>
                </div>

                <div className="max-h-[min(50vh,22rem)] overflow-y-auto">
                  {summary.carts.map((cart) => (
                    <CartShopSection
                      key={cart.tenantId}
                      cart={cart}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </div>

                <p className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
                  {summary.carts.length > 1
                    ? "Checkout settles each shop separately via Paystack — we chain payments for you."
                    : "Review items on the cart page, then pay securely with Paystack."}
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function CartShopSection({
  cart,
  onClose,
}: {
  cart: CartPublic;
  onClose: () => void;
}) {
  const { isAuthenticated } = useAuth();
  const removeItem = useRemoveCartItem();
  const qc = useQueryClient();
  const slug = cart.shopSlug ?? "";
  const [busyId, setBusyId] = useState<string | null>(null);

  async function updateQty(itemId: string, qty: number) {
    if (!slug) return;
    setBusyId(itemId);
    try {
      if (qty <= 0) {
        await removeItem.mutateAsync({ shopSlug: slug, itemId });
      } else {
        await apiFetch(`/api/carts/${slug}/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ qty }),
        });
        invalidateCartQueries(qc);
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="divide-y divide-border">
      {cart.shopName ? (
        <p className="px-4 pt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {cart.shopName}
        </p>
      ) : null}
      {cart.items.map((item) => {
        const img = productImageUrl(item.product.images);
        return (
          <div key={item.id} className="space-y-3 px-4 py-3.5">
            <div className="flex gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm font-medium text-foreground">
                  {item.product.title}
                </p>
                <p className="mt-0.5 text-base font-bold text-foreground">
                  {formatMoney(item.product.price, item.product.currency)}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center rounded-lg border border-border">
                <button
                  type="button"
                  disabled={busyId === item.id}
                  className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label="Decrease"
                  onClick={() => void updateQty(item.id, item.qty - 1)}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums">
                  {item.qty}
                </span>
                <button
                  type="button"
                  disabled={busyId === item.id}
                  className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                  aria-label="Increase"
                  onClick={() => void updateQty(item.id, item.qty + 1)}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
                onClick={onClose}
              >
                <Heart className="h-3.5 w-3.5" />
                Save for Later
              </button>
              <button
                type="button"
                disabled={removeItem.isPending || !slug}
                onClick={() =>
                  removeItem.mutate({ shopSlug: slug, itemId: item.id })
                }
                className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-danger/40 hover:text-danger disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2 px-4 py-3">
        <Link href="/cart" onClick={onClose}>
          <Button variant="outline" size="sm">
            View cart
          </Button>
        </Link>
        <Link
          href={
            isAuthenticated
              ? "/cart"
              : `/login?next=${encodeURIComponent("/cart")}`
          }
          onClick={onClose}
        >
          <Button variant="primary" size="sm">
            Checkout
          </Button>
        </Link>
      </div>
    </section>
  );
}
