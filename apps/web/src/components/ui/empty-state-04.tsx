"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import {
  AlertCircle,
  FolderCheck,
  Heart,
  Import,
  Lock,
  Package,
  Plus,
  RefreshCw,
  SearchX,
  ShoppingBag,
  Store,
  Users,
} from "lucide-react";
import { Marquee } from "@/components/ui/empty-state-04-utils/marquee";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty-state-04-utils/empty";
import type { QueryStateKind } from "@/lib/query-state";

export type EmptyState04Action = {
  label: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
};

/** Visual preset — drives marquee icon + default copy / CTAs. */
export type EmptyState04Kind =
  | QueryStateKind
  | "products"
  | "orders"
  | "favorites"
  | "shops"
  | "users"
  | "generic";

export type EmptyState04Props = {
  kind?: EmptyState04Kind;
  title?: string;
  description?: string;
  primaryAction?: EmptyState04Action | null;
  secondaryAction?: EmptyState04Action | null;
  /** Override marquee / hero icon. */
  icon?: LucideIcon;
  /** Number of skeleton rows in the marquee preview. */
  previewRows?: number;
  /** Show animated marquee (default true for empty-like kinds). */
  showMarquee?: boolean;
  className?: string;
};

type KindPreset = {
  icon: LucideIcon;
  title: string;
  description: string;
  primary?: EmptyState04Action;
  secondary?: EmptyState04Action;
  showMarquee: boolean;
  chipClass: string;
};

const PRESETS: Record<EmptyState04Kind, KindPreset> = {
  no_tenant: {
    icon: Store,
    title: "Create your shop first",
    description:
      "You’re signed in as a seller, but you don’t have a shop yet. Finish onboarding to unlock products, orders, and branding.",
    primary: {
      label: "Create your shop",
      href: "/onboarding",
      icon: <Store className="h-4 w-4" aria-hidden />,
    },
    secondary: {
      label: "Back to marketplace",
      href: "/explore",
    },
    showMarquee: true,
    chipClass: "bg-accent-soft text-accent dark:text-accent-on-dark",
  },
  no_access: {
    icon: Lock,
    title: "You don’t have access",
    description:
      "This area needs a different role or shop permission. Switch accounts or head back to the marketplace.",
    primary: {
      label: "Go to marketplace",
      href: "/explore",
      icon: <Store className="h-4 w-4" aria-hidden />,
    },
    showMarquee: false,
    chipClass: "bg-warning-muted text-warning",
  },
  not_found: {
    icon: SearchX,
    title: "Nothing here",
    description: "We couldn’t find that page or resource. It may have been moved or removed.",
    primary: {
      label: "Go back",
      href: "/explore",
    },
    showMarquee: false,
    chipClass: "bg-muted text-muted-foreground",
  },
  load_failed: {
    icon: AlertCircle,
    title: "Couldn’t load this page",
    description:
      "Something went wrong talking to the server. Check your connection and try again.",
    primary: {
      label: "Try again",
      icon: <RefreshCw className="h-4 w-4" aria-hidden />,
    },
    secondary: {
      label: "Dashboard",
      href: "/seller",
    },
    showMarquee: false,
    chipClass: "bg-danger-muted text-danger",
  },
  empty: {
    icon: FolderCheck,
    title: "Nothing here yet",
    description: "When you add items, they’ll show up in this list.",
    showMarquee: true,
    chipClass: "bg-muted text-muted-foreground",
  },
  empty_filtered: {
    icon: SearchX,
    title: "No matches",
    description: "Nothing matches your current filters. Try clearing them or broadening your search.",
    showMarquee: false,
    chipClass: "bg-muted text-muted-foreground",
  },
  products: {
    icon: Package,
    title: "No products yet",
    description:
      "Add your first listing to start selling on the marketplace and your shop page.",
    primary: {
      label: "Add product",
      icon: <Plus className="h-4 w-4" aria-hidden />,
    },
    secondary: {
      label: "Customize store",
      href: "/seller/website",
      icon: <Import className="h-4 w-4" aria-hidden />,
    },
    showMarquee: true,
    chipClass: "bg-accent-soft text-accent dark:text-accent-on-dark",
  },
  orders: {
    icon: ShoppingBag,
    title: "No orders yet",
    description: "When buyers check out, their orders will appear here.",
    primary: {
      label: "View products",
      href: "/seller/products",
      icon: <Package className="h-4 w-4" aria-hidden />,
    },
    showMarquee: true,
    chipClass: "bg-info-muted text-info",
  },
  favorites: {
    icon: Heart,
    title: "No favorites yet",
    description: "Save products you love while browsing the marketplace.",
    primary: {
      label: "Browse marketplace",
      href: "/explore",
      icon: <Store className="h-4 w-4" aria-hidden />,
    },
    showMarquee: true,
    chipClass: "bg-danger-muted text-danger",
  },
  shops: {
    icon: Store,
    title: "No shops yet",
    description: "Marketplace shops will show up here once sellers onboard.",
    showMarquee: true,
    chipClass: "bg-accent-soft text-accent dark:text-accent-on-dark",
  },
  users: {
    icon: Users,
    title: "No users found",
    description: "Try a different search or wait for new signups.",
    showMarquee: true,
    chipClass: "bg-info-muted text-info",
  },
  generic: {
    icon: FolderCheck,
    title: "Nothing here yet",
    description: "Get started by creating your first item.",
    primary: {
      label: "Get started",
      icon: <Plus className="h-4 w-4" aria-hidden />,
    },
    showMarquee: true,
    chipClass: "bg-muted text-muted-foreground",
  },
};

function ActionButton({
  action,
  variant,
}: {
  action: EmptyState04Action;
  variant: "primary" | "outline";
}) {
  const content = (
    <Button
      variant={variant}
      onClick={action.href ? undefined : action.onClick}
      type="button"
    >
      {action.icon}
      {action.label}
    </Button>
  );

  if (action.href) {
    return (
      <Link href={action.href} onClick={action.onClick}>
        {content}
      </Link>
    );
  }

  return content;
}

function HeroGraphic({
  Icon,
  chipClass,
  showMarquee,
  previewRows,
}: {
  Icon: LucideIcon;
  chipClass: string;
  showMarquee: boolean;
  previewRows: number;
}) {
  if (!showMarquee) {
    return (
      <div
        className={`mb-4 flex h-16 w-16 items-center justify-center rounded-2xl ${chipClass}`}
      >
        <Icon className="h-7 w-7" aria-hidden />
      </div>
    );
  }

  return (
    <div
      className="mb-3 w-full max-w-xs space-y-2"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent), linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        maskComposite: "intersect",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 35%, black 65%, transparent), linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
        WebkitMaskComposite: "source-in",
      }}
    >
      <Marquee className="h-56 [--duration:calc(20s/3)]" repeat={5} vertical>
        {Array.from({ length: Math.max(1, previewRows) }).map((_, i) => (
          <div
            key={i}
            className="flex w-full items-center gap-3 rounded-lg border border-border bg-card px-4 py-3"
          >
            <Icon
              className="h-5 w-5 shrink-0 fill-muted text-muted-foreground/70"
              aria-hidden
            />
            <div className="h-5 w-full rounded-lg bg-muted" />
            <div className="ms-auto size-6 shrink-0 rounded-full bg-muted" />
          </div>
        ))}
      </Marquee>
    </div>
  );
}

/**
 * Animated / condition-aware empty state.
 * Pass `kind` for preset copy + icons; override title/actions as needed.
 */
export default function EmptyState04({
  kind = "generic",
  title,
  description,
  primaryAction,
  secondaryAction,
  icon,
  previewRows = 1,
  showMarquee,
  className = "",
}: EmptyState04Props) {
  const preset = PRESETS[kind] ?? PRESETS.generic;
  const Icon = icon ?? preset.icon;
  const resolvedTitle = title ?? preset.title;
  const resolvedDescription = description ?? preset.description;
  const resolvedPrimary =
    primaryAction === null ? null : (primaryAction ?? preset.primary ?? null);
  const resolvedSecondary =
    secondaryAction === null
      ? null
      : (secondaryAction ?? preset.secondary ?? null);
  const useMarquee = showMarquee ?? preset.showMarquee;

  return (
    <div className={`px-4 py-8 sm:px-6 sm:py-10 ${className}`}>
      <div className="mx-auto max-w-sm pt-0">
        <Empty className="border-0 px-0 py-8 md:px-0 md:py-8">
          <EmptyHeader>
            <HeroGraphic
              Icon={Icon}
              chipClass={preset.chipClass}
              showMarquee={useMarquee}
              previewRows={previewRows}
            />
            <EmptyTitle>{resolvedTitle}</EmptyTitle>
            <EmptyDescription>{resolvedDescription}</EmptyDescription>
          </EmptyHeader>
          {(resolvedPrimary || resolvedSecondary) && (
            <EmptyContent>
              <div className="flex flex-wrap gap-2 *:mx-auto">
                {resolvedPrimary ? (
                  <ActionButton action={resolvedPrimary} variant="primary" />
                ) : null}
                {resolvedSecondary ? (
                  <ActionButton action={resolvedSecondary} variant="outline" />
                ) : null}
              </div>
            </EmptyContent>
          )}
        </Empty>
      </div>
    </div>
  );
}
