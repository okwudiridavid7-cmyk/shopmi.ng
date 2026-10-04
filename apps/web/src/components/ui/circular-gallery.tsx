"use client";

import * as React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface GalleryItem {
  common: string;
  binomial?: string;
  href?: string;
  photo: {
    url: string;
    text: string;
    pos?: string;
    by?: string;
  };
}

interface CircularGalleryProps extends React.HTMLAttributes<HTMLDivElement> {
  items: GalleryItem[];
  /** Distance of the cards from the centre at full size, in px. */
  radius?: number;
  /** Degrees per frame while the page is not scrolling. */
  autoRotateSpeed?: number;
  /** Upper bound for the responsive scale; 0.5 renders at half size on wide screens. */
  maxScale?: number;
}

const CARD_W = 300;
const CARD_H = 400;
/** Container width at which the gallery renders at full size. */
const FULL_SIZE_WIDTH = 1200;
const MIN_SCALE = 0.45;

const CircularGallery = React.forwardRef<HTMLDivElement, CircularGalleryProps>(
  ({ items, className, radius = 600, autoRotateSpeed = 0.02, maxScale = 1, ...props }, ref) => {
    const rootRef = React.useRef<HTMLDivElement | null>(null);
    const [rotation, setRotation] = React.useState(0);
    const [scale, setScale] = React.useState(1);
    const [inView, setInView] = React.useState(false);
    const [reduceMotion, setReduceMotion] = React.useState(false);
    const scrollingRef = React.useRef(false);

    const setRefs = React.useCallback(
      (node: HTMLDivElement | null) => {
        rootRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) ref.current = node;
      },
      [ref]
    );

    React.useEffect(() => {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const sync = () => setReduceMotion(mq.matches);
      sync();
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }, []);

    React.useEffect(() => {
      const node = rootRef.current;
      if (!node) return;
      const resize = new ResizeObserver(([entry]) => {
        const width = entry?.contentRect.width ?? FULL_SIZE_WIDTH;
        setScale(Math.min(1, Math.max(MIN_SCALE, width / FULL_SIZE_WIDTH)));
      });
      const visibility = new IntersectionObserver(([entry]) => setInView(Boolean(entry?.isIntersecting)), {
        rootMargin: "120px",
      });
      resize.observe(node);
      visibility.observe(node);
      return () => {
        resize.disconnect();
        visibility.disconnect();
      };
    }, []);

    // Scrolling the page turns the ring by the scroll delta, so it never jumps away from the auto-rotation.
    React.useEffect(() => {
      if (reduceMotion || !inView) return;
      let lastY = window.scrollY;
      let timeout: ReturnType<typeof setTimeout> | null = null;
      const onScroll = () => {
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const delta = window.scrollY - lastY;
        lastY = window.scrollY;
        if (scrollable > 0) setRotation((r) => r + (delta / scrollable) * 360);
        scrollingRef.current = true;
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          scrollingRef.current = false;
        }, 150);
      };
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        window.removeEventListener("scroll", onScroll);
        if (timeout) clearTimeout(timeout);
      };
    }, [reduceMotion, inView]);

    React.useEffect(() => {
      if (reduceMotion || !inView || autoRotateSpeed === 0) return;
      let frame = 0;
      const tick = () => {
        if (!scrollingRef.current && !document.hidden) setRotation((r) => r + autoRotateSpeed);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(frame);
    }, [reduceMotion, inView, autoRotateSpeed]);

    if (!items.length) return null;

    const anglePerItem = 360 / items.length;
    const effectiveScale = Math.min(scale, maxScale);
    const cardW = CARD_W * effectiveScale;
    const cardH = CARD_H * effectiveScale;

    return (
      <div
        ref={setRefs}
        role="region"
        aria-label="Circular 3D gallery"
        className={cn("relative flex h-full w-full items-center justify-center", className)}
        style={{ perspective: "2000px" }}
        {...props}
      >
        <div
          className="relative h-full w-full"
          style={{ transform: `rotateY(${rotation}deg)`, transformStyle: "preserve-3d" }}
        >
          {items.map((item, i) => {
            const itemAngle = i * anglePerItem;
            const relativeAngle = (itemAngle + (rotation % 360) + 360) % 360;
            const normalizedAngle = Math.abs(relativeAngle > 180 ? 360 - relativeAngle : relativeAngle);
            const opacity = Math.max(0.3, 1 - normalizedAngle / 180);
            const facing = normalizedAngle < 90;

            const card = (
              <div className="group relative h-full w-full overflow-hidden rounded-lg border border-border bg-[color-mix(in_oklab,var(--color-card)_70%,transparent)] shadow-2xl backdrop-blur-lg dark:bg-[color-mix(in_oklab,var(--color-card)_30%,transparent)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.photo.url}
                  alt={item.photo.text}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  style={{ objectPosition: item.photo.pos || "center" }}
                />
                <div
                  className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent text-white"
                  style={{ padding: `${Math.max(10, 16 * effectiveScale)}px` }}
                >
                  <h3 className="font-bold leading-tight" style={{ fontSize: `${Math.max(14, 20 * effectiveScale)}px` }}>
                    {item.common}
                  </h3>
                  {item.binomial ? (
                    <p className="mt-1 line-clamp-2 opacity-80" style={{ fontSize: `${Math.max(11, 14 * effectiveScale)}px` }}>
                      {item.binomial}
                    </p>
                  ) : null}
                  {item.photo.by ? <p className="mt-2 text-xs opacity-70">Photo by: {item.photo.by}</p> : null}
                </div>
              </div>
            );

            return (
              <div
                key={item.photo.url + i}
                role="group"
                aria-label={item.common}
                className="absolute"
                style={{
                  width: cardW,
                  height: cardH,
                  left: "50%",
                  top: "50%",
                  marginLeft: -cardW / 2,
                  marginTop: -cardH / 2,
                  transform: `rotateY(${itemAngle}deg) translateZ(${radius * effectiveScale}px)`,
                  opacity,
                  transition: "opacity 0.3s linear",
                }}
              >
                {item.href ? (
                  <Link
                    href={item.href}
                    tabIndex={facing ? 0 : -1}
                    aria-hidden={facing ? undefined : true}
                    className="block h-full w-full rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    {card}
                  </Link>
                ) : (
                  card
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }
);

CircularGallery.displayName = "CircularGallery";

export { CircularGallery };
