"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Earth, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { OWNED_STATUS, Pill, formatDay, naira } from "@/components/domain/domain-ui";
import type { OwnedDomain } from "@/hooks/use-seller";
import { apiFetch } from "@/lib/api";

type TldPrice = { tld: string; register: number; renew: number; enabled: boolean };
type PricingResponse = { pricing: TldPrice[]; registrar: "go54" | "dev" | null };
type AdminDomain = {
  id: string;
  domain: string;
  status: OwnedDomain["status"];
  free: boolean;
  registrarRef: string | null;
  registeredAt: string | null;
  expiresAt: string | null;
  lastError: string | null;
  createdAt: string;
  connected: boolean;
  tenant: { id: string; name: string; slug: string };
  paid: number;
};

type Row = { tld: string; register: string; renew: string; enabled: boolean };

const REGISTRAR_NOTE: Record<string, string> = {
  go54: "Connected to GO54. Purchases are registered for real and paid from the reseller wallet.",
  dev: "No registrar keys set. This environment uses a stand-in, so nothing is actually registered.",
  none: "No registrar keys set. Buying domains is switched off for sellers.",
};

function PricingEditor() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({
    queryKey: ["admin", "domain-pricing"],
    queryFn: () => apiFetch<PricingResponse>("/api/admin/domain-pricing"),
  });
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (q.data) {
      setRows(
        q.data.pricing.map((p) => ({
          tld: p.tld,
          register: String(p.register),
          renew: String(p.renew),
          enabled: p.enabled,
        }))
      );
    }
  }, [q.data]);

  const update = (i: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<PricingResponse>("/api/admin/domain-pricing", {
        method: "PUT",
        body: JSON.stringify({
          pricing: rows.map((r) => ({
            tld: r.tld,
            register: Number(r.register),
            renew: Number(r.renew),
            enabled: r.enabled,
          })),
        }),
      });
      qc.setQueryData(["admin", "domain-pricing"], { ...q.data, pricing: res.pricing });
      toast({ title: "Domain prices saved", tone: "success" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save");
    } finally {
      setBusy(false);
    }
  }

  if (q.isError) return <QueryErrorState error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="bg-muted/30">
        <p className="text-sm font-semibold text-foreground">Prices sellers pay</p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Per year, in naira. Keep these above your registrar cost. Sellers only see these prices.
        </p>
      </CardHeader>
      <CardBody>
        {!q.data ? (
          <SkeletonLines count={4} />
        ) : (
          <form onSubmit={save} className="space-y-4">
            <p className="text-xs text-muted-foreground">
              {REGISTRAR_NOTE[q.data.registrar ?? "none"]}
            </p>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Ending</th>
                    <th className="pb-2 font-medium">Register</th>
                    <th className="pb-2 font-medium">Renew</th>
                    <th className="pb-2 font-medium">On sale</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody className="align-middle">
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">.</span>
                          <Input
                            placeholder="com.ng"
                            value={r.tld}
                            onChange={(e) => update(i, { tld: e.target.value })}
                            aria-label="Domain ending"
                            className="w-28"
                            required
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          placeholder="0"
                          value={r.register}
                          onChange={(e) => update(i, { register: e.target.value })}
                          aria-label={`.${r.tld} registration price`}
                          className="w-32"
                          required
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <Input
                          type="number"
                          min={0}
                          step={100}
                          placeholder="0"
                          value={r.renew}
                          onChange={(e) => update(i, { renew: e.target.value })}
                          aria-label={`.${r.tld} renewal price`}
                          className="w-32"
                          required
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={r.enabled}
                          onChange={(e) => update(i, { enabled: e.target.checked })}
                          aria-label={`Sell .${r.tld}`}
                          className="h-4 w-4 accent-[var(--color-accent)]"
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setRows((rs) => rs.filter((_, j) => j !== i))}
                          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          aria-label={`Remove .${r.tld}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRows((rs) => [...rs, { tld: "", register: "", renew: "", enabled: true }])}
              >
                <Plus className="h-4 w-4" aria-hidden /> Add ending
              </Button>
              <Button type="submit" disabled={busy || rows.length === 0}>
                {busy ? "Saving…" : "Save prices"}
              </Button>
            </div>
          </form>
        )}
      </CardBody>
    </Card>
  );
}

function RegisteredDomains() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const q = useQuery({
    queryKey: ["admin", "domains"],
    queryFn: () => apiFetch<{ domains: AdminDomain[] }>("/api/admin/domains"),
  });
  const [retrying, setRetrying] = useState<string | null>(null);

  async function retry(id: string) {
    setRetrying(id);
    try {
      await apiFetch(`/api/admin/domains/${id}/retry`, { method: "POST" });
      await qc.invalidateQueries({ queryKey: ["admin", "domains"] });
      toast({ title: "Registration queued again", tone: "success" });
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Couldn't retry", tone: "danger" });
    } finally {
      setRetrying(null);
    }
  }

  if (q.isError) return <QueryErrorState error={q.error} onRetry={() => void q.refetch()} />;

  return (
    <Card className="overflow-hidden rounded-2xl">
      <CardHeader className="bg-muted/30">
        <p className="text-sm font-semibold text-foreground">Registered domains</p>
      </CardHeader>
      {!q.data ? (
        <CardBody>
          <SkeletonLines count={3} />
        </CardBody>
      ) : q.data.domains.length === 0 ? (
        <CardBody>
          <p className="text-sm text-muted-foreground">No domains bought yet.</p>
        </CardBody>
      ) : (
        <ul className="divide-y divide-border">
          {q.data.domains.map((d) => {
            const status = OWNED_STATUS[d.status];
            return (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{d.domain}</p>
                    <Pill tone={status.tone}>{status.label}</Pill>
                    {d.connected ? <Pill tone="accent">Connected</Pill> : null}
                    {d.free ? <Pill>Plan benefit</Pill> : null}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    <Link href={`/admin/tenants/${d.tenant.id}`} className="underline-offset-4 hover:underline">
                      {d.tenant.name}
                    </Link>
                    {d.paid > 0 ? ` · paid ${naira(d.paid)}` : ""}
                    {d.expiresAt ? ` · expires ${formatDay(d.expiresAt)}` : ""}
                    {d.registrarRef ? ` · ref ${d.registrarRef}` : ""}
                  </p>
                  {d.lastError ? <p className="mt-1 text-xs text-danger">{d.lastError}</p> : null}
                </div>
                {d.status === "failed" ? (
                  <Button size="sm" variant="outline" disabled={retrying !== null} onClick={() => void retry(d.id)}>
                    {retrying === d.id ? "Retrying…" : "Retry"}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export default function AdminDomainsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Domains"
        icon={Earth}
        description="What sellers pay for domains, and the domains they've bought."
      />
      <PricingEditor />
      <RegisteredDomains />
    </div>
  );
}
