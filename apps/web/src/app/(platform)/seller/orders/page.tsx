"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { OrderPublic } from "@vendors/shared-types";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import {
  emptyOrderFilters,
  FilterDrawer,
  SellerOrderFilterPanel,
  type SellerOrderFilters,
} from "@/components/seller-filters";
import { formatMoney } from "@/lib/api";
import { useSellerOrders } from "@/hooks/use-seller";

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
}

function statusClass(status: string) {
  if (status === "paid" || status === "fulfilled")
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  if (status === "pending_payment")
    return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  if (status === "cancelled" || status === "failed")
    return "bg-red-500/15 text-red-800 dark:text-red-300";
  return "bg-muted text-muted-foreground";
}

function buyerLabel(order: OrderPublic) {
  return order.buyer?.name?.trim() || order.buyer?.email || "Buyer";
}

export default function SellerOrdersPage() {
  const { data: orders = [], isLoading, error } = useSellerOrders();
  const [filters, setFilters] = useState<SellerOrderFilters>(emptyOrderFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const filtered = useMemo(() => {
    return orders.filter((o) => {
      if (filters.status && o.status !== filters.status) return false;
      const created = new Date(o.createdAt).getTime();
      if (filters.from) {
        const from = new Date(`${filters.from}T00:00:00`).getTime();
        if (created < from) return false;
      }
      if (filters.to) {
        const to = new Date(`${filters.to}T23:59:59`).getTime();
        if (created > to) return false;
      }
      return true;
    });
  }, [orders, filters]);

  function setFilter<K extends keyof SellerOrderFilters>(
    key: K,
    value: SellerOrderFilters[K]
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orders"
        description="Orders for this shop — update fulfillment status from the detail view."
        icon={ShoppingBag}
        actions={
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
          >
            Filters
          </Button>
        }
      />

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <SellerOrderFilterPanel
          filters={filters}
          setFilter={setFilter}
          clearFilters={() => setFilters(emptyOrderFilters)}
        />
      </FilterDrawer>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden rounded-2xl border border-border bg-card p-4 lg:block">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Filters
          </h2>
          <SellerOrderFilterPanel
            filters={filters}
            setFilter={setFilter}
            clearFilters={() => setFilters(emptyOrderFilters)}
          />
        </aside>

        <div className="min-w-0">
          {error ? (
            <QueryErrorState
              error={error}
              onRetry={() => window.location.reload()}
            />
          ) : isLoading ? (
            <SkeletonLines count={4} />
          ) : orders.length === 0 ? (
            <EmptyState kind="orders" />
          ) : filtered.length === 0 ? (
            <EmptyState
              kind="empty_filtered"
              title="No orders match these filters"
              description="Try a wider date range or clear the status filter."
              actionLabel="Clear filters"
              onAction={() => setFilters(emptyOrderFilters)}
            />
          ) : (
            <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
              {filtered.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-foreground">
                        {buyerLabel(o)}
                      </span>
                      <span
                        className={`rounded-sm px-2 py-0.5 text-xs capitalize ${statusClass(o.status)}`}
                      >
                        {statusLabel(o.status)}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {formatMoney(o.total, o.currency)} ·{" "}
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <Link href={`/seller/orders/${o.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
