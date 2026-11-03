"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { OrderPublic } from "@vendors/shared-types";
import { ShoppingBag } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiFetch, formatMoney } from "@/lib/api";

function AdminOrdersInner() {
  const searchParams = useSearchParams();
  const initialQ = (searchParams.get("q") ?? "").trim();
  const [needsAttention, setNeedsAttention] = useState(!initialQ);
  const [q, setQ] = useState(initialQ);
  const [submitted, setSubmitted] = useState(initialQ);

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (needsAttention) p.set("needsAttention", "1");
    if (submitted) p.set("q", submitted);
    return p.toString();
  }, [needsAttention, submitted]);

  const ordersQ = useQuery({
    queryKey: ["admin", "orders", query],
    queryFn: () =>
      apiFetch<{ orders: OrderPublic[] }>(`/api/admin/orders?${query}`),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Flagged payments, failed refunds, and search across shops."
        icon={ShoppingBag}
      />

      <Card className="overflow-hidden rounded-2xl">
        <CardBody className="flex flex-wrap items-end gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={needsAttention}
              onChange={(e) => setNeedsAttention(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            Needs attention only
          </label>
          <Input
            className="max-w-xs"
            placeholder="Email, slug, reference…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSubmitted(q.trim());
            }}
          />
          <Button type="button" size="sm" onClick={() => setSubmitted(q.trim())}>
            Search
          </Button>
        </CardBody>
      </Card>

      {ordersQ.isLoading ? (
        <SkeletonLines count={5} />
      ) : ordersQ.isError ? (
        <QueryErrorState
          error={ordersQ.error}
          onRetry={() => void ordersQ.refetch()}
        />
      ) : (ordersQ.data?.orders.length ?? 0) === 0 ? (
        <EmptyState
          kind="empty"
          title="No matching orders"
          description="Flagged mismatches and failed refunds show up here."
        />
      ) : (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              {ordersQ.data!.orders.length} order
              {ordersQ.data!.orders.length === 1 ? "" : "s"}
            </p>
          </CardHeader>
          <CardBody className="divide-y divide-border p-0">
            {ordersQ.data!.orders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-start justify-between gap-3 px-4 py-3 text-sm"
              >
                <div className="min-w-0 space-y-1">
                  <p className="font-medium text-foreground">
                    {o.tenant?.name ?? "Shop"} · {formatMoney(o.total, o.currency)}
                  </p>
                  <p className="text-muted-foreground">
                    {o.buyer?.email ?? "Buyer"} · {o.status.replace(/_/g, " ")}
                    {o.flag ? ` · flag: ${o.flag}` : ""}
                    {o.refundStatus ? ` · refund: ${o.refundStatus}` : ""}
                  </p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {o.paystackReference ?? o.id}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                  <span>{new Date(o.createdAt).toLocaleString()}</span>
                  {o.tenant?.slug ? (
                    <Link
                      href={`/admin/tenants`}
                      className="text-accent hover:underline"
                    >
                      {o.tenant.slug}
                    </Link>
                  ) : null}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <Suspense fallback={<SkeletonLines count={5} />}>
      <AdminOrdersInner />
    </Suspense>
  );
}
