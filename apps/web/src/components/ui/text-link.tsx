import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<typeof Link>, "className"> & {
  children: ReactNode;
  className?: string;
  /** Optional trailing arrow. */
  arrow?: "left" | "right" | "none";
  tone?: "accent" | "muted" | "danger";
};

/**
 * Secondary navigation link without default underlines.
 * Prefer this (or Button) over `underline` text for CTAs.
 */
export function TextLink({
  children,
  className,
  arrow = "none",
  tone = "accent",
  ...rest
}: Props) {
  const toneClass =
    tone === "muted"
      ? "text-muted-foreground hover:text-foreground"
      : tone === "danger"
        ? "text-danger hover:opacity-90"
        : "text-accent hover:text-accent-deep dark:text-accent-on-dark";

  return (
    <Link
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium transition",
        toneClass,
        className
      )}
      {...rest}
    >
      {arrow === "left" ? (
        <ArrowLeft className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : null}
      {children}
      {arrow === "right" ? (
        <ArrowRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
      ) : null}
    </Link>
  );
}
