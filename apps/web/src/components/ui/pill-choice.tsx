"use client";

import { cn } from "@/lib/utils";

export type PillOption = {
  value: string;
  label: string;
};

type SingleProps = {
  label: string;
  required?: boolean;
  options: readonly PillOption[];
  value: string;
  onChange: (value: string) => void;
  multi?: false;
  className?: string;
};

type MultiProps = {
  label: string;
  required?: boolean;
  options: readonly PillOption[];
  value: string[];
  onChange: (value: string[]) => void;
  multi: true;
  className?: string;
};

/** Soft pill selectors — single or multi (checkbox-style for currencies). */
export function PillChoice(props: SingleProps | MultiProps) {
  const { label, required, options, className } = props;

  return (
    <div className={cn("space-y-2.5", className)}>
      <p className="text-sm font-semibold text-foreground">
        {label}
        {required ? <span className="text-danger"> *</span> : null}
      </p>
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = props.multi
            ? props.value.includes(opt.value)
            : props.value === opt.value;

          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                if (props.multi) {
                  const next = selected
                    ? props.value.filter((v) => v !== opt.value)
                    : [...props.value, opt.value];
                  props.onChange(next);
                } else {
                  props.onChange(opt.value);
                }
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition",
                selected
                  ? "bg-accent text-white shadow-sm"
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              {props.multi ? (
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    selected
                      ? "border-white bg-white text-accent"
                      : "border-muted-foreground/40"
                  )}
                  aria-hidden
                >
                  {selected ? (
                    <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M2.5 6.5 5 9l4.5-5.5"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : null}
                </span>
              ) : null}
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
