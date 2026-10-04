"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, type HTMLMotionProps } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info, X, XOctagon } from "lucide-react";
import { cn } from "@/lib/utils";

const alertToastVariants = cva(
  "relative flex w-full max-w-sm items-start gap-3 overflow-hidden rounded-xl p-4 shadow-lg",
  {
    variants: {
      variant: {
        success: "",
        warning: "",
        info: "",
        error: "",
      },
      styleVariant: {
        default: "border bg-card text-card-foreground",
        filled: "",
      },
    },
    compoundVariants: [
      {
        variant: "success",
        styleVariant: "default",
        className: "border-green-200 dark:border-green-700",
      },
      {
        variant: "warning",
        styleVariant: "default",
        className: "border-yellow-200 dark:border-yellow-700",
      },
      {
        variant: "info",
        styleVariant: "default",
        className: "border-blue-200 dark:border-blue-700",
      },
      {
        variant: "error",
        styleVariant: "default",
        className: "border-red-200 dark:border-red-700",
      },
      { variant: "success", styleVariant: "filled", className: "bg-success text-success-foreground" },
      { variant: "warning", styleVariant: "filled", className: "bg-warning text-warning-foreground" },
      { variant: "info", styleVariant: "filled", className: "bg-info text-white" },
      { variant: "error", styleVariant: "filled", className: "bg-danger text-danger-foreground" },
    ],
    defaultVariants: {
      variant: "info",
      styleVariant: "default",
    },
  }
);

type Variant = "success" | "warning" | "info" | "error";
type StyleVariant = "default" | "filled";

const iconMap: Record<Variant, typeof Info> = {
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
  error: XOctagon,
};

const iconColorClasses: Record<StyleVariant, Record<Variant, string>> = {
  default: {
    success: "text-green-500",
    warning: "text-yellow-500",
    info: "text-blue-500",
    error: "text-red-500",
  },
  filled: {
    success: "text-success-foreground",
    warning: "text-warning-foreground",
    info: "text-white",
    error: "text-danger-foreground",
  },
};

export interface AlertToastProps
  extends Omit<HTMLMotionProps<"div">, "title">,
    VariantProps<typeof alertToastVariants> {
  title: string;
  description?: string;
  onClose: () => void;
}

const AlertToast = React.forwardRef<HTMLDivElement, AlertToastProps>(
  (
    { className, variant, styleVariant, title, description, onClose, ...props },
    ref
  ) => {
    const v: Variant = variant ?? "info";
    const s: StyleVariant = styleVariant ?? "default";
    const Icon = iconMap[v];

    return (
      <motion.div
        ref={ref}
        role={v === "error" ? "alert" : "status"}
        layout
        initial={{ opacity: 0, y: -24, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, x: 40, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        className={cn(alertToastVariants({ variant: v, styleVariant: s }), className)}
        {...props}
      >
        <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", iconColorClasses[s][v])} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">{title}</p>
          {description ? (
            <p
              className={cn(
                "mt-0.5 text-sm",
                s === "default" ? "text-muted-foreground" : "opacity-90"
              )}
            >
              {description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className={cn(
            "shrink-0 rounded-full p-1 opacity-80 transition hover:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            s === "default" ? "text-muted-foreground hover:bg-muted" : "hover:bg-black/20"
          )}
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    );
  }
);

AlertToast.displayName = "AlertToast";

export { AlertToast, alertToastVariants };
