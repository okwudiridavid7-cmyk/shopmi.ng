import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const variants: Record<BadgeVariant, string> = {
  default: "bg-muted text-foreground",
  accent: "bg-accent text-accent-foreground",
  success: "bg-success/15 text-success",
  warning: "bg-warning-muted text-warning",
  danger: "bg-danger/15 text-danger",
  muted: "bg-muted text-muted-foreground",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-token-1 rounded-sm px-token-2 py-token-1 text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
