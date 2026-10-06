"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { apiFetch, friendlyErrorMessage } from "@/lib/api";
import { invalidateCartQueries } from "@/hooks/use-cart";
import { CART_IMPORT_NOTES_KEY, shopReturnKey } from "@/lib/cart-handoff";

type Skipped = { productId: string; title?: string; reason: string };

function parseItems(raw: string) {
  return raw
    .split(",")
    .map((pair) => {
      const [productId, qty] = pair.split(":");
      return { productId: productId?.trim() ?? "", qty: Number.parseInt(qty ?? "1", 10) || 1 };
    })
    .filter((i) => i.productId)
    .slice(0, 50);
}

function safeReturnUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null;
  } catch {
    return null;
  }
}

/** Receives a cart from a seller's own domain and continues to the marketplace cart. */
function CartImportInner() {
  const search = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const shop = (search.get("shop") ?? "").toLowerCase();
  const items = parseItems(search.get("items") ?? "");
  const requestedReturn = safeReturnUrl(search.get("return"));
  const [returnUrl, setReturnUrl] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!shop || items.length === 0) {
      router.replace(shop ? `/cart?shop=${encodeURIComponent(shop)}` : "/cart");
      return;
    }
    apiFetch<{ skipped: Skipped[]; shopOrigin: string | null }>(
      `/api/carts/${encodeURIComponent(shop)}/import`,
      {
        method: "POST",
        body: JSON.stringify({ items }),
      }
    )
      .then((res) => {
        // Only link back to the shop's own verified domain, never an arbitrary site.
        if (requestedReturn && requestedReturn === res.shopOrigin) {
          sessionStorage.setItem(shopReturnKey(shop), requestedReturn);
          setReturnUrl(requestedReturn);
        }
        if (res.skipped.length) {
          sessionStorage.setItem(CART_IMPORT_NOTES_KEY, JSON.stringify(res.skipped));
        }
        invalidateCartQueries(qc);
        router.replace(`/cart?shop=${encodeURIComponent(shop)}`);
      })
      .catch((err) => {
        setError(friendlyErrorMessage(err, "We couldn't load your cart."));
      });
    // Runs once per handoff link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-8">
        <EmptyState
          kind="load_failed"
          title="We couldn't bring your cart over"
          description={error}
          actionLabel={returnUrl ? "Back to the shop" : "Browse marketplace"}
          actionHref={returnUrl ?? "/explore"}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg space-y-3 py-10 text-center">
      <p className="text-sm font-medium text-foreground">Loading your cart…</p>
      <SkeletonLines count={3} />
    </div>
  );
}

export default function CartImportPage() {
  return (
    <Suspense fallback={<SkeletonLines count={3} />}>
      <CartImportInner />
    </Suspense>
  );
}
