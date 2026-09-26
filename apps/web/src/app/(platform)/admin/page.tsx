"use client";

import { useMemo, useState } from "react";
import {
  Banknote,
  Clock,
  CreditCard,
  Settings,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { AdminActionStrip } from "@/components/dashboard/admin/admin-action-strip";
import {
  AdminHero,
  AdminHeroMetric,
} from "@/components/dashboard/admin/admin-hero";
import { AdminInsightsChart } from "@/components/dashboard/admin/admin-insights-chart";
import { AdminLivePanel } from "@/components/dashboard/admin/admin-live-panel";
import { AdminMetricCard } from "@/components/dashboard/admin/admin-metric-card";
import {
  AdminPeriodToggle,
  type AdminPeriod,
} from "@/components/dashboard/admin/admin-period-toggle";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { formatMoney } from "@/lib/api";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { useAuth } from "@/hooks/use-auth";
import { useAdminOverview } from "@/hooks/use-admin";

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<AdminPeriod>("month");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useAdminOverview(
    period,
    selectedDay
  );

  const firstName = firstNameFromUser(user?.name, user?.email);

  const signupChart = useMemo(
    () =>
      (data?.signupsOverTime ?? []).map((row) => ({
        date: row.date,
        value: row.count,
      })),
    [data?.signupsOverTime]
  );

  const signupTotal = useMemo(
    () => signupChart.reduce((sum, row) => sum + row.value, 0),
    [signupChart]
  );

  const shopsSpark = useMemo(
    () => signupChart.map((row) => ({ value: row.value })),
    [signupChart]
  );

  if (error) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => {
          void refetch();
        }}
        sellerHomeHref="/admin"
      />
    );
  }

  if (isLoading && !data) {
    return <SkeletonLines count={5} />;
  }

  if (!data) return null;

  const gmv = formatMoney(data.gmv ?? data.salesTotal, data.currency);
  const avgOrder =
    data.paidOrderCount > 0
      ? formatMoney(
          (data.gmv ?? data.salesTotal) / data.paidOrderCount,
          data.currency
        )
      : formatMoney(0, data.currency);
  const periodLabel = selectedDay ?? period;

  return (
    <div className="space-y-6">
      <AdminHero
        firstName={firstName}
        roleBadge="Administrator"
        selectedDay={selectedDay}
        onSelectedDayChange={setSelectedDay}
        trailing={
          selectedDay ? null : (
            <AdminPeriodToggle value={period} onChange={setPeriod} />
          )
        }
        metrics={
          <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0">
            <AdminHeroMetric
              label="Total shops"
              value={String(data.tenantCount)}
              hint="Marketplace shops"
              icon={<Store className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-accent-soft text-accent dark:text-accent-on-dark"
            />
            <AdminHeroMetric
              label="Total users"
              value={String(data.userCount)}
              hint="Buyers + sellers"
              icon={<Users className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-info-muted text-info"
            />
            <AdminHeroMetric
              label={`GMV (${periodLabel})`}
              value={gmv}
              hint={`${data.paidOrderCount} paid orders`}
              icon={<Banknote className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-success-muted text-success"
            />
            <AdminHeroMetric
              label="Pending verifications"
              value={String(data.pendingVerifications)}
              hint="Awaiting review"
              icon={<Clock className="h-3.5 w-3.5" aria-hidden />}
              chipClass="bg-warning-muted text-warning"
            />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminMetricCard
          label="Buyers"
          value={String(data.buyerCount ?? 0)}
          type="users"
          help="Accounts with buyer role"
        />
        <AdminMetricCard
          label="Sellers"
          value={String(data.sellerCount ?? 0)}
          type="shops"
          help="Seller & shop-admin accounts"
          sparkline={shopsSpark.length >= 2 ? shopsSpark : undefined}
        />
        <AdminMetricCard
          label="Catalogue size"
          value={String(data.productCount ?? 0)}
          type="products"
          help="Products across all shops"
        />
        <AdminMetricCard
          label="Avg paid order"
          value={avgOrder}
          type="revenue"
          hint={`${data.paidOrderCount} paid · ${periodLabel}`}
          help="Average value of paid orders in the selected window"
        />
      </div>

      <div className="grid items-stretch gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <AdminInsightsChart
            title="Shop signups over time"
            totalLabel={`${signupTotal} signups`}
            comparisonText={
              selectedDay
                ? `New shops · ${selectedDay}`
                : `New shops · ${period}`
            }
            data={signupChart}
            valueLabel="Signups"
            periodControl={
              selectedDay ? undefined : (
                <AdminPeriodToggle value={period} onChange={setPeriod} />
              )
            }
          />
        </div>
        <AdminLivePanel shops={data.recentShops} />
      </div>

      <AdminActionStrip
        actions={[
          {
            href: "/admin/verification",
            label: "Review Verifications",
            icon: Shield,
            variant: "primary",
          },
          { href: "/admin/tenants", label: "Shops", icon: Store },
          { href: "/admin/users", label: "Users", icon: Users },
          { href: "/admin/plans", label: "Plans", icon: CreditCard },
          { href: "/admin/settings", label: "Settings", icon: Settings },
        ]}
      />
    </div>
  );
}
