"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { useAuthTransition } from "@/stores/auth-transition";

const DURATION_MS = 1400;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type Copy = {
  eyebrow: string;
  title: string;
  subtitle: string;
};

function copyFor(
  kind: NonNullable<ReturnType<typeof useAuthTransition.getState>["kind"]>,
  name: string | null
): Copy {
  if (kind === "session-expired") {
    return {
      eyebrow: "Almost there",
      title: "Sign in to continue",
      subtitle: "Saving your place and taking you to sign in…",
    };
  }
  if (kind === "sign-out") {
    return {
      eyebrow: "Signed out",
      title: "Just a moment",
      subtitle: name
        ? `Hanging your coat, ${name}. See you next time.`
        : "Hanging your coat. Taking you home.",
    };
  }
  if (kind === "signing-in") {
    return {
      eyebrow: "Signing in",
      title: "Just a moment",
      subtitle: "Checking your credentials…",
    };
  }
  // welcome
  return {
    eyebrow: "Welcome back",
    title: "Just a moment",
    subtitle: name
      ? `Hanging your coat, ${name}. Taking you to your workspace.`
      : "Hanging your coat. Taking you to your workspace.",
  };
}

/**
 * Full-screen auth transition overlay.
 * High-contrast text in light & dark; soft radial underlay + grid.
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

    // signing-in stays until welcome/clear — no auto-navigate
    if (kind === "signing-in") return;

    const reduced = prefersReducedMotion();
    const wait = reduced ? 400 : DURATION_MS;

    const t = window.setTimeout(() => {
      const dest = nextHref;
      clear();
      if (!dest) return;
      if (dest !== pathname) {
        // Hard assign after auth moments — soft router.push can no-op when the
        // overlay unmount races with navigation (login → dashboard especially).
        if (
          kind === "session-expired" ||
          kind === "welcome" ||
          kind === "sign-out"
        ) {
          window.location.assign(dest);
        } else {
          router.push(dest);
          router.refresh();
        }
      } else {
        router.refresh();
      }
    }, wait);

    return () => window.clearTimeout(t);
  }, [kind, nextHref, clear, router, pathname]);

  if (!kind || !visible) return null;

  const copy = copyFor(kind, name);

  return (
    <div
      role="status"
      aria-live="polite"
      className="auth-transition-overlay fixed inset-0 z-[100] flex items-center justify-center px-6 motion-safe:animate-fade-in"
    >
      {/* Soft underlay — always readable vs page behind */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[var(--auth-overlay-bg)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 55% 45% at 50% 100%, var(--auth-overlay-glow), transparent 70%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[min(28rem,70vh)] w-[min(36rem,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-3xl opacity-[0.55] dark:opacity-[0.25]"
        style={{
          backgroundImage:
            "linear-gradient(to right, var(--auth-overlay-grid) 1px, transparent 1px), linear-gradient(to bottom, var(--auth-overlay-grid) 1px, transparent 1px)",
          backgroundSize: "18px 18px",
          maskImage:
            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 20%, transparent 75%)",
        }}
      />

      <div className="relative z-10 max-w-md text-center motion-safe:animate-scale-in">
        <div className="mb-5 flex justify-center">
          <BrandMark href="/" className="pointer-events-none [&_img]:h-9 [&_img]:sm:h-10" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--auth-overlay-accent)]">
          {copy.eyebrow}
        </p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[var(--auth-overlay-title)] sm:text-4xl">
          {copy.title}
          <span
            className="ml-1 inline-block h-2.5 w-2.5 translate-y-[-2px] rounded-[3px] bg-[var(--auth-overlay-accent)] align-middle opacity-90"
            aria-hidden
          />
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--auth-overlay-muted)]">
          {copy.subtitle}
        </p>
        <div
          className="mx-auto mt-8 h-px w-24 bg-[var(--auth-overlay-rule)]"
          aria-hidden
        />
      </div>
    </div>
  );
}
