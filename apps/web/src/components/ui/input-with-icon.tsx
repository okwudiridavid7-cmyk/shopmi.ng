"use client";

import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  trailing?: ReactNode;
};

/** Text input with leading (and optional trailing) icon. */
export const InputWithIcon = forwardRef<HTMLInputElement, Props>(
  function InputWithIcon({ className = "", icon, trailing, ...rest }, ref) {
    return (
      <div className="relative w-full min-w-0">
        {icon ? (
          <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {icon}
          </span>
        ) : null}
        <Input
          ref={ref}
          className={cn(
            icon ? "pl-10" : "",
            trailing ? "pr-10" : "",
            className
          )}
          {...rest}
        />
        {trailing ? (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">
            {trailing}
          </span>
        ) : null}
      </div>
    );
  }
);
