"use client";

import * as React from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";
import { CookieIcon } from "@/components/shell/nav-icons";
import type { ConsentCategory } from "@/lib/cookie-consent";
import { cn } from "@/lib/utils";

type Choice = Record<ConsentCategory, boolean>;

const CATEGORIES: {
  id: ConsentCategory | "essential";
  label: string;
  description: string;
}[] = [
  {
    id: "essential",
    label: "Essential",
    description: "Sign-in, cart and security. Always on.",
  },
  {
    id: "functional",
    label: "Functional",
    description: "Live chat support and saved preferences.",
  },
  {
    id: "analytics",
    label: "Analytics",
    description: "Helps us understand how Shopmi is used.",
  },
  {
    id: "marketing",
    label: "Marketing",
    description: "Relevant offers from Shopmi and partner shops.",
  },
];

const ALL_ON: Choice = { functional: true, analytics: true, marketing: true };
const ALL_OFF: Choice = { functional: false, analytics: false, marketing: false };

export default function CookieConsentUi({
  showBanner,
  prefsOpen,
  draft,
  setDraft,
  save,
  openPreferences,
  closePrefs,
}: {
  showBanner: boolean;
  prefsOpen: boolean;
  draft: Choice;
  setDraft: React.Dispatch<React.SetStateAction<Choice>>;
  save: (choice: Choice) => void;
  openPreferences: () => void;
  closePrefs: () => void;
}) {
  return (
    <>
      <AnimatePresence>
        {showBanner ? (
          <motion.div
            role="region"
            aria-label="Cookie consent"
            className="fixed inset-x-3 bottom-3 z-[90] rounded-2xl border border-border bg-card p-5 shadow-2xl sm:inset-x-auto sm:bottom-5 sm:left-5 sm:max-w-md sm:p-6"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fff3d9] text-[#1c1c1f]">
                <CookieIcon className="h-6 w-6" />
              </span>
              <p className="text-[15px] leading-relaxed text-foreground">
                By clicking “Accept all”, you agree to the storing of cookies on
                your device for functional, analytics, and marketing purposes.
                See our{" "}
                <Link
                  href="/cookies"
                  className="font-medium text-accent-strong underline-offset-2 hover:underline dark:text-accent-on-dark"
                >
                  cookie policy
                </Link>
                .
              </p>
            </div>
            <button
              type="button"
              onClick={openPreferences}
              className="mt-4 text-sm font-semibold text-accent-strong underline underline-offset-2 dark:text-accent-on-dark"
            >
              Manage preferences
            </button>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => save(ALL_OFF)}
                className="h-11 rounded-lg border-2 border-accent-strong text-sm font-semibold text-accent-strong transition hover:bg-muted dark:border-accent-on-dark dark:text-accent-on-dark"
              >
                Reject all
              </button>
              <button
                type="button"
                onClick={() => save(ALL_ON)}
                className="h-11 rounded-lg bg-accent-strong text-sm font-semibold text-white shadow-sm transition hover:brightness-90"
              >
                Accept all
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {prefsOpen ? (
          <div className="fixed inset-0 z-[95] flex items-end justify-center p-3 sm:items-center sm:p-4">
            <motion.button
              type="button"
              aria-label="Close"
              tabIndex={-1}
              className="absolute inset-0 bg-black/40 backdrop-blur-[4px]"
              onClick={() => closePrefs()}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="cookie-prefs-title"
              className="relative flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <h2
                  id="cookie-prefs-title"
                  className="flex items-center gap-2 font-display text-lg font-bold text-foreground"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#fff3d9] text-[#1c1c1f]">
                    <CookieIcon className="h-5 w-5" />
                  </span>
                  Cookie preferences
                </h2>
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => closePrefs()}
                  className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <ul className="divide-y divide-border overflow-y-auto px-5">
                {CATEGORIES.map((cat) => {
                  const locked = cat.id === "essential";
                  const checked = locked || draft[cat.id as ConsentCategory];
                  return (
                    <li key={cat.id} className="flex items-center justify-between gap-4 py-4">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {cat.label}
                        </p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {cat.description}
                        </p>
                      </div>
                      <Switch
                        label={cat.label}
                        checked={checked}
                        disabled={locked}
                        onChange={(next) =>
                          setDraft((d) => ({ ...d, [cat.id]: next }))
                        }
                      />
                    </li>
                  );
                })}
              </ul>

              <div className="grid grid-cols-2 gap-3 border-t border-border px-5 py-4 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => save(ALL_OFF)}
                  className="h-11 rounded-lg border border-border text-sm font-semibold text-foreground transition hover:bg-muted"
                >
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={() => save(draft)}
                  className="h-11 rounded-lg border-2 border-accent-strong text-sm font-semibold text-accent-strong transition hover:bg-muted dark:border-accent-on-dark dark:text-accent-on-dark"
                >
                  Save choices
                </button>
                <button
                  type="button"
                  onClick={() => save(ALL_ON)}
                  className="col-span-2 h-11 rounded-lg bg-accent-strong text-sm font-semibold text-white shadow-sm transition hover:brightness-90 sm:col-span-1"
                >
                  Accept all
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </>
  );
}

function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
        checked ? "bg-accent-strong" : "bg-[#d4d4d8] dark:bg-[#3f3f46]"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
          checked ? "translate-x-[22px]" : "translate-x-[2px]"
        )}
      />
    </button>
  );
}
