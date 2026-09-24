"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "outline" | "secondary";
  /** Open in a new tab (e.g. live storefront). */
  external?: boolean;
};

export function QuickActions({ actions }: { actions: QuickAction[] }) {
  return (
    <section className="space-y-token-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Quick actions
      </h2>
      <div className="flex flex-wrap gap-token-2">
        {actions.map((a) => {
          const Icon = a.icon;
          const btn = (
            <Button variant={a.variant ?? "outline"} size="md">
              <Icon className="h-4 w-4" aria-hidden />
              {a.label}
            </Button>
          );
          if (a.external) {
            return (
              <a
                key={a.href + a.label}
                href={a.href}
                target="_blank"
                rel="noopener noreferrer"
              >
                {btn}
              </a>
            );
          }
          return (
            <Link key={a.href + a.label} href={a.href}>
              {btn}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
