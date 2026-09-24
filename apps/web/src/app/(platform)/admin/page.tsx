"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CreditCard,
  Settings,
  Shield,
  Store,
  Users,
} from "lucide-react";
import { GreetingCard } from "@/components/dashboard/greeting-card";
import { OverviewChart } from "@/components/dashboard/overview-chart";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { StatCard } from "@/components/stat-card";
import { EmptyState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrustBadge } from "@/components/shell/trust-badge";
import { formatMoney } from "@/lib/api";
import { firstNameFromUser } from "@/lib/auth-redirect";
import { useAuth } from "@/hooks/use-auth";
import { useAdminOverview } from "@/hooks/use-admin";

type Period = "today" | "week" | "month";

export default function AdminOverviewPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("month");
  const { data, isLoading, error } = useAdminOverview(period);

  const firstName = firstNameFromUser(user?.name, user?.email);

  const signupChart = useMemo(
    () =>
      (data?.signupsOverTime ?? []).map((row) => ({
        date: row.date,
        value: row.count,
      })),
    [data?.signupsOverTime]
  );

  if (error) {
    return (
      <p className="text-sm text-muted-foreground">
        {error instanceof Error ? error.message : "Failed to load"}
      </p>
    );
  }

  if (isLoading && !data) {
    return <SkeletonLines count={5} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-token-8">
      <GreetingCard
        firstName={firstName}
        stats={[
          {
            label: "Pending verifications",
            value: String(data.pendingVerifications),
          },
          { label: "Shops", value: String(data.tenantCount) },
          { label: "Users", value: String(data.userCount) },
          {
            label: `GMV (${period})`,
            value: formatMoney(data.gmv ?? data.salesTotal, data.currency),
          },
        ]}
      />

      <section className="space-y-token-3">
        <div className="flex flex-wrap items-center justify-between gap-token-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Stats
          </h2>
          <div className="flex gap-token-1 rounded-md border border-border p-token-1">
            {(
              [
                ["today", "Today"],
                ["week", "Week"],
                ["month", "Month"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setPeriod(value)}
                className={`rounded-sm px-token-3 py-token-1 text-xs font-medium transition ${
                  period === value
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="grid gap-token-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total shops"
            value={String(data.tenantCount)}
            type="shops"
          />
          <StatCard
            label="Total users"
            value={String(data.userCount)}
            hint={`${data.buyerCount ?? 0} buyers · ${data.sellerCount ?? 0} sellers`}
            type="users"
          />
          <StatCard
            label={`GMV (${period})`}
            value={formatMoney(data.gmv ?? data.salesTotal, data.currency)}
            hint={`${data.paidOrderCount} paid in period`}
            type="revenue"
          />
          <StatCard
            label="Pending verifications"
            value={String(data.pendingVerifications)}
            type="pending"
          />
        </div>
      </section>

      <QuickActions
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

      <section className="space-y-token-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Insights
        </h2>
        <OverviewChart
          title="Shop signups over time"
          description={`New shops · ${period}`}
          data={signupChart}
          valueLabel="Signups"
          emptyMessage="Not enough data yet — new shop signups will appear here."
        />
      </section>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Recently signed-up shops</p>
        </CardHeader>
        <CardBody>
          {!data.recentShops?.length ? (
            <EmptyState
              title="No shops yet"
              description="New seller shops will appear here as they onboard."
              icon={Store}
            />
          ) : (
            <ul className="divide-y divide-border">
              {data.recentShops.map((s) => (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-token-3 py-token-3 text-sm first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 space-y-token-1">
                    <div className="flex flex-wrap items-center gap-token-2">
                      <Link
                        href={`/admin/tenants/${s.id}`}
                        className="font-medium hover:underline"
                      >
                        {s.name}
                      </Link>
                      <TrustBadge verified={s.verifiedBadge} />
                      <span className="text-xs capitalize text-muted-foreground">
                        {s.status.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-muted-foreground">
                      {s.ownerEmail}
                      {s.planName ? ` · ${s.planName}` : ""} ·{" "}
                      {new Date(s.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link href={`/admin/tenants/${s.id}`}>
                    <Button variant="ghost" size="sm">
                      View
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
