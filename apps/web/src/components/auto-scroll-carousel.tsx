"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  children: ReactNode[];
  /** Auto-scroll when item count exceeds this (default 7). */
  threshold?: number;
  /** Interval ms between advances when auto-scrolling. */
  intervalMs?: number;
  className?: string;
  /** Fixed card width class for horizontal items. */
  itemClassName?: string;
};

/**
 * Horizontal product/shop row — auto-scrolls when > threshold items.
 * Edge fades, prev/next, pauses on hover/manual interaction.
 */
export function AutoScrollCarousel({
  children,
  threshold = 7,
  intervalMs = 3500,
  className = "",
  itemClassName = "w-[min(100%,16rem)] shrink-0 sm:w-64",
}: Props) {
  const items = children.filter(Boolean);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const resumeTimer = useRef<number | null>(null);
  const autoEnabled = items.length > threshold && !reduceMotion;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const scrollByPage = useCallback((dir: -1 | 1) => {
    const el = scrollerRef.current;
    if (!el) return;
    const amount = Math.max(el.clientWidth * 0.75, 200);
    el.scrollBy({ left: dir * amount, behavior: "smooth" });
  }, []);

  const pauseForInteraction = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    resumeTimer.current = window.setTimeout(() => setPaused(false), 6000);
  }, []);

  useEffect(() => {
    if (!autoEnabled || paused) return;
    const id = window.setInterval(() => {
      const el = scrollerRef.current;
      if (!el) return;
      const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      if (atEnd) {
        el.scrollTo({ left: 0, behavior: "smooth" });
      } else {
        scrollByPage(1);
      }
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [autoEnabled, paused, intervalMs, scrollByPage]);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) window.clearTimeout(resumeTimer.current);
    };
  }, []);

  if (items.length === 0) return null;

  if (items.length <= threshold) {
    return (
      <div
        className={`grid gap-token-4 grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 ${className}`}
      >
        {items}
      </div>
    );
  }

  return (
    <div
      className={`group/carousel relative ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={pauseForInteraction}
    >
      <div
        className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent sm:w-14"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent sm:w-14"
        aria-hidden
      />

      <button
        type="button"
        aria-label="Previous"
        onClick={() => {
          pauseForInteraction();
          scrollByPage(-1);
        }}
        className="absolute left-token-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md opacity-0 transition group-hover/carousel:opacity-100 focus-visible:opacity-100"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        aria-label="Next"
        onClick={() => {
          pauseForInteraction();
          scrollByPage(1);
        }}
        className="absolute right-token-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md opacity-0 transition group-hover/carousel:opacity-100 focus-visible:opacity-100"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={scrollerRef}
        className="flex gap-token-4 overflow-x-auto scroll-smooth px-token-1 pb-token-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((child, i) => (
          <div key={i} className={itemClassName}>
            {child}
          </div>
        ))}
      </div>
    </div>
  );
}
