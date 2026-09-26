"use client";

import {
  ButtonHTMLAttributes,
  forwardRef,
  type ReactNode,
} from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variantClass: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-sm hover:bg-accent-deep focus-visible:ring-2 focus-visible:ring-ring",
  secondary:
    "bg-muted text-foreground shadow-sm hover:bg-border/60 focus-visible:ring-2 focus-visible:ring-ring",
  outline:
    "border border-border bg-card text-foreground shadow-sm hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
  danger:
    "bg-danger text-danger-foreground shadow-sm hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring",
};

const sizeClass: Record<Size, string> = {
  sm: "px-token-3 py-token-1 text-xs rounded-sm",
  md: "px-token-4 py-token-2 text-sm rounded-md",
  lg: "px-token-6 py-token-3 text-sm rounded-md",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      className = "",
      type = "button",
      disabled,
      children,
      ...rest
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={`inline-flex items-center justify-center gap-token-2 font-medium transition disabled:opacity-60 motion-safe:active:scale-[0.98] ${variantClass[variant]} ${sizeClass[size]} ${className}`}
        {...rest}
      >
        {children}
      </button>
    );
  }
);
