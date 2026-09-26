"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Check, Lock, Square } from "lucide-react";
import { PasswordInput } from "@/components/ui/password-input";
import { cn } from "@/lib/utils";

type Props = {
  name?: string;
  value?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  minLength?: number;
  autoComplete?: string;
  label?: string;
  placeholder?: string;
  /** Leading icon; defaults to Lock. Pass null to hide. */
  icon?: ReactNode | null;
  className?: string;
};

function scorePassword(pw: string) {
  const rules = {
    length: pw.length >= 12,
    case: /[a-z]/.test(pw) && /[A-Z]/.test(pw),
    number: /\d/.test(pw),
    symbol: /[^A-Za-z0-9]/.test(pw),
  };
  const met = Object.values(rules).filter(Boolean).length;
  let label = "Weak";
  let segments = 1;
  if (met >= 4 && pw.length >= 12) {
    label = "Strong";
    segments = 4;
  } else if (met >= 3) {
    label = "Good";
    segments = 3;
  } else if (met >= 2) {
    label = "Fair";
    segments = 2;
  } else if (pw.length > 0) {
    label = "Weak";
    segments = 1;
  } else {
    segments = 0;
    label = "";
  }
  return { rules, met, label, segments };
}

/** Password field + strength bars + requirement checklist. */
export function PasswordStrengthField({
  name = "password",
  value: controlled,
  onChange,
  required,
  minLength = 8,
  autoComplete = "new-password",
  label = "Password",
  placeholder = "Create a strong password",
  icon,
  className,
}: Props) {
  const [internal, setInternal] = useState("");
  const value = controlled ?? internal;
  const { rules, label: strength, segments } = useMemo(
    () => scorePassword(value),
    [value]
  );
  const leadingIcon =
    icon === null ? null : (icon ?? <Lock className="h-4 w-4" aria-hidden />);

  return (
    <div className={cn("space-y-3", className)}>
      <label className="block space-y-1.5 text-sm">
        <span className="font-medium text-foreground">{label}</span>
        <div className="relative">
          {leadingIcon ? (
            <span className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2 text-muted-foreground">
              {leadingIcon}
            </span>
          ) : null}
          <PasswordInput
            name={name}
            value={value}
            required={required}
            minLength={minLength}
            autoComplete={autoComplete}
            placeholder={placeholder}
            className={cn(leadingIcon ? "pl-10" : undefined)}
            onChange={(e) => {
              setInternal(e.target.value);
              onChange?.(e.target.value);
            }}
          />
        </div>
      </label>

      {value.length > 0 ? (
        <>
          <div className="grid grid-cols-4 gap-1.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-colors",
                  i < segments
                    ? segments >= 3
                      ? "bg-emerald-500"
                      : segments === 2
                        ? "bg-amber-500"
                        : "bg-danger"
                    : "bg-muted"
                )}
              />
            ))}
          </div>
          {strength ? (
            <p
              className={cn(
                "text-sm font-semibold",
                segments >= 3
                  ? "text-emerald-600 dark:text-emerald-400"
                  : segments === 2
                    ? "text-amber-600 dark:text-amber-400"
                    : "text-danger"
              )}
            >
              {strength}
            </p>
          ) : null}
          <ul className="space-y-1.5 text-sm">
            {(
              [
                ["length", "12 characters or more", rules.length],
                ["case", "Upper and lower case", rules.case],
                ["number", "A number", rules.number],
                ["symbol", "A symbol", rules.symbol],
              ] as const
            ).map(([key, text, ok]) => (
              <li
                key={key}
                className={cn(
                  "flex items-center gap-2",
                  ok ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {ok ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded bg-emerald-500 text-white">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                ) : (
                  <Square className="h-4 w-4 text-muted-foreground/50" />
                )}
                {text}
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  );
}
