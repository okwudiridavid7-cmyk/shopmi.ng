"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Store } from "lucide-react";
import { ApiClientError, apiFetch } from "@/lib/api";
import { slugifyShopName } from "@/lib/slugify";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { markWalkthroughPending } from "@/components/walkthrough";
import { useSellerPlan } from "@/hooks/use-seller";
import { QueryErrorState } from "@/components/empty-state";
import { DashboardContentSkeleton } from "@/components/ui/v-skeleton-8";
import { useToast } from "@/components/ui/toast";

/**
 * Blocks seller dashboard content until the user has a shop membership.
 * Without this, every `/api/seller/*` call returns 403 and pages dump raw errors.
 */
export function SellerTenantGate({ children }: { children: ReactNode }) {
  const plan = useSellerPlan();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [shopName, setShopName] = useState("");
  const [busy, setBusy] = useState(false);

  if (plan.isLoading && !plan.data) {
    return <DashboardContentSkeleton label="Loading your shop" />;
  }

  if (plan.isError) {
    if (plan.error instanceof ApiClientError && (plan.error.status === 403 || plan.error.status === 404)) {
      async function createShopNamed(name: string, beginWalkthrough: boolean) {
        setBusy(true);
        try {
          const base = slugifyShopName(name);
          const slug = beginWalkthrough ? `${base}-${Math.random().toString(36).slice(2, 6)}` : base;
          await apiFetch("/api/onboarding", { method: "POST", body: JSON.stringify({ shopName: name.trim(), slug, answers: {} }) });
          if (beginWalkthrough) {
            markWalkthroughPending();
            window.location.assign("/seller?walkthrough=1");
          } else {
            await qc.invalidateQueries({ queryKey: ["seller"] });
          }
        } catch (err) { toast({ title: "Could not start shop setup", description: err instanceof Error ? err.message : "Please try again.", tone: "danger" }); }
        finally { setBusy(false); }
      }
      async function createShop(e: FormEvent) {
        e.preventDefault();
        await createShopNamed(shopName, false);
      }
      return <div className="mx-auto flex min-h-full max-w-2xl items-center py-8"><section className="w-full overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-accent/10 via-card to-card p-7 sm:p-9"><span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/15 text-accent"><Store className="h-6 w-6" /></span><p className="text-xs font-bold uppercase tracking-[0.16em] text-accent">Your seller dashboard</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Let’s set up your shop</h1><p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Start with a name. You can add your business details, branding, products, and payment information from the dashboard.</p><div className="mt-6 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div className="h-full w-[8%] rounded-full bg-accent" /></div><span className="text-sm font-bold tabular-nums text-foreground">8%</span></div></div>
        <form onSubmit={createShop} className="space-y-5 p-7 sm:p-9"><Label><span className="text-sm font-semibold">Shop name</span><Input required minLength={2} maxLength={100} value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="e.g. Ada’s Home Finds" className="mt-2 h-12" /></Label><Button type="submit" disabled={busy || shopName.trim().length < 2} className="h-12 w-full">{busy ? "Preparing your dashboard…" : <>Continue setup <ArrowRight className="ml-2 h-4 w-4" /></>}</Button><button type="button" disabled={busy} onClick={() => void createShopNamed("My shop", true)} className="w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">I’ll finish setup later</button></form>
      </section></div>;
    }
    return (
      <QueryErrorState
        error={plan.error}
        onRetry={() => {
          void plan.refetch();
        }}
        sellerHomeHref="/"
      />
    );
  }

  return <>{children}</>;
}
