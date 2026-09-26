"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type RadioCardOption = {
  value: string;
  title: string;
  description?: string;
  /** Optional trailing meta (e.g. price). */
  meta?: string;
  icon?: ReactNode;
};

type Props = {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly RadioCardOption[];
  /** vertical (default) | grid (2–3 cols) | row (horizontal cards like delivery) */
  layout?: "vertical" | "grid" | "row";
  className?: string;
};

/**
 * Card-style radio group — selected: accent soft fill + border + filled radio.
 * Matches modern checkout delivery/payment selectors.
 */
export function RadioCardGroup({
  name,
  value,
  onChange,
  options,
  layout = "vertical",
  className,
}: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={name}
      className={cn(
        layout === "row" &&
          "grid gap-3 sm:grid-cols-3",
        layout === "grid" && "grid gap-3 sm:grid-cols-2",
        layout === "vertical" && "space-y-3",
        className
      )}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        const isRow = layout === "row";
        return (
          <label
            key={opt.value}
            className={cn(
              "relative flex cursor-pointer rounded-2xl border p-4 transition",
              isRow ? "min-h-[7.5rem] flex-col justify-between gap-3" : "items-center gap-3",
              selected
                ? "border-accent bg-accent/10 shadow-sm ring-1 ring-accent/40"
                : "border-border bg-card hover:border-foreground/20 hover:bg-muted/30"
            )}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="sr-only"
            />

            {isRow ? (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">
                      {opt.title}
                    </p>
                    {opt.description ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {opt.description}
                      </p>
                    ) : null}
                  </div>
                  <RadioDot selected={selected} />
                </div>
                {opt.meta ? (
                  <p className="text-sm font-semibold text-foreground">
                    {opt.meta}
                  </p>
                ) : null}
              </>
            ) : (
              <>
                {opt.icon ? (
                  <span
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
                      selected
                        ? "border-accent/40 bg-accent/15 text-accent dark:text-accent-on-dark"
                        : "border-border bg-muted text-muted-foreground"
                    )}
                  >
                    {opt.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-foreground">
                    {opt.title}
                  </span>
                  {opt.description ? (
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {opt.description}
                    </span>
                  ) : null}
                  {opt.meta ? (
                    <span className="mt-1 block text-sm font-semibold text-foreground">
                      {opt.meta}
                    </span>
                  ) : null}
                </span>
                <RadioDot selected={selected} />
              </>
            )}
          </label>
        );
      })}
    </div>
  );
}

function RadioDot({ selected }: { selected: boolean }) {
  return (
    <span
      className={cn(
        "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
        selected
          ? "border-accent bg-accent"
          : "border-muted-foreground/35 bg-transparent"
      )}
      aria-hidden
    >
      {selected ? (
        <span className="h-2 w-2 rounded-full bg-white" />
      ) : null}
    </span>
  );
}
