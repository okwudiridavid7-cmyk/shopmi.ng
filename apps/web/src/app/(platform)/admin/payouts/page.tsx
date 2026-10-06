"use client";

import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Wallet } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch, apiUrl, formatMoney } from "@/lib/api";

type BalanceRow = {
  tenantId: string;
  shopName: string;
  slug: string;
  verified: boolean;
  bankCode: string | null;
  accountNumber: string | null;
  accountName: string | null;
  currency: string;
  amount: number;
};
type PayoutRow = {
  id: string;
  amount: number;
  currency: string;
  reference: string | null;
  note: string | null;
  createdAt: string;
  shopName: string;
};

function MarkPaid({ row, onDone }: { row: BalanceRow; onDone: () => void }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(row.amount));
  const [reference, setReference] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await apiFetch("/api/admin/payouts", {
        method: "POST",
        body: JSON.stringify({ tenantId: row.tenantId, currency: row.currency, amount: Number(amount), reference }),
      });
      toast({ title: `Payout recorded for ${row.shopName}`, tone: "success" });
      setOpen(false);
      onDone();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Could not record payout");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} disabled={!row.accountNumber}>
        Mark paid
      </Button>
    );
  }
  return (
    <form onSubmit={submit} className="flex w-full flex-wrap items-center gap-2 pt-2">
      <Input
        className="w-32"
        inputMode="decimal"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        aria-label="Amount paid"
      />
      <Input
        className="min-w-[12rem] flex-1"
        placeholder="Bank transfer reference"
        value={reference}
        onChange={(e) => setReference(e.target.value)}
        required
        minLength={3}
      />
      <Button type="submit" size="sm" variant="primary" disabled={busy}>
        {busy ? "Saving…" : "Save"}
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Cancel
      </Button>
      {err ? <p className="w-full text-sm text-red-700 dark:text-red-400">{err}</p> : null}
    </form>
  );
}

export default function AdminPayoutsPage() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["admin", "payouts"],
    queryFn: () => apiFetch<{ balances: BalanceRow[]; recentPayouts: PayoutRow[] }>("/api/admin/payouts"),
  });
  const refresh = () => void qc.invalidateQueries({ queryKey: ["admin", "payouts"] });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Payouts"
        description="Seller money held by the platform from sales that weren't split to a Paystack subaccount. Pay by bank transfer, then record it here."
        icon={Wallet}
        actions={
          <a href={apiUrl("/api/admin/payouts.csv")}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" aria-hidden />
              Export CSV
            </Button>
          </a>
        }
      />

      {q.isLoading ? (
        <SkeletonLines count={4} />
      ) : q.error ? (
        <QueryErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <>
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30">
              <p className="text-sm font-semibold text-foreground">Owed to sellers</p>
            </CardHeader>
            <CardBody>
              {q.data!.balances.length === 0 ? (
                <EmptyState kind="generic" title="Nothing owed right now" />
              ) : (
                <ul className="divide-y divide-border">
                  {q.data!.balances.map((row) => (
                    <li key={`${row.tenantId}-${row.currency}`} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">
                          {row.shopName}
                          <span className="text-muted-foreground"> · /{row.slug}</span>
                        </p>
                        <p className="text-muted-foreground">
                          {row.accountNumber
                            ? `${row.accountName ?? "Unnamed"} · bank ${row.bankCode} · ${row.accountNumber}`
                            : "No payout account yet"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-foreground">{formatMoney(row.amount, row.currency)}</span>
                        <MarkPaid row={row} onDone={refresh} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {q.data!.recentPayouts.length > 0 ? (
            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="bg-muted/30">
                <p className="text-sm font-semibold text-foreground">Recent payouts</p>
              </CardHeader>
              <CardBody>
                <ul className="divide-y divide-border text-sm">
                  {q.data!.recentPayouts.map((p) => (
                    <li key={p.id} className="flex flex-wrap justify-between gap-2 py-2.5">
                      <span className="text-foreground">
                        {p.shopName}
                        <span className="text-muted-foreground"> · {p.reference}</span>
                      </span>
                      <span className="text-muted-foreground">
                        {formatMoney(Math.abs(p.amount), p.currency)} · {new Date(p.createdAt).toLocaleDateString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
