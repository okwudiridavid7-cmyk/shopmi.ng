"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ShoppingCart, Trash2 } from "lucide-react";
import type { CartPublic } from "@vendors/shared-types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { formatMoney, productImageUrl } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useCartSummary, useRemoveCartItem } from "@/hooks/use-cart";
import { useUiStore } from "@/stores/ui";

/**
 * Shared cart icon + drawer for marketplace, shop, and buyer shells.
 * Works for guests (session cart) and logged-in buyers.
 */
export function CartNav() {
  const { data: summary, isLoading } = useCartSummary();
  const open = useUiStore((s) => s.cartDrawerOpen);
  const setOpen = useUiStore((s) => s.setCartDrawerOpen);
  const toggle = useUiStore((s) => s.toggleCartDrawer);
  const count = summary?.itemCount ?? 0;

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
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
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
            aria-label="Shopping cart"
            className="absolute right-0 top-full z-50 mt-token-2 w-[min(100vw-1.5rem,22rem)] overflow-hidden rounded-lg border border-border bg-card shadow-lg"
          >
            <div className="flex items-center justify-between border-b border-border px-token-4 py-token-3">
              <p className="text-sm font-medium text-foreground">Your cart</p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto">
              {isLoading ? (
                <div className="p-token-4">
                  <SkeletonLines count={2} />
                </div>
              ) : !summary || summary.carts.length === 0 ? (
                <div className="p-token-4">
                  <EmptyState
                    title="Cart is empty"
                    description="Browse the marketplace and add items from any shop. Carts are per shop."
                    actionLabel="Browse marketplace"
                    actionHref="/"
                  />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {summary.carts.map((cart) => (
                    <CartShopSection
                      key={cart.tenantId}
                      cart={cart}
                      onClose={() => setOpen(false)}
                    />
                  ))}
                </div>
              )}
            </div>
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
  const slug = cart.shopSlug ?? "";

  return (
    <section className="space-y-token-3 p-token-4">
      {cart.shopName && (
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {cart.shopName}
        </p>
      )}
      <ul className="space-y-token-3">
        {cart.items.map((item) => {
          const img = productImageUrl(item.product.images);
          return (
            <li key={item.id} className="flex gap-token-3 text-sm">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-token-1">
                <p className="line-clamp-2 font-medium text-foreground">
                  {item.product.title}
                </p>
                <p className="text-muted-foreground">
                  {formatMoney(item.product.price, item.product.currency)} · Qty{" "}
                  {item.qty}
                </p>
                <button
                  type="button"
                  disabled={removeItem.isPending || !slug}
                  onClick={() =>
                    removeItem.mutate({ shopSlug: slug, itemId: item.id })
                  }
                  aria-label={`Remove ${item.product.title} from cart`}
                  className="inline-flex items-center gap-1 rounded-md p-1 text-danger transition hover:bg-danger/10 disabled:opacity-50 motion-safe:active:scale-95"
                >
                  <Trash2 className="h-4 w-4" aria-hidden />
                  <span className="sr-only">Remove</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="text-sm font-medium text-foreground">
        Subtotal {formatMoney(cart.subtotal, cart.currency)}
      </p>
      <div className="flex flex-wrap gap-token-2">
        {slug && (
          <Link href={`/cart?shop=${slug}`} onClick={onClose}>
            <Button variant="outline" size="sm">
              View Cart
            </Button>
          </Link>
        )}
        {slug && (
          <Link
            href={
              isAuthenticated
                ? `/cart?shop=${slug}`
                : `/login?next=${encodeURIComponent(`/cart?shop=${slug}`)}`
            }
            onClick={onClose}
          >
            <Button variant="primary" size="sm">
              Checkout
            </Button>
          </Link>
        )}
      </div>
    </section>
  );
}
