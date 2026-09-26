import type { ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type EmptyProps = ComponentPropsWithoutRef<"div">;

export function Empty({ className, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty"
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-border p-6 text-center text-balance md:p-12",
        className
      )}
      {...props}
    />
  );
}

export function EmptyHeader({ className, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty-header"
      className={cn(
        "flex max-w-sm flex-col items-center gap-2 text-center",
        className
      )}
      {...props}
    />
  );
}

export function EmptyTitle({ className, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty-title"
      className={cn("text-lg font-semibold tracking-tight", className)}
      {...props}
    />
  );
}

export function EmptyDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<"p">) {
  return (
    <p
      data-slot="empty-description"
      className={cn(
        "text-sm leading-relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-accent",
        className
      )}
      {...props}
    />
  );
}

export function EmptyContent({ className, ...props }: EmptyProps) {
  return (
    <div
      data-slot="empty-content"
      className={cn(
        "flex w-full min-w-0 max-w-sm flex-col items-center gap-4 text-balance text-sm",
        className
      )}
      {...props}
    />
  );
}
