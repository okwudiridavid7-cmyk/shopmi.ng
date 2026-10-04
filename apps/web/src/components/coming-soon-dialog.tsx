"use client";

import * as React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Sparkles, X } from "lucide-react";

export default function ComingSoonDialog({
  isOpen,
  feature,
  close,
}: {
  isOpen: boolean;
  feature: string | null;
  close: () => void;
}) {
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const titleId = React.useId();

  React.useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const frame = requestAnimationFrame(() => buttonRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      cancelAnimationFrame(frame);
      previous?.focus?.();
    };
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-4 sm:items-center">
          <motion.button
            type="button"
            aria-label="Close"
            tabIndex={-1}
            className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 text-center shadow-2xl"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={close}
              className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[color-mix(in_oklab,var(--color-accent)_14%,transparent)] text-accent">
              <Sparkles className="h-6 w-6" aria-hidden />
            </span>
            <h2
              id={titleId}
              className="mt-4 font-display text-xl font-bold tracking-tight text-card-foreground"
            >
              Coming soon
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {feature ? (
                <>
                  <span className="font-medium text-foreground">{feature}</span>{" "}
                  is on its way. We’ll let you know when it’s ready.
                </>
              ) : (
                "This feature is on its way. We’ll let you know when it’s ready."
              )}
            </p>
            <button
              ref={buttonRef}
              type="button"
              onClick={close}
              className="mt-6 inline-flex h-11 w-full items-center justify-center rounded-full bg-accent-strong px-6 text-sm font-semibold text-white shadow-sm transition-colors hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Got it
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
