"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

type Phase = "idle" | "start" | "loading" | "finishing";

const GIVE_UP_MS = 20_000;

/**
 * Thin top bar shown from the moment an internal link is clicked until the
 * next route renders, so slow page loads never look like a dead click.
 */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <ProgressBar />
    </Suspense>
  );
}

function ProgressBar() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const [phase, setPhase] = useState<Phase>("idle");
  const phaseRef = useRef<Phase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const go = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const finish = () => {
    if (phaseRef.current === "idle" || phaseRef.current === "finishing") return;
    clearTimers();
    go("finishing");
    timers.current.push(setTimeout(() => go("idle"), 450));
  };

  useEffect(() => {
    finish();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, search]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target && anchor.target !== "_self") return;
      if (anchor.hasAttribute("download")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;

      clearTimers();
      go("start");
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          if (phaseRef.current === "start") go("loading");
        })
      );
      timers.current.push(setTimeout(finish, GIVE_UP_MS));
    };
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "idle") return null;

  const width = phase === "start" ? "0%" : phase === "loading" ? "85%" : "100%";
  const transition =
    phase === "start"
      ? "none"
      : phase === "loading"
        ? "width 8s cubic-bezier(0.1, 0.7, 0.2, 1)"
        : "width 200ms ease-out, opacity 250ms ease 200ms";

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px]"
    >
      <div
        className="h-full bg-accent-strong shadow-[0_0_8px_var(--color-accent)]"
        style={{ width, transition, opacity: phase === "finishing" ? 0 : 1 }}
      />
    </div>
  );
}
