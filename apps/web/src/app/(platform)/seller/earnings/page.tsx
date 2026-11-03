"use client";

import { useQuery } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { PayoutAccountCard } from "@/components/payout-account-card";
import { SkeletonLines } from "@/components/skeleton";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { apiFetch, formatMoney } from "@/lib/api";
import { useSellerShop, type SellerShop } from "@/hooks/use-seller";

type LedgerEntry = {
  id: string;
  kind: string;
  amount: number;
  currency: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
};

type PayoutSummary = {
  balances: { currency: string; amount: number }[];
  entries: LedgerEntry[];
  directPayouts: boolean;
  accountName: string | null;
};

const KIND_LABEL: Record<string, string> = {
  sale: "Sale",
  refund: "Refund",
  payout: "Paid to your bank",
};

export default function SellerEarningsPage() {
  const shopQ = useSellerShop();
  const shop = shopQ.data as SellerShop | undefined;
  const canSee =
    shop?.viewerRole === "owner" || shop?.viewerRole === "manager";

  const payoutsQ = useQuery({
    queryKey: ["seller", "payouts"],
    queryFn: () => apiFetch<PayoutSummary>("/api/seller/payouts"),
    enabled: Boolean(shop && canSee),
  });

  if (shopQ.isLoading) return <SkeletonLines count={5} />;
  if (shopQ.isError) {
    return (
      <QueryErrorState
        error={shopQ.error}
        onRetry={() => void shopQ.refetch()}
        sellerHomeHref="/seller"
      />
    );
  }
  if (!shop) {
    return (
      <EmptyState
        kind="empty"
        title="No shop yet"
        actionLabel="Finish setup"
        actionHref="/onboarding"
      />
    );
  }
  if (!canSee) {
    return (
      <EmptyState
        kind="no_access"
        title="Earnings are for owners and managers"
        actionLabel="Back to dashboard"
        actionHref="/seller"
      />
    );
  }

  const entries = payoutsQ.data?.entries ?? [];
  const balances = payoutsQ.data?.balances ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings"
        description={
          payoutsQ.data?.directPayouts
            ? "Verified shops with a bank account get paid by Paystack after each sale. Held balances below are paid manually by Shopmi."
            : "Sales that settle to Shopmi show here until we transfer them to your bank."
        }
        icon={Wallet}
        actions={
          <TextLink href="/seller/settings#payouts" tone="muted">
            Bank settings
          </TextLink>
        }
      />

      <PayoutAccountCard shop={shop} />

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Balances held by Shopmi</p>
        </CardHeader>
        <CardBody>
          {payoutsQ.isLoading ? (
            <SkeletonLines count={2} />
          ) : balances.filter((b) => b.amount > 0).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {payoutsQ.data?.directPayouts
                ? "Nothing held — new sales settle to your bank through Paystack."
                : "Nothing outstanding right now."}
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {balances
                .filter((b) => b.amount > 0)
                .map((b) => (
                  <li key={b.currency} className="flex justify-between font-medium">
                    <span>{b.currency}</span>
                    <span>{formatMoney(b.amount, b.currency)}</span>
                  </li>
                ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Ledger</p>
        </CardHeader>
        <CardBody className="p-0">
          {payoutsQ.isLoading ? (
            <div className="p-4">
              <SkeletonLines count={4} />
            </div>
          ) : entries.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              No ledger entries yet. Split settlements to your bank do not appear here.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {entries.map((e) => (
                <li
                  key={e.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {KIND_LABEL[e.kind] ?? e.kind}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.createdAt).toLocaleString()}
                      {e.reference ? ` · ${e.reference}` : ""}
                    </p>
                  </div>
                  <p
                    className={
                      e.amount < 0 ? "font-medium text-danger" : "font-medium text-foreground"
                    }
                  >
                    {formatMoney(e.amount, e.currency)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
