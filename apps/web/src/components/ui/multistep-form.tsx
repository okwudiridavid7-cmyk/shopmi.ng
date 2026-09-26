"use client";

import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type MultiStepMeta = {
  id: string;
  label: string;
};

type ShellProps = {
  steps: MultiStepMeta[];
  currentStep: number;
  onStepClick?: (index: number) => void;
  children: ReactNode;
  title?: string;
  subtitle?: string;
  onContinue?: () => void;
  onBack?: () => void;
  continueLabel?: string;
  continueDisabled?: boolean;
  continueBusy?: boolean;
  hideFooter?: boolean;
  className?: string;
  complete?: boolean;
  completeTitle?: string;
  completeSubtitle?: string;
};

/**
 * Multi-step chrome with a continuous progress rail that fills through
 * completed steps (connectors touch neighboring circles).
 */
export function MultiStepShell({
  steps,
  currentStep,
  onStepClick,
  children,
  title,
  subtitle,
  onContinue,
  onBack,
  continueLabel,
  continueDisabled,
  continueBusy,
  hideFooter,
  className,
  complete,
  completeTitle = "You're all set",
  completeSubtitle,
}: ShellProps) {
  const n = Math.max(steps.length, 1);
  const isLast = currentStep >= n - 1;
  // Fill to the center of the current step circle
  const fillPct =
    n <= 1 ? 100 : (currentStep / (n - 1)) * 100;

  if (complete) {
    return (
      <div className={cn("mx-auto w-full max-w-md", className)}>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/30 p-10 sm:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,130,46,0.12),transparent_55%)]" />
          <div className="relative flex flex-col items-center gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-border bg-muted">
              <Check className="h-8 w-8 text-foreground" strokeWidth={2.5} />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold tracking-tight">
                {completeTitle}
              </h2>
              {completeSubtitle ? (
                <p className="text-sm text-muted-foreground">{completeSubtitle}</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto w-full max-w-lg", className)}>
      {/* Step rail — line is centered on the circle row only (not labels). */}
      <div className="relative mx-auto mb-8 w-full max-w-sm px-2">
        <div className="relative">
          <div className="pointer-events-none absolute left-[18px] right-[18px] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-muted" />
          <div
            className="pointer-events-none absolute left-[18px] top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-accent transition-all duration-500 ease-out"
            style={{
              width: `calc((100% - 36px) * ${fillPct / 100})`,
            }}
          />
          <div className="relative flex items-center justify-between">
            {steps.map((step, index) => {
              const done = index < currentStep;
              const active = index === currentStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() =>
                    index < currentStep ? onStepClick?.(index) : undefined
                  }
                  disabled={index > currentStep}
                  aria-label={step.label}
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "relative z-[1] flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all duration-300",
                    "disabled:cursor-not-allowed",
                    done && "border-accent bg-accent text-white",
                    active &&
                      "border-accent bg-accent text-white shadow-[0_0_0_4px_rgba(255,130,46,0.2)]",
                    !done &&
                      !active &&
                      "border-muted bg-card text-muted-foreground"
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <span className="text-sm font-semibold tabular-nums">
                      {index + 1}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="mt-2 flex justify-between gap-1">
          {steps.map((step, index) => (
            <span
              key={step.id}
              className={cn(
                "w-9 truncate text-center text-[10px] font-medium sm:w-auto sm:max-w-[4.5rem] sm:text-xs",
                index <= currentStep
                  ? "text-foreground"
                  : "text-muted-foreground"
              )}
            >
              {step.label}
            </span>
          ))}
        </div>
      </div>

      {(title || subtitle) && (
        <div className="mb-6 space-y-1.5 text-center sm:text-left">
          {title ? (
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {title}
            </h1>
          ) : null}
          {subtitle ? (
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
      )}

      <div className="space-y-6">{children}</div>

      {!hideFooter ? (
        <div className="mt-8 space-y-3">
          {onContinue ? (
            <Button
              type="button"
              variant="primary"
              size="lg"
              className="h-12 w-full gap-2"
              disabled={continueDisabled || continueBusy}
              onClick={onContinue}
            >
              {continueBusy
                ? "Working…"
                : continueLabel ?? (isLast ? "Complete" : "Continue")}
              {!continueBusy ? (
                <ArrowRight className="h-4 w-4" strokeWidth={2} />
              ) : null}
            </Button>
          ) : null}
          {currentStep > 0 && onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="w-full text-center text-sm text-muted-foreground transition hover:text-foreground"
            >
              Go back
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
