"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  Heart,
  Package,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import {
  AdminHero,
  AdminHeroMetric,
} from "@/components/dashboard/admin/admin-hero";
import { AdminMetricCard } from "@/components/dashboard/admin/admin-metric-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/shell/trust-badge";
import { formatMoney } from "@/lib/api";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { useAuth } from "@/hooks/use-auth";
import { useBuyerFavorites, useBuyerOrders } from "@/hooks/use-buyer";

const ACTIVE = new Set(["pending_payment", "paid"]);

export default function BuyerDashboardPage() {
  const { user } = useAuth();
  const ordersQ = useBuyerOrders();
  const favoritesQ = useBuyerFavorites();

  const orders = ordersQ.data ?? [];
  const favorites = favoritesQ.data ?? [];
  const loading = ordersQ.isLoading || favoritesQ.isLoading;

  const firstName = firstNameFromUser(user?.name, user?.email);

  const activeOrders = orders.filter((o) => ACTIVE.has(o.status));
  const paidOrders = orders.filter(
    (o) => o.status === "paid" || o.status === "fulfilled"
  );

  const spendingSeries = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of paidOrders) {
      const date = o.createdAt.slice(0, 10);
      map.set(date, (map.get(date) ?? 0) + o.total);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }));
  }, [paidOrders]);

  const spendingSpark = useMemo(
    () => spendingSeries.map((row) => ({ value: row.value })),
    [spendingSeries]
  );

  const currency = orders[0]?.currency ?? "NGN";
  const totalSpent = paidOrders.reduce((s, o) => s + o.total, 0);

  const fulfilled = orders.filter((o) => o.status === "fulfilled");
  const shopsBoughtFrom = useMemo(() => {
    const set = new Set<string>();
    for (const o of orders) {
      if (o.tenant?.id) set.add(o.tenant.id);
    }
    return set.size;
  }, [orders]);

  const lastOrderDate = orders[0]
    ? new Date(orders[0].createdAt).toLocaleDateString()
    : "—";

  if (loading && !ordersQ.data) {
    return <SkeletonLines count={5} />;
  }

  return (
    <div className="space-y-6">
      <AdminHero
        firstName={firstName}
        subtitle="Here's your shopping activity across Shopmi.ng."
        badges={[
          {
            icon: <User className="h-3.5 w-3.5" aria-hidden />,
            label: "Buyer",
          },
        ]}
        metrics={
          <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <AdminHeroMetric
              label="Orders"
              value={String(orders.length)}
              hint="All time"
              icon={<ShoppingBag className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-info-muted text-info"
            />
            <AdminHeroMetric
              label="Active"
              value={String(activeOrders.length)}
              hint="Pending payment or paid"
              icon={<Package className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-warning-muted text-warning"
            />
            <AdminHeroMetric
              label="Favorites"
              value={String(favorites.length)}
              hint="Saved items"
              icon={<Heart className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-danger-muted text-danger"
            />
            <AdminHeroMetric
              label="Spent"
              value={formatMoney(totalSpent, currency)}
              hint="Paid & fulfilled"
              icon={<ShoppingBag className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-success-muted text-success"
            />
          </div>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          More insights
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <AdminMetricCard
            label="Shops shopped"
            value={String(shopsBoughtFrom)}
            type="shops"
            help="Distinct shops you've ordered from"
          />
          <AdminMetricCard
            label="Fulfilled"
            value={String(fulfilled.length)}
            type="orders"
            hint="Delivered / completed"
          />
          <AdminMetricCard
            label="Wishlist"
            value={String(favorites.length)}
            type="favorites"
            help="Items saved for later"
          />
          <AdminMetricCard
            label="Last order"
            value={lastOrderDate}
            type="pending"
            sparkline={spendingSpark.length >= 2 ? spendingSpark : undefined}
            help="Most recent order date"
          />
        </div>
      </section>

      <QuickActions
        actions={[
          {
            href: "/explore",
            label: "Browse Marketplace",
            icon: Store,
            variant: "primary",
          },
          { href: "/buyer/orders", label: "View Orders", icon: ShoppingBag },
          { href: "/buyer/favorites", label: "Favorites", icon: Heart },
          { href: "/buyer/account", label: "Account", icon: User },
        ]}
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Insights
        </h2>
        <OverviewChart
          title="Spending over time"
          description="Paid and fulfilled orders"
          data={spendingSeries}
          valueLabel="Spent"
          formatValue={(n) => formatMoney(n, currency)}
          emptyMessage="Not enough data yet — your spending chart appears after your first purchase."
        />
      </section>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-token-2">
          <p className="text-sm font-medium text-foreground">Recent activity</p>
          <Link href="/buyer/orders">
            <Button variant="ghost" size="sm">
              View all
            </Button>
          </Link>
        </CardHeader>
        <CardBody>
          {orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="When you buy from a shop, your latest orders will show up here."
              actionLabel="Browse marketplace"
              actionHref="/explore"
              icon={Package}
            />
          ) : (
            <ul className="divide-y divide-border">
              {orders.slice(0, 5).map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-token-3 py-token-3 text-sm first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-token-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {order.tenant ? (
                        <Link
                          href={`/shops/${order.tenant.slug}`}
                          className="font-medium hover:text-accent"
                        >
                          {order.tenant.name}
                        </Link>
                      ) : (
                        <span className="font-medium">Shop</span>
                      )}
                      {order.tenant?.verifiedBadge && (
                        <TrustBadge verified />
                      )}
                    </div>
                    <p className="text-muted-foreground">
                      {formatMoney(order.total, order.currency)} ·{" "}
                      {new Date(order.createdAt).toLocaleDateString()} ·{" "}
                      <span className="capitalize">
                        {order.status.replace(/_/g, " ")}
                      </span>
                    </p>
                  </div>
                  <Link href={`/buyer/orders/${order.id}`}>
                    <Button variant="outline" size="sm">
                      Details
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
