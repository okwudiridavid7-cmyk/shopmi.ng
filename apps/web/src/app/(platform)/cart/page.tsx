"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { CartPublic } from "@vendors/shared-types";
import {
  Minus,
  Plus,
  ShoppingBag,
  Store,
  Trash2,
} from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import {
  apiFetch,
  formatMoney,
  isAuthError,
  productImageUrl,
} from "@/lib/api";
import {
  invalidateCartQueries,
  useCartSummary,
} from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformBranding } from "@/hooks/use-branding";
import { loginUrl } from "@/lib/auth-redirect";
import { beginCheckoutQueue, clearCheckoutQueue } from "@/lib/multi-checkout";
import { useAuthTransition } from "@/stores/auth-transition";
import { cn } from "@/lib/utils";

function currencyPrefix(currency: string) {
  if (currency === "NGN") return "₦";
  if (currency === "USD") return "$";
  return `${currency} `;
}

function CartInner() {
  const search = useSearchParams();
  const shopFilter = search.get("shop") ?? "";
  const qc = useQueryClient();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const branding = usePlatformBranding();
  const show = useAuthTransition((s) => s.show);
  const summaryQ = useCartSummary();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [lineBusy, setLineBusy] = useState<string | null>(null);

  function redirectToLogin(returnPath: string) {
    const dest = loginUrl(returnPath);
    show("session-expired", { nextHref: dest });
    // Hard navigate — soft overlay alone was not reliably reaching /login.
    window.location.assign(dest);
  }

  const carts = useMemo(() => {
    const list = summaryQ.data?.carts ?? [];
    if (!shopFilter) return list.filter((c) => c.items.length > 0);
    return list.filter(
      (c) => c.shopSlug === shopFilter && c.items.length > 0
    );
  }, [summaryQ.data, shopFilter]);

  const itemCount = useMemo(
    () => carts.reduce((n, c) => n + c.items.reduce((s, i) => s + i.qty, 0), 0),
    [carts]
  );

  const currencies = useMemo(
    () => Array.from(new Set(carts.map((c) => c.currency))),
    [carts]
  );
  const mixedCurrency = currencies.length > 1;

  const grandSubtotal = useMemo(() => {
    if (carts.length === 0) return null;
    if (mixedCurrency) return null;
    const currency = currencies[0] ?? "NGN";
    const total = carts.reduce((s, c) => s + c.subtotal, 0);
    return { total, currency };
  }, [carts, currencies, mixedCurrency]);

  const commissionPct = branding.data?.commissionPercent ?? 5;
  const serviceFeeAmount = grandSubtotal
    ? Math.round(grandSubtotal.total * (commissionPct / 100) * 100) / 100
    : 0;

  const reload = useCallback(() => {
    invalidateCartQueries(qc);
  }, [qc]);

  async function updateQty(shopSlug: string, itemId: string, qty: number) {
    setLineBusy(itemId);
    setError(null);
    try {
      if (qty <= 0) {
        await apiFetch(`/api/carts/${shopSlug}/items/${itemId}`, {
          method: "DELETE",
        });
      } else {
        await apiFetch(`/api/carts/${shopSlug}/items/${itemId}`, {
          method: "PATCH",
          body: JSON.stringify({ qty }),
        });
      }
      reload();
    } catch (err) {
      if (!isAuthError(err)) {
        setError(err instanceof Error ? err.message : "Update failed");
      }
    } finally {
      setLineBusy(null);
    }
  }

  async function removeItem(shopSlug: string, itemId: string) {
    setLineBusy(itemId);
    setError(null);
    try {
      await apiFetch(`/api/carts/${shopSlug}/items/${itemId}`, {
        method: "DELETE",
      });
      reload();
    } catch (err) {
      if (!isAuthError(err)) {
        setError(err instanceof Error ? err.message : "Remove failed");
      }
    } finally {
      setLineBusy(null);
    }
  }

  async function startCheckout(shopSlugs: string[]) {
    const returnPath =
      typeof window !== "undefined"
        ? `${window.location.pathname}${window.location.search}`
        : "/cart";

    if (authLoading) return;

    if (!isAuthenticated || !user) {
      redirectToLogin(returnPath);
      return;
    }

    const slugs = shopSlugs.filter(Boolean);
    if (slugs.length === 0) return;

    if (mixedCurrency && slugs.length > 1) {
      setError(
        "Your cart has mixed currencies. Checkout one shop at a time, or remove items so all use the same currency."
      );
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const first = beginCheckoutQueue(slugs);
      if (!first) {
        setBusy(false);
        return;
      }
      const res = await apiFetch<{ authorizationUrl: string }>(
        `/api/checkout/${first}/initialize`,
        { method: "POST" }
      );
      window.location.href = res.authorizationUrl;
    } catch (err) {
      clearCheckoutQueue();
      if (isAuthError(err)) {
        setBusy(false);
        redirectToLogin(returnPath);
        return;
      }
      setError(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  }

  if (summaryQ.isLoading) {
    return <SkeletonLines count={5} />;
  }

  if (summaryQ.isError) {
    return (
      <EmptyState
        kind="load_failed"
        title="Couldn’t load cart"
        description="Check your connection and try again."
        actionLabel="Retry"
        onAction={() => void summaryQ.refetch()}
        secondaryLabel="Browse marketplace"
        secondaryHref="/explore"
      />
    );
  }

  const shopCount = carts.length;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Your cart"
        description={
          itemCount === 0
            ? "Add items from any shop on the marketplace."
            : shopCount > 1
              ? `${itemCount} items across ${shopCount} shops — checkout settles each seller automatically.`
              : `${itemCount} item${itemCount === 1 ? "" : "s"} · pay securely with Paystack`
        }
        icon={ShoppingBag}
        actions={
          <TextLink href="/explore" arrow="left" tone="muted">
            Continue shopping
          </TextLink>
        }
      />

      {shopFilter && carts.length === 0 && (summaryQ.data?.carts.length ?? 0) > 0 ? (
        <p className="rounded-xl border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          No items for this shop.{" "}
          <TextLink href="/cart">View full cart</TextLink>
        </p>
      ) : null}

      {carts.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-8">
          <EmptyState
            kind="empty"
            title="Your cart is empty"
            description="Browse the marketplace and add items from any shop."
            actionLabel="Browse marketplace"
            actionHref="/explore"
          />
        </div>
      ) : (
        <>
          <div className="space-y-4">
            {carts.map((cart) => (
              <ShopCartBlock
                key={cart.tenantId}
                cart={cart}
                lineBusy={lineBusy}
                onUpdateQty={updateQty}
                onRemove={removeItem}
                onCheckoutShop={() =>
                  void startCheckout(
                    cart.shopSlug ? [cart.shopSlug] : []
                  )
                }
                checkoutBusy={busy}
              />
            ))}
          </div>

          <div className="sticky bottom-4 z-10 rounded-2xl border border-border bg-card p-5 shadow-lg">
            {mixedCurrency ? (
              <p className="mb-3 text-sm text-amber-700 dark:text-amber-400">
                Mixed currencies — use “Checkout this shop” on each section, or
                keep one currency in the cart for a single multi-vendor flow.
              </p>
            ) : null}

            {grandSubtotal ? (
              <div className="mb-3 space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Subtotal ({itemCount} item{itemCount === 1 ? "" : "s"}
                    {shopCount > 1 ? ` · ${shopCount} shops` : ""})
                  </span>
                  <span className="font-medium text-foreground">
                    {formatMoney(grandSubtotal.total, grandSubtotal.currency)}
                  </span>
                </div>
                {serviceFeeAmount > 0 ? (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Shopmi Service Fee ({commissionPct}%)
                    </span>
                    <span className="font-medium text-foreground">
                      {currencyPrefix(grandSubtotal.currency)}
                      {serviceFeeAmount.toFixed(2)}
                    </span>
                  </div>
                ) : null}
                <p className="text-[11px] text-muted-foreground">
                  Fee is included in each shop payment and settled to Shopmi;
                  verified sellers receive the rest via Paystack subaccounts.
                </p>
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-sm font-semibold text-foreground">
                    Total
                  </span>
                  <span className="text-lg font-bold text-foreground">
                    {formatMoney(grandSubtotal.total, grandSubtotal.currency)}
                  </span>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="mb-3 text-sm text-danger">{error}</p>
            ) : null}

            <Button
              type="button"
              variant="primary"
              size="lg"
              className="h-12 w-full"
              disabled={
                busy || authLoading || carts.length === 0 || mixedCurrency
              }
              onClick={() =>
                void startCheckout(
                  carts
                    .map((c) => c.shopSlug)
                    .filter((s): s is string => Boolean(s))
                )
              }
            >
              {authLoading
                ? "Checking session…"
                : busy
                ? shopCount > 1
                  ? "Starting payments…"
                  : "Redirecting…"
                : shopCount > 1
                  ? `Checkout all shops (${shopCount})`
                  : "Checkout with Paystack"}
            </Button>
            {shopCount > 1 && !mixedCurrency ? (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                You’ll complete one Paystack payment per shop — we chain them
                automatically so each vendor is settled separately.
              </p>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}

function ShopCartBlock({
  cart,
  lineBusy,
  onUpdateQty,
  onRemove,
  onCheckoutShop,
  checkoutBusy,
}: {
  cart: CartPublic;
  lineBusy: string | null;
  onUpdateQty: (slug: string, itemId: string, qty: number) => void;
  onRemove: (slug: string, itemId: string) => void;
  onCheckoutShop: () => void;
  checkoutBusy: boolean;
}) {
  const slug = cart.shopSlug ?? "";

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/30 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <Store className="h-4 w-4 shrink-0 text-accent" aria-hidden />
          {slug ? (
            <Link
              href={`/shops/${slug}`}
              className="truncate font-semibold text-foreground hover:text-accent"
            >
              {cart.shopName ?? slug}
            </Link>
          ) : (
            <span className="font-semibold text-foreground">
              {cart.shopName ?? "Shop"}
            </span>
          )}
        </div>
        <p className="text-sm font-medium text-foreground">
          {formatMoney(cart.subtotal, cart.currency)}
        </p>
      </div>

      <ul className="divide-y divide-border">
        {cart.items.map((item) => {
          const img = productImageUrl(item.product.images);
          return (
            <li key={item.id} className="flex gap-3 px-4 py-3.5">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-medium text-foreground">
                    {item.product.title}
                  </p>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {formatMoney(
                      item.product.price * item.qty,
                      item.product.currency
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-lg border border-border">
                    <button
                      type="button"
                      disabled={lineBusy === item.id || !slug}
                      className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      aria-label="Decrease"
                      onClick={() =>
                        void onUpdateQty(slug, item.id, item.qty - 1)
                      }
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <span className="min-w-[1.5rem] text-center text-sm font-medium tabular-nums">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      disabled={lineBusy === item.id || !slug}
                      className="p-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
                      aria-label="Increase"
                      onClick={() =>
                        void onUpdateQty(slug, item.id, item.qty + 1)
                      }
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={lineBusy === item.id || !slug}
                    onClick={() => void onRemove(slug, item.id)}
                    className={cn(
                      "inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition",
                      "hover:border-danger/40 hover:text-danger disabled:opacity-50"
                    )}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="border-t border-border px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={checkoutBusy || !slug}
          onClick={onCheckoutShop}
        >
          Checkout this shop only
        </Button>
      </div>
    </section>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<SkeletonLines count={5} />}>
      <CartInner />
    </Suspense>
  );
}
