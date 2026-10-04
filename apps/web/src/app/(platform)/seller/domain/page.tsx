"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Earth, ExternalLink, Gift, Link2, Loader2, Search } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import {
  CONNECTION_STATUS,
  CopyButton,
  OWNED_STATUS,
  Pill,
  formatDay,
  naira,
} from "@/components/domain/domain-ui";
import { apiFetch } from "@/lib/api";
import {
  useDomainStore,
  useSellerDomain,
  type OwnedDomain,
  type SellerDomainInfo,
} from "@/hooks/use-seller";

type VerifyResponse = {
  paymentStatus: "pending" | "paid" | "failed";
  kind: string;
  domain: string;
  domainStatus: OwnedDomain["status"];
};

function usePaymentReturn() {
  const params = useSearchParams();
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const handled = useRef(false);
  const reference = params.get("reference") ?? params.get("trxref");
  const claimed = params.get("claimed");

  useEffect(() => {
    if (handled.current || (!reference && !claimed)) return;
    handled.current = true;
    if (claimed) {
      toast({
        title: `Registering ${claimed}`,
        description: "This usually takes a minute. We'll email you when it's ready.",
        tone: "success",
      });
      router.replace("/seller/domain");
      return;
    }
    void apiFetch<VerifyResponse>(`/api/seller/domain/purchases/${encodeURIComponent(reference!)}/verify`)
      .then((res) => {
        if (res.paymentStatus === "paid") {
          toast({
            title: res.kind === "renew" ? `Renewing ${res.domain}` : `Payment received for ${res.domain}`,
            description:
              res.kind === "renew"
                ? "We'll update the expiry date shortly."
                : "We're registering it now. We'll email you when it's ready.",
            tone: "success",
          });
        } else if (res.paymentStatus === "failed") {
          toast({ title: "Payment failed", description: "You haven't been charged for this domain.", tone: "danger" });
        } else {
          toast({
            title: "Payment not confirmed yet",
            description: "If you completed payment, this page will update shortly.",
            tone: "warning",
          });
        }
      })
      .catch(() => undefined)
      .finally(() => {
        void qc.invalidateQueries({ queryKey: ["seller", "domain-store"] });
        void qc.invalidateQueries({ queryKey: ["seller", "domain"] });
        router.replace("/seller/domain");
      });
  }, [reference, claimed, router, qc, toast]);
}

function ConnectedDomainCard({ info, managed }: { info: SellerDomainInfo; managed: boolean }) {
  const status = CONNECTION_STATUS[info.status];
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);

  async function check() {
    setChecking(true);
    try {
      const next = await apiFetch<SellerDomainInfo>("/api/seller/domain/verify", { method: "POST" });
      qc.setQueryData(["seller", "domain"], next);
      toast(
        next.verifiedAt
          ? { title: "Domain connected", tone: "success" }
          : { title: "Not live yet", description: "New domains can take a few hours. We check every hour.", tone: "warning" }
      );
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Check failed", tone: "danger" });
    } finally {
      setChecking(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Disconnect ${info.customDomain}? Shoppers will use your Shopmi.ng address instead.`)) return;
    setBusy(true);
    try {
      const next = await apiFetch<SellerDomainInfo>("/api/seller/domain", {
        method: "PUT",
        body: JSON.stringify({ customDomain: null }),
      });
      qc.setQueryData(["seller", "domain"], next);
      void qc.invalidateQueries({ queryKey: ["seller", "domain-store"] });
      toast({ title: "Domain disconnected", tone: "success" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Couldn't disconnect", tone: "danger" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{info.customDomain}</p>
          <Pill tone={status.tone}>{status.label}</Pill>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {info.status === "live"
            ? "Shoppers can reach your store here."
            : info.status === "securing"
              ? "DNS is set up. We're issuing the SSL certificate, which usually takes a few minutes."
              : info.status === "plan"
                ? "Paused because your plan doesn't include custom domains."
                : managed
                  ? "We've set up the DNS for you. New domains can take a few hours to work everywhere."
                  : info.note || "Add the DNS records to finish connecting."}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {info.status === "live" && info.liveUrl ? (
          <a
            href={info.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-foreground hover:bg-muted"
          >
            Visit <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        ) : null}
        {managed && info.status === "pending" ? (
          <Button size="sm" variant="outline" onClick={() => void check()} disabled={checking}>
            {checking ? "Checking…" : "Check now"}
          </Button>
        ) : null}
        {!managed && (info.status === "pending" || info.status === "securing") ? (
          <Link href="/seller/domain/connect" className={buttonClasses("outline", "sm")}>
            {info.status === "pending" ? "Finish setup" : "View records"}
          </Link>
        ) : null}
        <Button size="sm" variant="ghost" onClick={() => void remove()} disabled={busy}>
          {busy ? "Disconnecting…" : "Disconnect"}
        </Button>
      </div>
    </div>
  );
}

function OwnedDomainRow({ d, canManageDns }: { d: OwnedDomain; canManageDns: boolean }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [busy, setBusy] = useState<"connect" | "renew" | null>(null);
  const status = OWNED_STATUS[d.status];

  async function connect() {
    setBusy("connect");
    try {
      await apiFetch(`/api/seller/domain/owned/${d.id}/connect`, { method: "POST" });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["seller", "domain-store"] }),
        qc.invalidateQueries({ queryKey: ["seller", "domain"] }),
      ]);
      toast({
        title: `Connecting ${d.domain}`,
        description: "We've set up the DNS for you. It can take up to a few hours to work everywhere.",
        tone: "success",
      });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Couldn't connect", tone: "danger" });
    } finally {
      setBusy(null);
    }
  }

  async function renew() {
    setBusy("renew");
    try {
      const res = await apiFetch<{ authorizationUrl: string }>(`/api/seller/domain/owned/${d.id}/renew`, {
        method: "POST",
        body: JSON.stringify({ years: 1 }),
      });
      window.location.assign(res.authorizationUrl);
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Couldn't start renewal", tone: "danger" });
      setBusy(null);
    }
  }

  const expiry = formatDay(d.expiresAt);
  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate font-medium text-foreground">{d.domain}</p>
          <Pill tone={status.tone}>
            {d.status === "registering" ? <Loader2 className="h-3 w-3 animate-spin" aria-hidden /> : null}
            {status.label}
          </Pill>
          {d.connected ? <Pill tone="accent">Connected</Pill> : null}
          {d.free ? <Pill>Included with plan</Pill> : null}
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {d.problem
            ? d.problem
            : d.status === "registering"
              ? "This usually takes a minute."
              : d.status === "expired"
                ? `Expired ${expiry}.`
                : expiry
                  ? d.autoRenews
                    ? `Renews automatically on ${expiry}.`
                    : `Expires ${expiry}${d.renewPrice ? `. Renews at ${naira(d.renewPrice)}/year` : ""}.`
                  : null}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {d.status === "active" && !d.connected && canManageDns ? (
          <Button size="sm" variant="outline" onClick={() => void connect()} disabled={busy !== null}>
            {busy === "connect" ? "Connecting…" : "Connect to shop"}
          </Button>
        ) : null}
        {d.canRenew ? (
          <Button size="sm" onClick={() => void renew()} disabled={busy !== null}>
            {busy === "renew" ? "Opening payment…" : "Renew"}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

function DomainOverview() {
  usePaymentReturn();
  const domainQ = useSellerDomain();
  const storeQ = useDomainStore();

  if (domainQ.isError || storeQ.isError) {
    return (
      <QueryErrorState
        error={domainQ.error ?? storeQ.error}
        onRetry={() => {
          void domainQ.refetch();
          void storeQ.refetch();
        }}
      />
    );
  }

  const info = domainQ.data;
  const store = storeQ.data;
  const locked = info ? !info.planAllowed : false;
  const canBuy = !!store?.available && !locked;
  const hasAnything = !!info?.customDomain || (store?.owned.length ?? 0) > 0;

  const actions = locked ? (
    <Link href="/seller/plan" className={buttonClasses()}>
      See plans
    </Link>
  ) : (
    <>
      <Link href="/seller/domain/connect" className={buttonClasses("outline")}>
        <Link2 className="h-4 w-4" aria-hidden /> Connect domain
      </Link>
      {store?.available ? (
        <Link href="/seller/domain/buy" className={buttonClasses()}>
          <Search className="h-4 w-4" aria-hidden /> Buy domain
        </Link>
      ) : null}
    </>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Domain"
        icon={Earth}
        description="The web address shoppers use to find your store."
        actions={actions}
      />

      {locked ? (
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Custom domains are available on Lemi and Dami. Your store stays on its Shopmi.ng address
          until you upgrade. <TextLink href="/seller/plan">See plans</TextLink>
        </div>
      ) : null}

      {store?.freeEligible && canBuy ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-dash-tint px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-foreground">
            <Gift className="h-4 w-4 shrink-0 text-accent-strong dark:text-accent" aria-hidden />
            Your plan includes a free .{store.freeTld} domain, renewed free while you stay on it.
          </p>
          <Link href="/seller/domain/buy" className={buttonClasses("primary", "sm")}>
            Claim it
          </Link>
        </div>
      ) : null}

      <Card className="overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">Shopmi.ng address</p>
        </CardHeader>
        <CardBody>
          {!info ? (
            <SkeletonLines count={1} />
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={info.platformUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 truncate text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                {info.platformUrl.replace(/^https?:\/\//, "")}
              </a>
              <CopyButton value={info.platformUrl} />
              <span className="text-xs text-muted-foreground">Always works, even with a custom domain.</span>
            </div>
          )}
        </CardBody>
      </Card>

      {!info || !store ? (
        <Card className="rounded-2xl">
          <CardBody>
            <SkeletonLines count={3} />
          </CardBody>
        </Card>
      ) : !hasAnything ? (
        <Card className="rounded-2xl">
          <CardBody className="flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dash-tint text-accent-strong dark:text-accent">
              <Earth className="h-7 w-7" aria-hidden />
            </span>
            <p className="mt-4 text-base font-semibold text-foreground">No custom domain yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {locked
                ? "Upgrade to Lemi or Dami to use your own domain."
                : store.available
                  ? "Buy a new domain or connect one you already own."
                  : "Connect a domain you already own, like yourbrand.com."}
            </p>
            {!locked ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
          </CardBody>
        </Card>
      ) : (
        <>
          {info.customDomain ? (
            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="bg-muted/30">
                <p className="text-sm font-semibold text-foreground">Connected domain</p>
              </CardHeader>
              <CardBody>
                <ConnectedDomainCard
                  info={info}
                  managed={store.owned.some((d) => d.domain === info.customDomain && d.status === "active")}
                />
              </CardBody>
            </Card>
          ) : null}

          {store.owned.length > 0 ? (
            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="bg-muted/30">
                <p className="text-sm font-semibold text-foreground">Domains you bought</p>
              </CardHeader>
              <ul className="divide-y divide-border">
                {store.owned.map((d) => (
                  <OwnedDomainRow key={d.id} d={d} canManageDns={!locked} />
                ))}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function SellerDomainPage() {
  return (
    <Suspense fallback={<SkeletonLines count={4} />}>
      <DomainOverview />
    </Suspense>
  );
}
