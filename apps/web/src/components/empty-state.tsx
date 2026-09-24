import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Centered empty state with icon — list views and tables. */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  icon: Icon,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  icon?: LucideIcon;
}) {
  const action =
    actionLabel && onAction ? (
      <Button variant="primary" size="md" onClick={onAction}>
        {actionLabel}
      </Button>
    ) : actionLabel && actionHref ? (
      <Link href={actionHref}>
        <Button variant="primary" size="md">
          {actionLabel}
        </Button>
      </Link>
    ) : null;

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 px-token-6 py-token-12 text-center motion-safe:animate-page-enter sm:px-token-10 sm:py-token-16">
      {Icon && (
        <div className="mb-token-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-7 w-7" aria-hidden />
        </div>
      )}
      <div className="mx-auto max-w-md space-y-token-2">
        <h2 className="font-display text-xl text-foreground sm:text-2xl">
          {title}
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      {action && <div className="mt-token-6">{action}</div>}
    </div>
  );
}
