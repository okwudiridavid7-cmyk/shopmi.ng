"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BannerSlide } from "@/lib/default-banners";
import { brandButtonTextColor, parseHexColor } from "@/lib/theme";

type Props = {
  slides: BannerSlide[];
  /** Fallback when slides empty — still renders one premium slide. */
  fallback?: BannerSlide | null;
  className?: string;
  /** Optional brand color for CTA. */
  brandColor?: string | null;
  /** Compact height for editor preview. */
  compact?: boolean;
};

/**
 * Hero banner carousel — one static slide, or rotating when multiple active.
 * scrollSpeed = seconds between advances (clamped 2–30).
 */
export function BannerCarousel({
  slides,
  fallback = null,
  className = "",
  brandColor,
  compact,
}: Props) {
  const active = slides.length > 0 ? slides : fallback ? [fallback] : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(mq.matches);
    const onChange = () => setReduceMotion(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const current = active[Math.min(index, Math.max(0, active.length - 1))];
  const multi = active.length > 1;
  const speedSec = Math.min(
    30,
    Math.max(2, current?.scrollSpeed ?? active[0]?.scrollSpeed ?? 5)
  );

  const go = useCallback(
    (dir: -1 | 1) => {
      setIndex((i) => {
        const n = active.length;
        if (n === 0) return 0;
        return (i + dir + n) % n;
      });
    },
    [active.length]
  );

  useEffect(() => {
    setIndex(0);
  }, [slides.length, fallback?.id]);

  useEffect(() => {
    if (!multi || paused || reduceMotion) return;
    const id = window.setInterval(() => go(1), speedSec * 1000);
    return () => window.clearInterval(id);
  }, [multi, paused, speedSec, go, index, reduceMotion]);

  if (!current) return null;

  const accent = parseHexColor(brandColor);
  const ctaTextColor = brandButtonTextColor(accent);
  const height = compact ? "min-h-[12rem] sm:min-h-[14rem]" : "min-h-[16rem] sm:min-h-[22rem] md:min-h-[26rem]";

  const ctaHref = current.ctaUrl?.trim() || undefined;
  const isHash = ctaHref?.startsWith("#");
  const isExternal = ctaHref?.startsWith("http");

  const cta = current.ctaText ? (
    <span
      className="inline-flex rounded-md px-token-5 py-token-2 text-sm font-semibold shadow-md transition hover:opacity-95"
      style={{
        backgroundColor: accent ?? "var(--color-accent)",
        color: ctaTextColor,
      }}
    >
      {current.ctaText}
    </span>
  ) : null;

  return (
    <section
      className={`relative overflow-hidden rounded-xl border border-border shadow-sm ${height} ${className}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Banners"
    >
      {active.map((slide, i) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
            i === index ? "opacity-100 z-[1]" : "opacity-0 z-0"
          }`}
          aria-hidden={i !== index}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={slide.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/65 via-black/35 to-black/10" />
        </div>
      ))}

      <div className="relative z-[2] flex h-full flex-col justify-center px-token-6 py-token-8 sm:px-token-12 md:max-w-2xl md:px-token-16">
        {current.title && (
          <h2
            className={`font-display tracking-tight text-white drop-shadow ${
              compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl md:text-5xl"
            }`}
          >
            {current.title}
          </h2>
        )}
        {current.subtitle && (
          <p className="mt-token-2 max-w-md text-sm leading-relaxed text-white/90 sm:text-base">
            {current.subtitle}
          </p>
        )}
        {cta && ctaHref && (
          <div className="mt-token-5">
            {isHash || !ctaHref ? (
              <a href={ctaHref ?? "#"}>{cta}</a>
            ) : isExternal ? (
              <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                {cta}
              </a>
            ) : (
              <Link href={ctaHref}>{cta}</Link>
            )}
          </div>
        )}
        {cta && !ctaHref && <div className="mt-token-5">{cta}</div>}
      </div>

      {multi && (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => go(-1)}
            className="absolute left-token-3 top-1/2 z-[3] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={() => go(1)}
            className="absolute right-token-3 top-1/2 z-[3] flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/55"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-token-4 left-1/2 z-[3] flex -translate-x-1/2 gap-token-2">
            {active.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={`h-1.5 rounded-full transition ${
                  i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
