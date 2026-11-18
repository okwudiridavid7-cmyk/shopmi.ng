"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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
    body: "Set up your account, shop, and first product in a few steps.",
  },
  {
    id: "nav-buyer",
    title: "Track orders",
    body: "Buyer dashboard holds order history, invoices, and favorites.",
  },
] as const;

const BUYER_STEPS = [
  { id: "buyer-nav", title: "Your buyer workspace", body: "Open your orders, saved favorites, and account details from the sidebar." },
  { id: "buyer-main", title: "Keep track of your purchases", body: "Your dashboard brings order updates and recent activity together." },
  { id: "marketplace-link", title: "Back to the marketplace", body: "Browse shops and discover products whenever you’re ready." },
] as const;

const SELLER_STEPS = [
  { id: "seller-nav", title: "Your seller workspace", body: "Manage products, orders, your storefront, and business settings from the sidebar." },
  { id: "seller-setup", title: "Complete setup in any order", body: "Choose a setup step, finish it, and return for the remaining tasks later." },
  { id: "marketplace-link", title: "Visit the marketplace", body: "See your storefront in the same place your customers shop." },
] as const;

export function Walkthrough() {
  const pathname = usePathname();
  const [step, setStep] = useState(0);
  const [active, setActive] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const steps = pathname.startsWith("/seller") ? SELLER_STEPS : pathname.startsWith("/buyer") ? BUYER_STEPS : STEPS;

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
  }, [pathname]);

  useEffect(() => {
    if (!active) return;
    const targetId = steps[step]?.id;
    if (!targetId) return;
    const el = document.querySelector(`[data-tour="${targetId}"]`);
    if (el) {
      setRect(el.getBoundingClientRect());
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [active, step, steps]);

  function finish() {
    localStorage.setItem(STORAGE_KEY, "1");
    sessionStorage.removeItem("vendors-walkthrough-pending");
    setActive(false);
  }

  if (!active || !steps[step]) return null;

  const current = steps[step];
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
          Tip {step + 1} / {steps.length}
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
              if (step >= steps.length - 1) finish();
              else setStep((s) => s + 1);
            }}
            className="rounded-md bg-accent-strong px-4 py-2 text-sm text-accent-foreground"
          >
            {step >= steps.length - 1 ? "Done" : "Next"}
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
