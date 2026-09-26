"use client";

import type { LucideIcon } from "lucide-react";
import {
  HelpCircle,
  Home,
  LifeBuoy,
  Plus,
  RefreshCw,
  Store,
} from "lucide-react";
import EmptyState04, {
  type EmptyState04Action,
  type EmptyState04Kind,
} from "@/components/ui/empty-state-04";
import NotFound06, {
  inferErrorPageKind,
  type ErrorPageKind,
  type ErrorPageLink,
} from "@/components/ui/not-found-06";
import { ApiClientError } from "@/lib/api";
import { classifyQueryError } from "@/lib/query-state";

type Props = {
  title?: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  /** Preset graphic + copy. Prefer this over dumping API error text. */
  kind?: EmptyState04Kind;
  secondaryLabel?: string;
  secondaryHref?: string;
  onSecondary?: () => void;
};

/**
 * Site-wide empty / soft-error state.
 * Backed by EmptyState04 (marquee + condition icons). Never pass raw API messages —
 * use `kind` from `classifyQueryError` or domain presets (`products`, `orders`, …).
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon,
  kind = "empty",
  secondaryLabel,
  secondaryHref,
  onSecondary,
}: Props) {
  const primary: EmptyState04Action | null | undefined =
    actionLabel != null
      ? {
          label: actionLabel,
          href: actionHref,
          onClick: onAction,
          icon:
            kind === "load_failed" ? (
              <RefreshCw className="h-4 w-4" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            ),
        }
      : undefined;

  // If the caller sets a primary CTA, don't keep a preset secondary unless asked.
  const secondary: EmptyState04Action | null | undefined =
    secondaryLabel != null
      ? {
          label: secondaryLabel,
          href: secondaryHref,
          onClick: onSecondary,
        }
      : actionLabel != null
        ? null
        : undefined;

  return (
    <EmptyState04
      kind={kind}
      title={title}
      description={description}
      icon={icon}
      primaryAction={primary}
      secondaryAction={secondary}
    />
  );
}

const NO_TENANT_LINKS: ErrorPageLink[] = [
  {
    icon: Store,
    title: "Create your shop",
    description: "Finish seller onboarding",
    href: "/onboarding",
  },
  {
    icon: Home,
    title: "Marketplace",
    description: "Browse as a buyer",
    href: "/explore",
  },
  {
    icon: LifeBuoy,
    title: "Support",
    description: "Get help",
    href: "/support",
  },
  {
    icon: HelpCircle,
    title: "FAQs",
    description: "Common questions",
    href: "/faq",
  },
];

/** Map a query failure to the shared error page — never leak API strings. */
export function QueryErrorState({
  error,
  onRetry,
  sellerHomeHref = "/seller",
}: {
  error: unknown;
  onRetry?: () => void;
  sellerHomeHref?: string;
}) {
  const classified = classifyQueryError(error);
  const status = error instanceof ApiClientError ? error.status : undefined;

  let kind: ErrorPageKind = "generic";
  if (classified === "no_tenant" || classified === "no_access") {
    kind = "forbidden";
  } else if (classified === "not_found") {
    kind = "not_found";
  } else {
    kind = inferErrorPageKind(
      error instanceof Error ? error : undefined,
      status
    );
    if (kind === "not_found" || kind === "generic") kind = "server";
  }

  const home =
    sellerHomeHref.startsWith("/admin")
      ? "/admin"
      : sellerHomeHref.startsWith("/buyer")
        ? "/buyer"
        : sellerHomeHref.startsWith("/seller")
          ? "/seller"
          : "/";

  return (
    <NotFound06
      kind={kind}
      status={status && status > 0 ? status : undefined}
      onRetry={onRetry}
      className="min-h-0 py-8"
      primaryHref={classified === "no_tenant" ? "/onboarding" : home}
      primaryLabel={
        classified === "no_tenant"
          ? "Create your shop"
          : kind === "forbidden"
            ? "Sign in"
            : home === "/"
              ? "Go home"
              : "Back"
      }
      description={
        classified === "no_tenant"
          ? "You’re signed in as a seller, but you don’t have a shop yet. Create one to continue, or browse the marketplace."
          : undefined
      }
      links={classified === "no_tenant" ? NO_TENANT_LINKS : undefined}
    />
  );
}
