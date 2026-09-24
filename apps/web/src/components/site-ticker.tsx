"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";

export function SiteTicker({
  text,
  speed = 12,
  backgroundColor = "#111111",
  textColor = "#ffffff",
  storageKey,
}: {
  text: string;
  speed?: number;
  backgroundColor?: string;
  textColor?: string;
  storageKey: string;
}) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    setHidden(sessionStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (!text.trim() || hidden) return null;

  const duration = Math.max(8, Math.min(40, speed));

  return (
    <div
      className="relative z-50 flex items-center overflow-hidden py-2 pr-10"
      style={{ backgroundColor, color: textColor }}
    >
      <div
        className="flex whitespace-nowrap motion-reduce:[animation:none]"
        style={{ animation: `ticker-scroll ${duration}s linear infinite` }}
      >
        <span className="px-8 text-xs font-medium tracking-wide sm:text-sm">
          {text}
        </span>
        <span className="px-8 text-xs font-medium tracking-wide sm:text-sm" aria-hidden>
          {text}
        </span>
        <span className="px-8 text-xs font-medium tracking-wide sm:text-sm" aria-hidden>
          {text}
        </span>
      </div>
      <button
        type="button"
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/25"
        onClick={() => {
          sessionStorage.setItem(storageKey, "1");
          setHidden(true);
        }}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
