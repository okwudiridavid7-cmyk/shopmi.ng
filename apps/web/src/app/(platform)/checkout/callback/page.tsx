"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { OrderPublic } from "@vendors/shared-types";
import { apiFetch, apiUrl, formatMoney } from "@/lib/api";

function CallbackInner() {
  const search = useSearchParams();
  const reference = search.get("reference") ?? "";
  const [order, setOrder] = useState<OrderPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference");
      return;
    }
    apiFetch<{ order: OrderPublic }>(`/api/checkout/verify/${reference}`)
      .then((res) => setOrder(res.order))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Verification failed")
      );
  }, [reference]);

  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl">Payment check</h1>
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <Link href="/" className="text-accent underline">
          Back to marketplace
        </Link>
      </div>
    );
  }

  if (!order) {
    return <p className="text-muted-foreground">Confirming payment…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-token-4">
      <h1 className="font-display text-3xl">
        {order.status === "paid" || order.status === "fulfilled"
          ? "Payment successful"
          : "Payment pending"}
      </h1>
      <p className="text-muted-foreground">
        Order <code>{order.id}</code> — {order.status}
      </p>
      <p className="text-lg font-semibold">
        {formatMoney(order.total, order.currency)}
      </p>
      {(order.status === "paid" || order.status === "fulfilled") && (
        <a
          href={apiUrl(`/api/orders/${order.id}/invoice`)}
          className="inline-block rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
        >
          Download invoice
        </a>
      )}
      <div className="flex gap-4 text-sm">
        <Link href="/buyer" className="text-accent underline">
          Buyer dashboard
        </Link>
        <Link href="/" className="text-muted-foreground underline">
          Marketplace
        </Link>
      </div>
    </div>
  );
}

export default function CheckoutCallbackPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <CallbackInner />
    </Suspense>
  );
}
