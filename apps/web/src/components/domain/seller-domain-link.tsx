"use client";

import Link from "next/link";
import { ChevronRight, Earth } from "lucide-react";
import { Card } from "@/components/ui/card";
import { CONNECTION_STATUS, Pill } from "@/components/domain/domain-ui";
import { useSellerDomain } from "@/hooks/use-seller";

/** Settings entry point for the Domain page. */
export function SellerDomainLink() {
  const info = useSellerDomain().data;
  const status = info ? CONNECTION_STATUS[info.status] : null;
  return (
    <Card id="domain" className="overflow-hidden rounded-2xl">
      <Link
        href="/seller/domain"
        className="flex items-center justify-between gap-3 px-5 py-4 transition hover:bg-muted/40"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-dash-tint text-accent-strong dark:text-accent">
            <Earth className="h-4 w-4" aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-foreground">Domain</span>
            <span className="block truncate text-xs text-muted-foreground">
              {info?.customDomain ?? "Buy a domain or connect one you own"}
            </span>
          </span>
        </span>
        <span className="flex items-center gap-2">
          {status && info?.customDomain ? <Pill tone={status.tone}>{status.label}</Pill> : null}
          <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
        </span>
      </Link>
    </Card>
  );
}
