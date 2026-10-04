"use client";

import { useEffect, useRef, useState } from "react";

const NUMBER = /-?\d[\d,]*(?:\.\d+)?/;

type Parsed = {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouped: boolean;
};

/** Only values with a single number (e.g. "₦64,000.00", "25d left") animate. */
function parse(value: string): Parsed | null {
  const match = value.match(NUMBER);
  if (!match || match.index === undefined) return null;
  const raw = match[0];
  const prefix = value.slice(0, match.index);
  const suffix = value.slice(match.index + raw.length);
  if (/\d/.test(prefix) || /\d/.test(suffix)) return null;
  const target = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(target)) return null;
  return {
    prefix,
    suffix,
    target,
    decimals: raw.includes(".") ? raw.split(".")[1]!.length : 0,
    grouped: raw.includes(","),
  };
}

function render(p: Parsed, n: number): string {
  const num = n.toLocaleString("en-US", {
    minimumFractionDigits: p.decimals,
    maximumFractionDigits: p.decimals,
    useGrouping: p.grouped,
  });
  return `${p.prefix}${num}${p.suffix}`;
}

/** Counts up to the number inside a formatted value when it first appears or changes. */
export function AnimatedValue({
  value,
  duration = 900,
}: {
  value: string;
  duration?: number;
}) {
  const [display, setDisplay] = useState(() => {
    const p = parse(value);
    return p ? render(p, 0) : value;
  });
  const from = useRef(0);

  useEffect(() => {
    const p = parse(value);
    if (
      !p ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplay(value);
      if (p) from.current = p.target;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let frame = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const current = origin + (p.target - origin) * eased;
      setDisplay(t < 1 ? render(p, current) : value);
      if (t < 1) frame = requestAnimationFrame(step);
      else from.current = p.target;
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);

  return <span className="tabular-nums">{display}</span>;
}
