import * as React from "react";
import { Slot, Slottable } from "@radix-ui/react-slot";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Button12Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  /** Render the child element (e.g. a Link) with the button styling and content. */
  asChild?: boolean;
  variant?: "solid" | "outline";
};

/** Pill button with the label and a round arrow badge that nudges right on hover. */
export function Button12({ label, asChild = false, variant = "solid", className, children, ...props }: Button12Props) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      className={cn(
        "group inline-flex h-14 items-center gap-3 rounded-full pl-7 pr-2 text-base font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        variant === "solid"
          ? "bg-[#141414] text-white hover:bg-black dark:bg-white dark:text-[#141414] dark:hover:bg-zinc-100"
          : "border border-border bg-card text-foreground hover:border-[color-mix(in_oklab,var(--color-foreground)_35%,transparent)]",
        className
      )}
      {...props}
    >
      {asChild ? <Slottable>{children}</Slottable> : null}
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full transition-transform duration-300 group-hover:translate-x-0.5",
          variant === "solid" ? "bg-[#ff822e] text-[#141414]" : "bg-muted text-foreground"
        )}
      >
        <ArrowRight className="h-4 w-4" />
      </span>
    </Comp>
  );
}
