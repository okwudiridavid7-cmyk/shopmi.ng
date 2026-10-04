"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

/** Smaller rendition for thumbnails when the image CDN supports resizing by query. */
function thumbSrc(src: string): string {
  if (!src.includes("images.unsplash.com")) return src;
  try {
    const url = new URL(src);
    url.searchParams.set("w", "200");
    if (url.searchParams.has("h")) url.searchParams.set("h", "200");
    return url.toString();
  } catch {
    return src;
  }
}

export function ProductGallery({
  images,
  title,
  overlay,
}: {
  images: string[];
  title: string;
  /** Optional overlay (e.g. wishlist heart) on the main image. */
  overlay?: React.ReactNode;
}) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const [touchX, setTouchX] = useState<number | null>(null);
  const list = images.length ? images : [];

  const go = useCallback(
    (dir: -1 | 1) => {
      if (!list.length) return;
      setActive((i) => (i + dir + list.length) % list.length);
    },
    [list.length]
  );

  const imagesKey = images.join("|");
  useEffect(() => {
    setActive(0);
    if (images.length < 2) return;
    const preload = images.slice(1).map((src) => {
      const img = new Image();
      img.src = src;
      return img;
    });
    return () => {
      preload.forEach((img) => (img.src = ""));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagesKey]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, go]);

  const swipe = {
    onTouchStart: (e: React.TouchEvent) => setTouchX(e.changedTouches[0]?.clientX ?? null),
    onTouchEnd: (e: React.TouchEvent) => {
      const end = e.changedTouches[0]?.clientX;
      if (touchX == null || end == null) return;
      const delta = end - touchX;
      if (delta > 40) go(-1);
      if (delta < -40) go(1);
      setTouchX(null);
    },
  };

  if (!list.length) {
    return (
      <div className="relative flex aspect-square items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
        No image
        {overlay ? (
          <div className="absolute right-token-3 top-token-3 z-10">{overlay}</div>
        ) : null}
      </div>
    );
  }

  const index = Math.min(active, list.length - 1);
  const current = list[index]!;
  const multiple = list.length > 1;

  return (
    <div className="space-y-token-3">
      <div className="group relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`Enlarge image ${index + 1} of ${list.length}`}
          className="block aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted"
          {...swipe}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={current}
            src={current}
            alt={title}
            className="h-full w-full object-cover motion-safe:animate-[fade-in_200ms_ease-out]"
          />
        </button>
        {overlay ? (
          <div className="absolute right-token-3 top-token-3 z-10">{overlay}</div>
        ) : null}
        {multiple ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={() => go(-1)}
              className="absolute left-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/90 p-2 text-foreground shadow-sm transition hover:bg-card focus-visible:opacity-100 sm:block sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={() => go(1)}
              className="absolute right-3 top-1/2 hidden -translate-y-1/2 rounded-full bg-card/90 p-2 text-foreground shadow-sm transition hover:bg-card focus-visible:opacity-100 sm:block sm:opacity-0 sm:group-hover:opacity-100"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium tabular-nums text-white">
              {index + 1}/{list.length}
            </span>
          </>
        ) : null}
      </div>
      {multiple && (
        <div className="grid grid-cols-5 gap-token-2">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1}`}
              aria-current={i === index ? "true" : undefined}
              className={`aspect-square overflow-hidden rounded-md border-2 transition ${
                i === index
                  ? "border-accent"
                  : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img loading="lazy" decoding="async" src={thumbSrc(src)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90"
          onClick={() => setOpen(false)}
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
          {multiple && (
            <>
              <button
                type="button"
                aria-label="Previous"
                className="absolute left-3 rounded-full bg-white/10 p-2 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                aria-label="Next"
                className="absolute right-3 rounded-full bg-white/10 p-2 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm tabular-nums text-white/80">
                {index + 1} / {list.length}
              </span>
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={title}
            className="max-h-[88vh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
            {...swipe}
          />
        </div>
      )}
    </div>
  );
}
