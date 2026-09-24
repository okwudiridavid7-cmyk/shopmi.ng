"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

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

  const current = list[Math.min(active, list.length - 1)]!;

  return (
    <div className="space-y-token-3">
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="aspect-square w-full overflow-hidden rounded-lg border border-border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={current} alt={title} className="h-full w-full object-cover" />
        </button>
        {overlay ? (
          <div className="absolute right-token-3 top-token-3 z-10">{overlay}</div>
        ) : null}
      </div>
      {list.length > 1 && (
        <div className="flex gap-token-2 overflow-x-auto pb-1">
          {list.map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => setActive(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                i === active ? "border-accent ring-1 ring-accent" : "border-border"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
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
          {list.length > 1 && (
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
            </>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={current}
            alt={title}
            className="max-h-[88vh] max-w-[92vw] object-contain"
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => setTouchX(e.changedTouches[0]?.clientX ?? null)}
            onTouchEnd={(e) => {
              const end = e.changedTouches[0]?.clientX;
              if (touchX == null || end == null) return;
              const delta = end - touchX;
              if (delta > 40) go(-1);
              if (delta < -40) go(1);
              setTouchX(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
