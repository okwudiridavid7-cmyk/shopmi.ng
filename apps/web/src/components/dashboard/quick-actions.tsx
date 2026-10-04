"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

export type QuickAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "outline" | "secondary";
  /** Open in a new tab (e.g. live storefront). */
  external?: boolean;
};

function ActionLink({
  action,
  className,
  children,
}: {
  action: QuickAction;
  className: string;
  children: ReactNode;
}) {
  if (action.external) {
    return (
      <a href={action.href} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={action.href} className={className}>
      {children}
    </Link>
  );
}

/** Filled tint card. "stack" suits a side column, "row" a full-width strip. */
export function QuickActions({
  actions,
  layout = "stack",
  className = "",
}: {
  actions: QuickAction[];
  layout?: "stack" | "row";
  className?: string;
}) {
  const primary = actions.find((a) => a.variant === "primary");
  const rest = actions.filter((a) => a !== primary);

  return (
    <section
      className={`relative overflow-hidden rounded-[1.25rem] bg-dash-tint p-5 sm:p-6 ${className}`}
    >
      <h2 className="text-lg font-bold tracking-tight text-foreground">
        Quick actions
      </h2>

      <div
        className={
          layout === "row"
            ? "mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
            : "mt-4 grid gap-2"
        }
      >
        {primary ? (
          <ActionLink
            action={primary}
            className="group flex items-center gap-2.5 rounded-full bg-ink px-4 py-3 text-sm font-semibold text-ink-foreground transition hover:brightness-125 dark:bg-accent dark:text-ink"
          >
            <primary.icon className="h-4 w-4 shrink-0" aria-hidden />
            <span className="flex-1 truncate">{primary.label}</span>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </ActionLink>
        ) : null}
        {rest.map((action) => (
          <ActionLink
            key={action.href + action.label}
            action={action}
            className="group flex items-center gap-2.5 rounded-full bg-card px-4 py-3 text-sm font-medium text-foreground transition hover:shadow-[0_8px_20px_-12px_rgb(28_23_20/0.35)]"
          >
            <action.icon className="h-4 w-4 shrink-0 text-accent-strong dark:text-accent-on-dark" aria-hidden />
            <span className="flex-1 truncate">{action.label}</span>
            <ArrowUpRight
              className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </ActionLink>
        ))}
      </div>
    </section>
  );
}
