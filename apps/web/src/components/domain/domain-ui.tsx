"use client";

import { useState } from "react";
import { Check, Copy, X } from "lucide-react";
import type { OwnedDomain, SellerDomainInfo } from "@/hooks/use-seller";
import { cn } from "@/lib/utils";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        });
      }}
      className={cn(
        "shrink-0 rounded-md p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground",
        className
      )}
      aria-label={copied ? "Copied" : `Copy ${value}`}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

const PILL = {
  neutral: "bg-muted text-muted-foreground",
  amber: "bg-amber-500/15 text-amber-900 dark:text-amber-200",
  sky: "bg-sky-500/15 text-sky-900 dark:text-sky-200",
  green: "bg-emerald-500/15 text-emerald-900 dark:text-emerald-200",
  red: "bg-[color-mix(in_oklab,var(--color-danger)_12%,transparent)] text-danger",
  accent: "bg-dash-tint text-accent-strong dark:text-accent",
} as const;

export function Pill({
  tone = "neutral",
  children,
}: {
  tone?: keyof typeof PILL;
  children: React.ReactNode;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", PILL[tone])}>
      {children}
    </span>
  );
}

export const CONNECTION_STATUS: Record<
  SellerDomainInfo["status"],
  { label: string; tone: keyof typeof PILL }
> = {
  none: { label: "Not connected", tone: "neutral" },
  pending: { label: "Waiting for DNS", tone: "amber" },
  securing: { label: "Securing", tone: "sky" },
  live: { label: "Live", tone: "green" },
  plan: { label: "Paused", tone: "neutral" },
};

export const OWNED_STATUS: Record<OwnedDomain["status"], { label: string; tone: keyof typeof PILL }> = {
  pending_payment: { label: "Awaiting payment", tone: "amber" },
  registering: { label: "Registering", tone: "sky" },
  active: { label: "Active", tone: "green" },
  failed: { label: "Failed", tone: "red" },
  expired: { label: "Expired", tone: "red" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const NAIRA = new Intl.NumberFormat("en-NG", {
  style: "currency",
  currency: "NGN",
  maximumFractionDigits: 0,
});

/** Domain prices are whole naira. */
export const naira = (amount: number) => NAIRA.format(amount);

export function formatDay(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export type RecordRow = {
  type: string;
  name: string;
  value: string;
  /** true/false once checked, null when unknown or not checked. */
  passed?: boolean | null;
};

/** DNS records laid out the way registrar dashboards label them. */
export function RecordTable({ rows }: { rows: RecordRow[] }) {
  const showCheck = rows.some((r) => r.passed != null);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div
        className={cn(
          "hidden gap-3 border-b border-border bg-muted/40 px-4 py-2.5 text-xs font-medium text-muted-foreground sm:grid",
          showCheck
            ? "grid-cols-[6rem_minmax(0,1fr)_minmax(0,1.6fr)_5rem_1.25rem]"
            : "grid-cols-[6rem_minmax(0,1fr)_minmax(0,1.6fr)_5rem]"
        )}
      >
        <span>Record type</span>
        <span>Host name</span>
        <span>Value</span>
        <span>TTL</span>
        {showCheck ? <span /> : null}
      </div>
      <ul className="divide-y divide-border">
        {rows.map((r) => (
          <li
            key={`${r.type}:${r.name}`}
            className={cn(
              "grid gap-2 px-4 py-3 text-sm sm:items-center sm:gap-3",
              showCheck
                ? "sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1.6fr)_5rem_1.25rem]"
                : "sm:grid-cols-[6rem_minmax(0,1fr)_minmax(0,1.6fr)_5rem]"
            )}
          >
            <span className="font-mono text-xs font-semibold text-foreground">
              <span className="mr-2 font-sans font-normal text-muted-foreground sm:hidden">Type</span>
              {r.type}
            </span>
            <span className="flex min-w-0 items-center gap-1">
              <span className="w-14 shrink-0 text-xs text-muted-foreground sm:hidden">Host</span>
              <code className="truncate rounded bg-muted px-1.5 py-0.5 text-xs">{r.name}</code>
              <CopyButton value={r.name} />
            </span>
            <span className="flex min-w-0 items-center gap-1">
              <span className="w-14 shrink-0 text-xs text-muted-foreground sm:hidden">Value</span>
              <code className="truncate rounded bg-muted px-1.5 py-0.5 text-xs">{r.value}</code>
              <CopyButton value={r.value} />
            </span>
            <span className="text-xs text-muted-foreground">
              <span className="mr-2 sm:hidden">TTL</span>Automatic
            </span>
            {showCheck ? (
              <span className="flex items-center" aria-label={r.passed ? "Found" : "Not found yet"}>
                {r.passed === true ? (
                  <Check className="h-4 w-4 text-emerald-600" />
                ) : r.passed === false ? (
                  <X className="h-4 w-4 text-danger" />
                ) : null}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
