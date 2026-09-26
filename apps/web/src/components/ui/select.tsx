"use client";

import {
  forwardRef,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  /** Optional leading icon inside the control. */
  icon?: ReactNode;
};

/**
 * Styled select with room for the native chevron (pr-10) + optional leading icon.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  function Select({ className = "", icon, children, ...rest }, ref) {
    return (
      <div className="relative w-full min-w-0">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <select
          ref={ref}
          className={cn(
            "ui-select w-full appearance-none rounded-lg border border-border bg-card py-2.5 text-sm text-foreground outline-none transition",
            "focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
            icon ? "pl-10 pr-11" : "pl-3.5 pr-11",
            className
          )}
          {...rest}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
      </div>
    );
  }
);
