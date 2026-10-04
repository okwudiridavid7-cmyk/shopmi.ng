"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, CircleCheck, ExternalLink, Globe, Link2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import {
  CONNECTION_STATUS,
  CopyButton,
  Pill,
  RecordTable,
  type RecordRow,
} from "@/components/domain/domain-ui";
import { apiFetch } from "@/lib/api";
import {
  useDomainStore,
  useSellerDomain,
  type SellerDomainInfo,
  type SellerDomainRecord,
} from "@/hooks/use-seller";
import { cn } from "@/lib/utils";

type StepId = "domain" | "routing" | "www" | "verify" | "finish";

function Stepper({ steps, current }: { steps: { id: StepId; label: string }[]; current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={s.id} className="flex items-center gap-2">
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition",
                done && "bg-ink text-white dark:bg-accent dark:text-ink",
                active && "bg-accent text-ink",
                !done && !active && "bg-muted text-muted-foreground"
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? <Check className="h-3.5 w-3.5" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "text-sm",
                active ? "font-semibold text-foreground" : "text-muted-foreground",
                !active && "hidden sm:inline"
              )}
            >
              {s.label}
            </span>
            {i < steps.length - 1 ? <span className="h-px w-3 bg-border sm:mx-1 sm:w-6" aria-hidden /> : null}
          </li>
        );
      })}
    </ol>
  );
}

function passed(record: SellerDomainRecord, info: SellerDomainInfo): boolean | null {
  if (info.verifiedAt) return true;
  if (!info.check) return null;
  return record.purpose === "routing" ? info.check.routing : info.check.ownership;
}

function StepTitle({ n, title, children }: { n: number; title: string; children?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {n}</p>
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {children ? <div className="max-w-2xl text-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}

function ConnectWizard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const domainQ = useSellerDomain();
  const storeQ = useDomainStore();
  const info = domainQ.data;

  const [step, setStep] = useState(0);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<"save" | "check" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [managed, setManaged] = useState(false);
  const started = useRef(false);

  const managedDomain = !!storeQ.data?.owned.some(
    (d) => d.domain === info?.customDomain && d.status === "active"
  );
  const routing = info?.records.find((r) => r.purpose === "routing") ?? null;
  const ownership = info?.records.find((r) => r.purpose === "ownership") ?? null;
  const apex = routing?.type === "A";

  const steps = useMemo(() => {
    const list: { id: StepId; label: string }[] = [
      { id: "domain", label: "Domain" },
      { id: "routing", label: apex || !routing ? "A record" : "CNAME" },
    ];
    if (apex || !routing) list.push({ id: "www", label: "www" });
    list.push({ id: "verify", label: "Verify" }, { id: "finish", label: "Check" });
    return list;
  }, [apex, routing]);

  useEffect(() => {
    if (started.current || !info || (!storeQ.data && !storeQ.isError)) return;
    started.current = true;
    setInput(info.customDomain ?? "");
    if (info.customDomain && info.planAllowed) {
      setStep(managedDomain || info.verifiedAt ? steps.length - 1 : 1);
    }
  }, [info, storeQ.data, storeQ.isError]); // eslint-disable-line react-hooks/exhaustive-deps

  if (domainQ.isError) {
    return <QueryErrorState error={domainQ.error} onRetry={() => void domainQ.refetch()} />;
  }

  const back = (
    <Link
      href="/seller/domain"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden /> Domain
    </Link>
  );

  if (!info) {
    return (
      <div className="space-y-6">
        {back}
        <SkeletonLines count={4} />
      </div>
    );
  }

  if (!info.planAllowed) {
    return (
      <div className="space-y-6">
        {back}
        <PageHeader title="Connect a domain" icon={Link2} />
        <div className="rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
          Custom domains are available on Lemi and Dami. <TextLink href="/seller/plan">See plans</TextLink>
        </div>
      </div>
    );
  }

  const current = steps[step]!.id;
  const n = step + 1;

  async function saveDomain(e: FormEvent) {
    e.preventDefault();
    const value = input.trim().toLowerCase();
    if (!value) return;
    setBusy("save");
    setError(null);
    try {
      const owned = storeQ.data?.owned.find((d) => d.domain === value && d.status === "active");
      if (owned) {
        await apiFetch(`/api/seller/domain/owned/${owned.id}/connect`, { method: "POST" });
        await Promise.all([
          qc.invalidateQueries({ queryKey: ["seller", "domain"] }),
          qc.invalidateQueries({ queryKey: ["seller", "domain-store"] }),
        ]);
        setManaged(true);
        setStep(steps.length - 1);
        return;
      }
      if (value !== info!.customDomain) {
        const next = await apiFetch<SellerDomainInfo>("/api/seller/domain", {
          method: "PUT",
          body: JSON.stringify({ customDomain: value }),
        });
        qc.setQueryData(["seller", "domain"], next);
        setInput(next.customDomain ?? value);
      }
      setManaged(false);
      setStep(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  }

  async function check() {
    setBusy("check");
    setError(null);
    try {
      const next = await apiFetch<SellerDomainInfo>("/api/seller/domain/verify", { method: "POST" });
      qc.setQueryData(["seller", "domain"], next);
      if (next.verifiedAt) {
        toast({
          title: "Domain connected",
          description: next.status === "live" ? `${next.customDomain} is live.` : "Securing it with SSL now.",
          tone: "success",
        });
      } else {
        toast({
          title: "Records not found yet",
          description: "DNS changes can take a while. We'll keep checking every hour.",
          tone: "warning",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Check failed");
    } finally {
      setBusy(null);
    }
  }

  const wwwRow: RecordRow = { type: "CNAME", name: "www", value: info.aliasTarget };
  const nav = (opts?: { next?: string }) => (
    <div className="flex flex-wrap items-center gap-2 pt-2">
      {step > 0 ? (
        <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
          Back
        </Button>
      ) : null}
      <Button onClick={() => setStep((s) => Math.min(s + 1, steps.length - 1))}>
        {opts?.next ?? "Continue"}
      </Button>
    </div>
  );

  const status = CONNECTION_STATUS[info.status];

  return (
    <div className="space-y-6">
      {back}
      <PageHeader
        title="Connect a domain"
        icon={Link2}
        description="Use a domain you already own. You'll add a few records where you bought it."
      />

      <Stepper steps={steps} current={step} />

      <Card className="rounded-2xl">
        <CardBody className="space-y-5 p-5 sm:p-6">
          {current === "domain" ? (
            <form onSubmit={saveDomain} className="space-y-5">
              <StepTitle n={n} title="Enter your domain">
                Use your main domain, like <code className="rounded bg-muted px-1">yourbrand.com</code>, or
                a subdomain like <code className="rounded bg-muted px-1">shop.yourbrand.com</code>.
              </StepTitle>
              <Label className="max-w-md">
                <span>Domain</span>
                <InputWithIcon
                  icon={<Globe />}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="yourbrand.com"
                  autoCapitalize="none"
                  spellCheck={false}
                  autoFocus
                />
              </Label>
              {error ? (
                <p role="alert" className="text-sm text-danger">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={busy !== null || !input.trim()}>
                  {busy === "save" ? "Saving…" : "Continue"}
                </Button>
                {storeQ.data?.available ? (
                  <span className="text-sm text-muted-foreground">
                    Don&apos;t have one? <TextLink href="/seller/domain/buy">Buy a domain</TextLink>
                  </span>
                ) : null}
              </div>
            </form>
          ) : null}

          {current === "routing" && routing ? (
            <>
              {apex ? (
                <StepTitle n={n} title="Point your domain to Shopmi.ng">
                  Sign in where you bought <strong className="text-foreground">{info.customDomain}</strong> (for
                  example GO54, Namecheap or GoDaddy) and open its DNS settings. Add an A record with this IP
                  address. If an A record for <code className="rounded bg-muted px-1">@</code> already exists,
                  edit it instead.
                </StepTitle>
              ) : (
                <StepTitle n={n} title="Point your subdomain to Shopmi.ng">
                  Sign in where you manage DNS for your domain and add this CNAME record. If a record with the
                  same host name already exists, edit it instead.
                </StepTitle>
              )}
              {apex ? (
                <div className="flex max-w-md items-center justify-between gap-3 rounded-xl border border-border bg-muted/30 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">IP address</p>
                    <p className="truncate font-mono text-lg font-semibold text-foreground">{routing.value}</p>
                  </div>
                  <CopyButton value={routing.value} className="p-2" />
                </div>
              ) : null}
              <RecordTable rows={[{ type: routing.type, name: routing.name, value: routing.value }]} />
              {apex ? (
                <p className="text-xs text-muted-foreground">
                  Remove any AAAA (IPv6) records for <code className="rounded bg-muted px-1">@</code>. If your
                  provider supports ALIAS or ANAME records, you can point{" "}
                  <code className="rounded bg-muted px-1">@</code> to{" "}
                  <code className="rounded bg-muted px-1">{info.aliasTarget}</code> instead.
                </p>
              ) : null}
              {nav()}
            </>
          ) : null}

          {current === "www" ? (
            <>
              <StepTitle n={n} title="Add a CNAME record for www">
                So <strong className="text-foreground">www.{info.customDomain}</strong> opens your store too.
                In the same DNS settings, add this record.
              </StepTitle>
              <RecordTable rows={[wwwRow]} />
              {nav()}
            </>
          ) : null}

          {current === "verify" && ownership ? (
            <>
              <StepTitle n={n} title="Verify you own the domain">
                Add this TXT record. It only proves the domain is yours and doesn&apos;t affect your email or
                anything else on the domain.
              </StepTitle>
              <RecordTable rows={[{ type: ownership.type, name: ownership.name, value: ownership.value }]} />
              {nav({ next: "I've added the records" })}
            </>
          ) : null}

          {current === "finish" ? (
            info.status === "live" || managed || managedDomain ? (
              <div className="flex flex-col items-start gap-4">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                  <CircleCheck className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    {info.status === "live" ? `${info.customDomain} is live` : `Connecting ${info.customDomain}`}
                  </h2>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                    {info.status === "live"
                      ? "Shoppers can now reach your store on your own domain. Checkout and payments still run securely on Shopmi.ng."
                      : "You bought this domain on Shopmi.ng, so we've set up its DNS for you. It can take up to a few hours to work everywhere."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {info.liveUrl ? (
                    <a href={info.liveUrl} target="_blank" rel="noreferrer" className={buttonClasses()}>
                      Visit store <ExternalLink className="h-4 w-4" aria-hidden />
                    </a>
                  ) : null}
                  <Link href="/seller/domain" className={buttonClasses("outline")}>
                    Done
                  </Link>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <StepTitle n={n} title="Check the connection">
                    DNS changes usually show up within minutes but can take a few hours. We check every hour and
                    switch your domain on automatically, so you can leave this page.
                  </StepTitle>
                  <Pill tone={status.tone}>{status.label}</Pill>
                </div>
                <RecordTable
                  rows={[
                    ...info.records
                      .filter((r) => r.purpose === "routing")
                      .map((r) => ({ type: r.type, name: r.name, value: r.value, passed: passed(r, info) })),
                    ...(apex ? [wwwRow] : []),
                    ...info.records
                      .filter((r) => r.purpose === "ownership")
                      .map((r) => ({ type: r.type, name: r.name, value: r.value, passed: passed(r, info) })),
                  ]}
                />
                {info.status === "securing" ? (
                  <p className="text-sm text-muted-foreground">
                    DNS is set up. We&apos;re issuing the SSL certificate, which usually takes a few minutes.
                  </p>
                ) : info.note ? (
                  <p className="text-sm text-amber-800 dark:text-amber-300">{info.note}</p>
                ) : null}
                {error ? (
                  <p role="alert" className="text-sm text-danger">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-2 pt-2">
                  <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                    Back
                  </Button>
                  <Button onClick={() => void check()} disabled={busy !== null}>
                    {busy === "check" ? "Checking…" : "Check DNS now"}
                  </Button>
                  <Link href="/seller/domain" className={buttonClasses("ghost")}>
                    Finish later
                  </Link>
                </div>
              </>
            )
          ) : null}
        </CardBody>
      </Card>
    </div>
  );
}

export default function ConnectDomainPage() {
  return <ConnectWizard />;
}
