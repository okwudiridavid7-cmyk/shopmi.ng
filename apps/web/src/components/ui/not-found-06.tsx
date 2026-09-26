"use client";

import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  HelpCircle,
  Home,
  LifeBuoy,
  Lock,
  Mail,
  OctagonX,
  RefreshCw,
  ServerCrash,
  Store,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export type ErrorPageKind =
  | "not_found"
  | "forbidden"
  | "server"
  | "network"
  | "generic";

export type ErrorPageLink = {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
};

export type ErrorPageProps = {
  kind?: ErrorPageKind;
  /** HTTP-ish status for display (404, 403, 500…). */
  status?: number;
  title?: string;
  description?: string;
  /** Suggested destinations — defaults from `kind`. */
  links?: ErrorPageLink[];
  /** Primary CTA below the grid. */
  primaryHref?: string;
  primaryLabel?: string;
  /** Show retry control (client errors). */
  onRetry?: () => void;
  /** Digest / opaque id from Next.js error boundary. */
  digest?: string;
  className?: string;
};

type KindConfig = {
  status: number;
  icon: LucideIcon;
  title: string;
  description: string;
  links: ErrorPageLink[];
  primaryHref: string;
  primaryLabel: string;
};

const KIND: Record<ErrorPageKind, KindConfig> = {
  not_found: {
    status: 404,
    icon: OctagonX,
    title: "Page not found",
    description:
      "That link doesn’t exist or may have moved. Try one of these instead.",
    links: [
      {
        icon: Home,
        title: "Home",
        description: "Back to the marketplace",
        href: "/",
      },
      {
        icon: Store,
        title: "Browse shops",
        description: "Discover products nearby",
        href: "/",
      },
      {
        icon: HelpCircle,
        title: "FAQs",
        description: "Common questions answered",
        href: "/faq",
      },
      {
        icon: Mail,
        title: "Contact",
        description: "Get in touch with us",
        href: "/contact",
      },
    ],
    primaryHref: "/",
    primaryLabel: "Go home",
  },
  forbidden: {
    status: 403,
    icon: Lock,
    title: "You don’t have access",
    description:
      "This area needs a different account or permission. Sign in again or head somewhere public.",
    links: [
      {
        icon: Home,
        title: "Home",
        description: "Public marketplace",
        href: "/",
      },
      {
        icon: Lock,
        title: "Sign in",
        description: "Use another account",
        href: "/login",
      },
      {
        icon: Store,
        title: "Become a seller",
        description: "Create your shop",
        href: "/onboarding",
      },
      {
        icon: LifeBuoy,
        title: "Support",
        description: "Help getting unstuck",
        href: "/support",
      },
    ],
    primaryHref: "/login",
    primaryLabel: "Sign in",
  },
  server: {
    status: 500,
    icon: ServerCrash,
    title: "Something went wrong",
    description:
      "We hit an unexpected error on our side. You can try again, or visit a safer page.",
    links: [
      {
        icon: Home,
        title: "Home",
        description: "Return to the marketplace",
        href: "/",
      },
      {
        icon: LifeBuoy,
        title: "Support",
        description: "Report what happened",
        href: "/support",
      },
      {
        icon: Mail,
        title: "Contact",
        description: "Email the team",
        href: "/contact",
      },
      {
        icon: HelpCircle,
        title: "FAQs",
        description: "While we sort this out",
        href: "/faq",
      },
    ],
    primaryHref: "/",
    primaryLabel: "Go home",
  },
  network: {
    status: 0,
    icon: WifiOff,
    title: "Connection problem",
    description:
      "We couldn’t reach the server. Check your network, then try again.",
    links: [
      {
        icon: Home,
        title: "Home",
        description: "Try the marketplace",
        href: "/",
      },
      {
        icon: LifeBuoy,
        title: "Support",
        description: "If this keeps happening",
        href: "/support",
      },
      {
        icon: HelpCircle,
        title: "FAQs",
        description: "Troubleshooting tips",
        href: "/faq",
      },
      {
        icon: Mail,
        title: "Contact",
        description: "Tell us what you saw",
        href: "/contact",
      },
    ],
    primaryHref: "/",
    primaryLabel: "Go home",
  },
  generic: {
    status: 400,
    icon: AlertTriangle,
    title: "We couldn’t complete that",
    description:
      "Something didn’t work as expected. Pick a destination below or go home.",
    links: [
      {
        icon: Home,
        title: "Home",
        description: "Back to the main page",
        href: "/",
      },
      {
        icon: HelpCircle,
        title: "FAQs",
        description: "Find quick answers",
        href: "/faq",
      },
      {
        icon: LifeBuoy,
        title: "Support",
        description: "Get help from us",
        href: "/support",
      },
      {
        icon: Mail,
        title: "Contact",
        description: "Send a message",
        href: "/contact",
      },
    ],
    primaryHref: "/",
    primaryLabel: "Go home",
  },
};

/** Infer page kind from status / thrown error. */
export function inferErrorPageKind(
  error?: Error & { digest?: string; status?: number },
  status?: number
): ErrorPageKind {
  const code = status ?? error?.status;
  if (code === 404) return "not_found";
  if (code === 403 || code === 401) return "forbidden";
  if (code === 0 || error?.message?.toLowerCase().includes("network")) {
    return "network";
  }
  if (code != null && code >= 500) return "server";
  if (error) return "server";
  return "generic";
}

/**
 * Adaptive error / not-found surface (not-found-06 layout).
 * Message + suggested links change with `kind`.
 */
export default function NotFound06({
  kind = "not_found",
  status,
  title,
  description,
  links,
  primaryHref,
  primaryLabel,
  onRetry,
  digest,
  className = "",
}: ErrorPageProps) {
  const preset = KIND[kind];
  const Icon = preset.icon;
  const resolvedStatus = status ?? preset.status;
  const resolvedLinks = links ?? preset.links;
  const resolvedTitle = title ?? preset.title;
  const resolvedDescription = description ?? preset.description;
  const resolvedPrimaryHref = primaryHref ?? preset.primaryHref;
  const resolvedPrimaryLabel = primaryLabel ?? preset.primaryLabel;

  return (
    <div
      className={`flex min-h-[min(100dvh,56rem)] flex-col items-center justify-center px-6 py-16 text-center ${className}`}
    >
      <div className="flex size-12 items-center justify-center rounded-2xl border border-border bg-muted">
        <Icon className="size-6 text-muted-foreground" aria-hidden />
      </div>

      {resolvedStatus > 0 ? (
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Error {resolvedStatus}
        </p>
      ) : null}

      <h1 className="mt-3 text-[2rem] font-bold tracking-tight text-foreground">
        {resolvedTitle}
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        {resolvedDescription}
      </p>

      <div className="mt-10 grid w-full max-w-lg gap-3 sm:grid-cols-2">
        {resolvedLinks.map((page) => {
          const LinkIcon = page.icon;
          return (
            <Link
              className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
              href={page.href}
              key={`${page.href}-${page.title}`}
            >
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background">
                <LinkIcon
                  className="size-4 text-muted-foreground"
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">
                  {page.title}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {page.description}
                </p>
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        {onRetry ? (
          <Button type="button" variant="primary" onClick={onRetry}>
            <RefreshCw className="h-4 w-4" aria-hidden />
            Try again
          </Button>
        ) : null}
        <Link href={resolvedPrimaryHref}>
          <Button type="button" variant={onRetry ? "outline" : "primary"}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {resolvedPrimaryLabel}
          </Button>
        </Link>
      </div>

      {digest ? (
        <p className="mt-6 max-w-md truncate font-mono text-[10px] text-muted-foreground">
          Ref: {digest}
        </p>
      ) : null}
    </div>
  );
}
