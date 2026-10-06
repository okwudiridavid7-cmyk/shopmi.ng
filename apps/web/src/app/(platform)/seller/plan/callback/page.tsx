"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SkeletonLines } from "@/components/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { apiFetch, formatMoney } from "@/lib/api";

type PlanPaymentStatus = {
  status: "pending" | "paid" | "failed";
  planName: string;
  months: number;
  amount: number;
  currency: string;
  planExpiresAt: string | null;
};

function CallbackInner() {
  const reference = useSearchParams().get("reference") ?? "";
  const qc = useQueryClient();
  const [result, setResult] = useState<PlanPaymentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reference) {
      setError("Missing payment reference");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const check = () =>
          apiFetch<PlanPaymentStatus>(`/api/seller/plan/verify/${encodeURIComponent(reference)}`);
        let res = await check();
        for (let i = 0; i < 5 && res.status === "pending"; i++) {
          await new Promise((r) => setTimeout(r, 2500));
          if (cancelled) return;
          res = await check();
        }
        if (cancelled) return;
        setResult(res);
        if (res.status === "paid") await qc.invalidateQueries({ queryKey: ["seller"] });
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not check this payment");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reference, qc]);

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <PageHeader title="Plan payment" icon={CreditCard} />
        <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">{error}</p>
        <TextLink href="/seller/plan" arrow="left">
          Back to plans
        </TextLink>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="mx-auto max-w-lg space-y-4">
        <SkeletonLines count={3} />
        <p className="text-center text-sm text-muted-foreground">Confirming payment with Paystack…</p>
      </div>
    );
  }

  const paid = result.status === "paid";
  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader
        title={paid ? `You're on ${result.planName}` : result.status === "failed" ? "Payment not completed" : "Payment pending"}
        icon={paid ? CheckCircle2 : CreditCard}
      />
      <div className="rounded-2xl border border-border bg-card p-6 text-sm shadow-sm">
        <p className="text-2xl font-semibold text-foreground">{formatMoney(result.amount, result.currency)}</p>
        <p className="mt-2 text-muted-foreground">
          {paid
            ? result.planExpiresAt
              ? `${result.planName} for ${result.months} month${result.months === 1 ? "" : "s"}. Paid until ${new Date(result.planExpiresAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}.`
              : `${result.planName} is active.`
            : result.status === "failed"
              ? "Your card was not charged. You can try again from the plans page."
              : "We haven't had confirmation from Paystack yet. This page will be up to date once it arrives; you can safely leave it."}
        </p>
      </div>
      <TextLink href="/seller/plan" arrow="left">
        Back to plans
      </TextLink>
    </div>
  );
}

export default function PlanCallbackPage() {
  return (
    <Suspense fallback={<SkeletonLines count={3} />}>
      <CallbackInner />
    </Suspense>
  );
}
