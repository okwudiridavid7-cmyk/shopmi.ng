"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import type { OrderPublic } from "@vendors/shared-types";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TrustBadge } from "@/components/shell/trust-badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/api";
import { useBuyerOrders } from "@/hooks/use-buyer";
import { useAppName } from "@/hooks/use-branding";

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

export default function BuyerOrdersListPage() {
  const { data: orders = [], error, isLoading } = useBuyerOrders();
  const appName = useAppName();

  return (
    <div className="space-y-token-4">
      <div>
        <h1 className="font-display text-2xl text-foreground">Orders</h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Every purchase across shops{appName ? ` on ${appName}` : ""}.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load"}{" "}
          <Link href="/login" className="text-accent underline">
            Log in
          </Link>
        </p>
      ) : isLoading ? (
        <SkeletonLines count={4} />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Your order history will live here once you complete a checkout. Explore shops and find something you love."
          actionLabel="Browse marketplace"
          actionHref="/"
          icon={ShoppingBag}
        />
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-card">
          {orders.map((o) => (
            <OrderRow key={o.id} order={o} />
          ))}
        </ul>
      )}
    </div>
  );
}

function OrderRow({ order }: { order: OrderPublic }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-token-3 px-token-4 py-token-3 text-sm">
      <div className="min-w-0 space-y-token-1">
        <div className="flex flex-wrap items-center gap-token-2">
          {order.tenant ? (
            <Link
              href={`/shops/${order.tenant.slug}`}
              className="font-medium hover:underline"
            >
              {order.tenant.name}
            </Link>
          ) : (
            <span className="font-medium">Shop</span>
          )}
          {order.tenant && (
            <TrustBadge verified={!!order.tenant.verifiedBadge} />
          )}
          <span
            className={`rounded-sm px-token-2 py-0.5 text-xs capitalize ${statusClass(order.status)}`}
          >
            {statusLabel(order.status)}
          </span>
        </div>
        <p className="text-muted-foreground">
          {formatMoney(order.total, order.currency)} ·{" "}
          {new Date(order.createdAt).toLocaleString()} · {order.items.length}{" "}
          item{order.items.length === 1 ? "" : "s"}
        </p>
      </div>
      <Link href={`/buyer/orders/${order.id}`}>
        <Button variant="outline" size="sm">
          View
        </Button>
      </Link>
    </li>
  );
}
