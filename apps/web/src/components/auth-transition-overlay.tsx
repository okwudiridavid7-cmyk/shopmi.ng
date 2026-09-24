"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthTransition } from "@/stores/auth-transition";

const DURATION_MS = 1200;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Full-screen auth moments: session expired, sign-out, welcome back.
 * Brief (~1.2s), respects prefers-reduced-motion.
 */
export function AuthTransitionOverlay() {
  const router = useRouter();
  const pathname = usePathname();
  const { kind, name, nextHref, clear } = useAuthTransition();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!kind) {
      setVisible(false);
      return;
    }
    setVisible(true);
    const reduced = prefersReducedMotion();
    const wait = reduced ? 400 : DURATION_MS;

    const t = window.setTimeout(() => {
      const dest = nextHref;
      clear();
      if (dest && dest !== pathname) {
        router.push(dest);
        router.refresh();
      } else if (dest === pathname) {
        router.refresh();
      }
    }, wait);

    return () => window.clearTimeout(t);
  }, [kind, nextHref, clear, router, pathname]);

  if (!kind || !visible) return null;

  const copy =
    kind === "session-expired"
      ? {
          eyebrow: "Session",
          title: "Your session expired",
          subtitle: "Taking you to sign in…",
        }
      : kind === "sign-out"
        ? {
            eyebrow: "Signed out",
            title: "See you soon",
            subtitle: name ? `Thanks for stopping by, ${name}.` : "Come back anytime.",
          }
        : {
            eyebrow: "Welcome",
            title: name ? `Welcome back, ${name}` : "Welcome back",
            subtitle: "Opening your dashboard…",
          };

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 px-token-6 backdrop-blur-sm motion-safe:animate-fade-in"
    >
      <div className="max-w-sm text-center motion-safe:animate-scale-in">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          {copy.eyebrow}
        </p>
        <h2 className="mt-token-3 font-display text-3xl tracking-tight text-foreground sm:text-4xl">
          {copy.title}
        </h2>
        <p className="mt-token-3 text-sm text-muted-foreground">{copy.subtitle}</p>
        <div
          className="mx-auto mt-token-6 h-0.5 w-16 overflow-hidden rounded-full bg-muted"
          aria-hidden
        >
          <div className="h-full w-full origin-left bg-accent motion-safe:animate-[auth-bar_1.2s_ease-out_forwards]" />
        </div>
      </div>
    </div>
  );
}
