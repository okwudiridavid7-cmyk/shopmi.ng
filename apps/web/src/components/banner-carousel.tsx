"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  BANNER_AUTOPLAY_SEC,
  ensurePeekSlides,
  platformDefaultSlides,
  type BannerSlide,
} from "@/lib/default-banners";
import { brandButtonTextColor, parseHexColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

type Props = {
  slides: BannerSlide[];
  fallback?: BannerSlide | null;
  className?: string;
  brandColor?: string | null;
  compact?: boolean;
  padDefaults?: BannerSlide[];
};

/**
 * Centered hero with left/right peek neighbors.
 * Autoplay every 10s. Copy is vertically centered in the left half.
 */
export function BannerCarousel({
  slides,
  fallback = null,
  className = "",
  brandColor,
  compact,
  padDefaults,
}: Props) {
  const defaults = useMemo(
    () => padDefaults ?? platformDefaultSlides(),
    [padDefaults]
  );

  const active = useMemo(() => {
    const base =
      slides.length > 0 ? slides : fallback ? [fallback] : defaults;
    return ensurePeekSlides(base, defaults);
  }, [slides, fallback, defaults]);

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

  const multi = active.length > 1;
  const current = active[Math.min(index, Math.max(0, active.length - 1))];
  const speedSec = Math.min(
    30,
    Math.max(2, current?.scrollSpeed ?? BANNER_AUTOPLAY_SEC)
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

  const slideKey = slides.map((s) => s.id).join("|");
  useEffect(() => {
    setIndex(0);
  }, [slideKey, fallback?.id]);

  useEffect(() => {
    if (!multi || paused || reduceMotion) return;
    const id = window.setInterval(() => go(1), speedSec * 1000);
    return () => window.clearInterval(id);
  }, [multi, paused, speedSec, go, index, reduceMotion]);

  if (!current || active.length === 0) return null;

  const accent = parseHexColor(brandColor);
  const ctaTextColor = brandButtonTextColor(accent);
  const height = compact
    ? "h-[12rem] sm:h-[14rem]"
    : "h-[15rem] sm:h-[20rem] md:h-[24rem] lg:h-[26rem]";

  /**
   * Slide = 78% of viewport track; side inset = (100 - 78) / 2 = 11%.
   * Mobile uses 90% slides / 5% inset for a lighter peek.
   */
  const trackStyle = {
    // Mobile
    ["--slide-w" as string]: "90%",
    ["--side-inset" as string]: "5%",
    ["--gap" as string]: "0.75rem",
    transform: `translateX(calc(var(--side-inset) - ${index} * (var(--slide-w) + var(--gap))))`,
  } as CSSProperties;

  return (
    <section
      className={cn("relative w-full", className)}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Banners"
    >
      <div className="relative overflow-hidden">
        <div
          className={cn(
            "flex gap-[var(--gap)]",
            "transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
            "md:[--slide-w:78%] md:[--side-inset:11%] md:[--gap:1rem]",
            "sm:[--slide-w:84%] sm:[--side-inset:8%] sm:[--gap:0.875rem]"
          )}
          style={trackStyle}
        >
          {active.map((slide, i) => (
            <BannerSlideCard
              key={slide.id}
              slide={slide}
              active={i === index}
              accent={accent}
              ctaTextColor={ctaTextColor}
              height={height}
              className="w-[var(--slide-w)] shrink-0 grow-0"
            />
          ))}
        </div>
      </div>

      {multi ? (
        <>
          <button
            type="button"
            aria-label="Previous banner"
            onClick={() => go(-1)}
            className="absolute left-1 top-1/2 z-[3] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur-sm transition hover:bg-card sm:left-2 sm:flex md:left-4"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            aria-label="Next banner"
            onClick={() => go(1)}
            className="absolute right-1 top-1/2 z-[3] hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card/95 text-foreground shadow-md backdrop-blur-sm transition hover:bg-card sm:right-2 sm:flex md:right-4"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="mt-4 flex items-center justify-center gap-2">
            {active.map((s, i) => (
              <button
                key={s.id}
                type="button"
                aria-label={`Go to banner ${i + 1}`}
                aria-current={i === index}
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index
                    ? "w-7 bg-accent"
                    : "w-2 bg-muted-foreground/35 hover:bg-muted-foreground/55"
                )}
              />
            ))}
          </div>
        </>
      ) : null}
    </section>
  );
}

function BannerSlideCard({
  slide,
  active,
  accent,
  ctaTextColor,
  height,
  className,
}: {
  slide: BannerSlide;
  active: boolean;
  accent: string | null;
  ctaTextColor: string;
  height: string;
  className?: string;
}) {
  const ctaHref = slide.ctaUrl?.trim() || undefined;
  const isHash = ctaHref?.startsWith("#");
  const isExternal = ctaHref?.startsWith("http");

  const cta = slide.ctaText ? (
    <span
      className="inline-flex items-center rounded-full px-6 py-2.5 text-sm font-semibold shadow-md transition hover:opacity-95"
      style={{
        backgroundColor: accent ?? "var(--color-accent)",
        color: ctaTextColor,
      }}
    >
      {slide.ctaText}
    </span>
  ) : null;

  return (
    <article
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border/50 shadow-md",
        "transition-[opacity,transform] duration-500",
        active ? "scale-100 opacity-100" : "scale-[0.985] opacity-75",
        height,
        className
      )}
      aria-hidden={!active}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={slide.imageUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(105deg, rgba(10,10,12,0.82) 0%, rgba(10,10,12,0.58) 40%, rgba(10,10,12,0.2) 65%, rgba(10,10,12,0.1) 100%)",
        }}
      />

      {/* Vertically centered copy block on the left */}
      <div className="relative z-[1] flex h-full w-full items-center">
        <div className="flex w-full flex-col justify-center px-6 py-8 sm:px-10 md:w-[50%] md:px-12 lg:px-14">
          {slide.title ? (
            <h2 className="font-display text-2xl font-bold leading-[1.12] tracking-tight text-white drop-shadow-sm sm:text-3xl md:text-4xl lg:text-[2.75rem]">
              {slide.title}
            </h2>
          ) : null}
          {slide.subtitle ? (
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/90 sm:mt-4 sm:text-[0.95rem]">
              {slide.subtitle}
            </p>
          ) : null}
          {cta ? (
            <div className="mt-5 sm:mt-7">
              {ctaHref ? (
                isHash ? (
                  <a href={ctaHref}>{cta}</a>
                ) : isExternal ? (
                  <a href={ctaHref} target="_blank" rel="noopener noreferrer">
                    {cta}
                  </a>
                ) : (
                  <Link href={ctaHref}>{cta}</Link>
                )
              ) : (
                cta
              )}
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
