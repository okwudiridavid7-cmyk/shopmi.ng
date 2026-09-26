"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Elevated settings/onboarding card — title, optional tabs, body.
 * Matches modern SaaS settings panel screenshots.
 */
export function SettingsCard({
  title,
  description,
  tabs,
  activeTab,
  onTabChange,
  children,
  footer,
  className,
}: {
  title: string;
  description?: string;
  tabs?: { id: string; label: string }[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8",
        className
      )}
    >
      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {tabs && tabs.length > 0 ? (
        <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 sm:inline-grid sm:auto-cols-fr">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange?.(tab.id)}
              className={cn(
                "rounded-lg px-4 py-2.5 text-sm font-medium transition",
                activeTab === tab.id
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-6 space-y-5">{children}</div>
      {footer ? <div className="mt-8">{footer}</div> : null}
    </div>
  );
}
