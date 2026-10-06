"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Select } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { apiFetch, formatMoney } from "@/lib/api";
import type { SellerShop } from "@/hooks/use-seller";

type Bank = { code: string; name: string };
type LedgerEntry = {
  id: string;
  kind: "sale" | "refund" | "payout";
  amount: number;
  currency: string;
  reference: string | null;
  createdAt: string;
};
type PayoutSummary = {
  balances: { currency: string; amount: number }[];
  entries: LedgerEntry[];
  directPayouts: boolean;
};

const KIND_LABEL: Record<LedgerEntry["kind"], string> = {
  sale: "Sale",
  refund: "Refund",
  payout: "Paid to your bank",
};

export function PayoutAccountCard({ shop }: { shop: SellerShop }) {
  const isOwner = shop.viewerRole === "owner";
  const canSeeBalance = shop.viewerRole === "owner" || shop.viewerRole === "manager";
  const qc = useQueryClient();
  const { toast } = useToast();

  const banksQ = useQuery({
    queryKey: ["seller", "banks"],
    queryFn: () => apiFetch<{ banks: Bank[] }>("/api/seller/payouts/banks"),
    enabled: isOwner,
    staleTime: 6 * 3600 * 1000,
  });
  const payoutsQ = useQuery({
    queryKey: ["seller", "payouts"],
    queryFn: () => apiFetch<PayoutSummary>("/api/seller/payouts"),
    enabled: canSeeBalance,
  });

  const [bankCode, setBankCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [resolvedName, setResolvedName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setBankCode(shop.settlementBankCode ?? "");
  }, [shop.settlementBankCode]);

  const banks = banksQ.data?.banks ?? [];
  const currentBank = useMemo(
    () => banks.find((b) => b.code === shop.settlementBankCode)?.name ?? shop.settlementBankCode,
    [banks, shop.settlementBankCode]
  );
  const acct = shop.settlementAccountNumber;
  const maskedAcct = acct ? `******${acct.slice(-4)}` : null;

  async function check() {
    setErr(null);
    setResolvedName(null);
    if (!bankCode || !/^\d{10}$/.test(accountNumber)) {
      setErr("Pick your bank and enter the 10-digit account number.");
      return;
    }
    setBusy(true);
    try {
      const res = await apiFetch<{ accountName: string }>("/api/seller/payouts/bank/resolve", {
        method: "POST",
        body: JSON.stringify({ bankCode, accountNumber }),
      });
      setResolvedName(res.accountName);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not check this account");
    } finally {
      setBusy(false);
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!resolvedName) {
      await check();
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      await apiFetch("/api/seller/payouts/bank", {
        method: "PUT",
        body: JSON.stringify({ bankCode, accountNumber }),
      });
      setAccountNumber("");
      setResolvedName(null);
      await qc.invalidateQueries({ queryKey: ["seller", "shop"] });
      toast({ title: "Payout account saved", tone: "success" });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const summary = payoutsQ.data;
  const owed = summary?.balances.filter((b) => b.amount > 0) ?? [];

  return (
    <Card id="payouts" className="overflow-hidden rounded-2xl">
      <CardHeader className="bg-muted/30">
        <p className="text-sm font-semibold text-foreground">Payout account</p>
      </CardHeader>
      <CardBody className="max-w-2xl space-y-5">
        <p className="text-sm text-muted-foreground">
          {summary?.directPayouts
            ? "Paystack pays each sale straight into this account, minus the service fee."
            : "Direct bank payouts are for verified sellers. Until your shop is verified, we hold your share of each sale and transfer it to this account."}
        </p>

        {acct ? (
          <div className="rounded-xl border border-border px-4 py-3 text-sm">
            <p className="font-medium text-foreground">{shop.settlementAccountName ?? "Saved account"}</p>
            <p className="text-muted-foreground">
              {currentBank} · {maskedAcct}
            </p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No payout account yet.</p>
        )}

        {isOwner ? (
          <form onSubmit={save} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Label>
                <span>Bank</span>
                <Select
                  icon={<Landmark />}
                  value={bankCode}
                  onChange={(e) => {
                    setBankCode(e.target.value);
                    setResolvedName(null);
                  }}
                  disabled={banksQ.isLoading}
                >
                  <option value="">{banksQ.isLoading ? "Loading banks…" : "Select bank"}</option>
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.name}
                    </option>
                  ))}
                </Select>
              </Label>
              <Label>
                <span>Account number</span>
                <InputWithIcon
                  icon={<Wallet />}
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="10-digit NUBAN"
                  value={accountNumber}
                  onChange={(e) => {
                    setAccountNumber(e.target.value.replace(/\D/g, ""));
                    setResolvedName(null);
                  }}
                />
              </Label>
            </div>
            {resolvedName ? (
              <p className="text-sm text-foreground">
                Account name: <strong>{resolvedName}</strong>. Save if this is correct.
              </p>
            ) : null}
            {err ? <p className="text-sm text-red-700 dark:text-red-400">{err}</p> : null}
            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? "Checking…" : resolvedName ? "Save payout account" : "Check account"}
              </Button>
            </div>
          </form>
        ) : (
          <p className="text-xs text-muted-foreground">Only the shop owner can change the payout account.</p>
        )}

        {canSeeBalance && summary && (owed.length > 0 || summary.entries.length > 0) ? (
          <div className="space-y-3 border-t border-border pt-5">
            <p className="text-sm font-semibold text-foreground">Held for you</p>
            {owed.length > 0 ? (
              <p className="text-lg font-semibold text-foreground">
                {owed.map((b) => formatMoney(b.amount, b.currency)).join(" · ")}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
            )}
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border text-sm">
              {summary.entries.slice(0, 10).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-foreground">
                    {KIND_LABEL[e.kind] ?? e.kind}
                    {e.reference ? <span className="text-muted-foreground"> · {e.reference}</span> : null}
                  </span>
                  <span className={e.amount < 0 ? "text-muted-foreground" : "text-foreground"}>
                    {formatMoney(e.amount, e.currency)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
}
