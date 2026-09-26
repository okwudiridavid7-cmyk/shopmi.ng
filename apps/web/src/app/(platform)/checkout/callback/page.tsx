"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { OrderPublic } from "@vendors/shared-types";
import { CheckCircle2, Download, Loader2, ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { apiFetch, apiUrl, formatMoney, isAuthError } from "@/lib/api";
import {
  advanceCheckoutQueue,
  checkoutProgress,
  clearCheckoutQueue,
  readCheckoutQueue,
} from "@/lib/multi-checkout";

type Phase =
  | "verifying"
  | "continuing"
  | "done"
  | "error";

function CallbackInner() {
  const search = useSearchParams();
  const reference = search.get("reference") ?? "";
  const shop = search.get("shop") ?? "";
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("verifying");
  const [progress, setProgress] = useState(() => checkoutProgress());
  const [paidOrders, setPaidOrders] = useState<
    { slug: string; reference: string }[]
  >([]);

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference");
      setPhase("error");
      return;
    }

    let cancelled = false;

    async function run() {
      try {
        const res = await apiFetch<{ order: OrderPublic }>(
          `/api/checkout/verify/${reference}`
        );
        if (cancelled) return;
        setOrder(res.order);

        const paid =
          res.order.status === "paid" || res.order.status === "fulfilled";
        if (!paid) {
          setPhase("done");
          return;
        }

        const slug =
          shop ||
          res.order.tenant?.slug ||
          readCheckoutQueue()?.pending[0] ||
          "";

        const nextSlug = slug
          ? advanceCheckoutQueue(slug, reference)
          : null;

        const queue = readCheckoutQueue();
        setPaidOrders(queue?.paid ?? (slug ? [{ slug, reference }] : []));
        setProgress(checkoutProgress());

        if (nextSlug) {
          setPhase("continuing");
          const init = await apiFetch<{ authorizationUrl: string }>(
            `/api/checkout/${nextSlug}/initialize`,
            { method: "POST" }
          );
          if (cancelled) return;
          window.location.href = init.authorizationUrl;
          return;
        }

        clearCheckoutQueue();
        setPhase("done");
      } catch (err) {
        if (cancelled) return;
        if (isAuthError(err)) {
          setError("Sign in to confirm your payment.");
        } else {
          setError(
            err instanceof Error ? err.message : "Verification failed"
          );
        }
        setPhase("error");
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [reference, shop]);

  if (phase === "error") {
    return (
      <div className="mx-auto max-w-lg space-y-6">
        <PageHeader
          title="Payment check"
          description="We couldn’t confirm this payment yet."
          icon={ShoppingBag}
        />
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
        <div className="flex flex-wrap gap-4">
          <TextLink href="/cart" arrow="left" tone="muted">
            Back to cart
          </TextLink>
          <TextLink href="/explore" tone="muted">
            Marketplace
          </TextLink>
        </div>
      </div>
    );
  }

  if (phase === "verifying" || !order) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <SkeletonLines count={3} />
        <p className="text-center text-sm text-muted-foreground">
          Confirming payment with Paystack…
        </p>
      </div>
    );
  }

  if (phase === "continuing") {
    const step = progress
      ? progress.paidCount + 1
      : 1;
    const total = progress?.total ?? 1;
    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
          <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
        </div>
        <div className="space-y-2">
          <h1 className="text-xl font-bold tracking-tight">
            Settling next vendor…
          </h1>
          <p className="text-sm text-muted-foreground">
            Payment {step} of {total} confirmed. Redirecting to Paystack for the
            next shop so each seller is paid separately.
          </p>
        </div>
      </div>
    );
  }

  const paid = order.status === "paid" || order.status === "fulfilled";
  const multi = paidOrders.length > 1 || (progress && progress.total > 1);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title={
          paid
            ? multi
              ? "All payments successful"
              : "Payment successful"
            : "Payment pending"
        }
        description={
          multi && paid
            ? `${paidOrders.length || 1} shop order${(paidOrders.length || 1) === 1 ? "" : "s"} settled.`
            : `Order ${order.id.slice(0, 8)}… · ${order.status}`
        }
        icon={paid ? CheckCircle2 : ShoppingBag}
      />

      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <p className="text-2xl font-semibold text-foreground">
          {formatMoney(order.total, order.currency)}
          {order.tenant?.name ? (
            <span className="mt-1 block text-sm font-normal text-muted-foreground">
              {order.tenant.name}
            </span>
          ) : null}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {paid
            ? multi
              ? "Thanks — each vendor was paid in a separate Paystack settlement."
              : "Thanks — your order is confirmed."
            : "We’re still confirming with Paystack. Refresh in a moment if this doesn’t update."}
        </p>

        {paidOrders.length > 1 ? (
          <ul className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm text-muted-foreground">
            {paidOrders.map((p) => (
              <li key={p.reference} className="flex justify-between gap-2">
                <span className="font-medium text-foreground">{p.slug}</span>
                <span className="truncate text-xs">{p.reference}</span>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          {paid ? (
            <a href={apiUrl(`/api/orders/${order.id}/invoice`)}>
              <Button variant="primary" size="md">
                <Download className="h-4 w-4" aria-hidden />
                Download invoice
              </Button>
            </a>
          ) : null}
          <TextLink href="/buyer/orders" arrow="right">
            View orders
          </TextLink>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <TextLink href="/buyer" tone="muted">
          Buyer dashboard
        </TextLink>
        <TextLink href="/explore" tone="muted" arrow="right">
          Marketplace
        </TextLink>
      </div>
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={<SkeletonLines count={3} />}>
      <CallbackInner />
    </Suspense>
  );
}
