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
import { formatMoney, formatMoneyCompact } from "@/lib/api";
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
    : "None yet";

  if (loading && !ordersQ.data) {
    return <SkeletonLines count={5} />;
  }

  return (
    <div className="space-y-6" data-stagger>
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
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" data-stagger>
            <AdminHeroMetric
              featured
              label="Spent"
              value={formatMoney(totalSpent, currency)}
              icon={<ShoppingBag className="h-4 w-4" aria-hidden />}
            />
            <AdminHeroMetric
              label="Orders"
              value={String(orders.length)}
              hint="All time"
              icon={<ShoppingBag className="h-4 w-4" aria-hidden />}
            />
            <AdminHeroMetric
              label="Active"
              value={String(activeOrders.length)}
              icon={<Package className="h-4 w-4" aria-hidden />}
            />
            <AdminHeroMetric
              label="Favorites"
              value={String(favorites.length)}
              icon={<Heart className="h-4 w-4" aria-hidden />}
            />
          </div>
        }
      />

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          More insights
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" data-stagger>
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

      <div className="grid gap-4 xl:grid-cols-3">
        <OverviewChart
          className="xl:col-span-2"
          title="Spending"
          total={formatMoney(totalSpent, currency)}
          description="Paid orders over time"
          data={spendingSeries}
          valueLabel="Spent"
          formatValue={(n) => formatMoney(n, currency)}
          formatTick={(n) => formatMoneyCompact(n, currency)}
          emptyMessage="No spending yet"
        />
        <QuickActions
          actions={[
            {
              href: "/explore",
              label: "Browse marketplace",
              icon: Store,
              variant: "primary",
            },
            { href: "/buyer/orders", label: "View orders", icon: ShoppingBag },
            { href: "/buyer/favorites", label: "Favorites", icon: Heart },
            { href: "/buyer/account", label: "Account", icon: User },
          ]}
        />
      </div>

      <Card className="dash-card border-0 shadow-none">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-token-2 space-y-0 border-0 px-token-5 pt-token-5">
          <p className="text-base font-semibold text-foreground">Recent activity</p>
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
