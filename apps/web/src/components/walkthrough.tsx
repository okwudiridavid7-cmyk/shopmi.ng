"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "vendors-walkthrough-done";

const STEPS = [
  {
    id: "nav-marketplace",
    title: "Browse the marketplace",
    body: "Filter products by category, brand, price, and location.",
  },
  {
    id: "nav-sell",
    title: "Open a shop",
    body: "Sell takes you through account, shop, and first product setup.",
  },
  {
    id: "nav-buyer",
    title: "Track orders",
    body: "Buyer dashboard holds order history, invoices, and favorites.",
  },
] as const;

export function Walkthrough() {
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(STORAGE_KEY)) return;
    const params = new URLSearchParams(window.location.search);
    const fromCongrats = params.get("walkthrough") === "1";
    if (
      !sessionStorage.getItem("vendors-walkthrough-pending") &&
      !fromCongrats
    ) {
      return;
    }
    if (fromCongrats) {
      sessionStorage.setItem("vendors-walkthrough-pending", "1");
    }
    setActive(true);
  }, []);

  useEffect(() => {
    if (!active) return;
    const targetId = STEPS[step]?.id;
    if (!targetId) return;
    const el = document.querySelector(`[data-tour="${targetId}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [active, step]);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    sessionStorage.removeItem("vendors-walkthrough-pending");
    setActive(false);
  }

  if (!active || !STEPS[step]) return null;

  const current = STEPS[step];
  const pad = 8;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
      {rect && (
        <div
          className="pointer-events-none absolute rounded-md ring-2 ring-accent"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)",
          }}
        />
      )}
      <div className="absolute bottom-8 left-1/2 w-[min(420px,92vw)] -translate-x-1/2 rounded-lg border border-border bg-card p-token-5 shadow-lg">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Tip {step + 1} / {STEPS.length}
        </p>
        <h2 className="mt-1 font-display text-xl">{current.title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{current.body}</p>
        <div className="mt-4 flex justify-between gap-2">
          <button
            type="button"
            onClick={finish}
            className="text-sm text-muted-foreground transition hover:text-foreground"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => {
              if (step >= STEPS.length - 1) finish();
              else setStep((s) => s + 1);
            }}
            className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
          >
            {step >= STEPS.length - 1 ? "Done" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Call after signup/onboarding success to show walkthrough once. */
export function markWalkthroughPending() {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY)) return;
  sessionStorage.setItem("vendors-walkthrough-pending", "1");
}
