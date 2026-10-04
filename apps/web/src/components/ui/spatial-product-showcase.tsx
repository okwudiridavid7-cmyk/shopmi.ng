"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils";

export type SpatialItem = {
  id: string;
  /** Short name shown in the switcher. */
  label: string;
  title: string;
  tagline?: string;
  description: string;
  image: string;
  imageAlt: string;
  /** Hex colour used for the glow and status dot. */
  accent: string;
  /** Extra detail shown in the glass panel under the description. */
  details?: ReactNode;
};

const ANIMATIONS = {
  container: {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
    exit: { opacity: 0, transition: { duration: 0.15 } },
  } satisfies Variants,
  item: {
    hidden: { opacity: 0, y: 14, filter: "blur(8px)" },
    visible: {
      opacity: 1,
      y: 0,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 120, damping: 20 },
    },
    exit: { opacity: 0, y: -8, filter: "blur(4px)" },
  } satisfies Variants,
  image: (dir: number): Variants => ({
    initial: { opacity: 0, scale: 1.15, filter: "blur(14px)", rotate: dir * -6, x: dir * -60 },
    animate: {
      opacity: 1,
      scale: 1,
      filter: "blur(0px)",
      rotate: 0,
      x: 0,
      transition: { type: "spring", stiffness: 240, damping: 24 },
    },
    exit: { opacity: 0, scale: 0.85, filter: "blur(16px)", transition: { duration: 0.2 } },
  }),
};

function Switcher({
  items,
  activeId,
  onSelect,
  label,
}: {
  items: SpatialItem[];
  activeId: string;
  onSelect: (id: string) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="grid grid-cols-3 gap-1 rounded-[1.75rem] border border-white/10 bg-zinc-900/80 p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] ring-1 ring-white/5 backdrop-blur-2xl sm:flex sm:rounded-full"
    >
      {items.map((opt) => {
        const active = opt.id === activeId;
        return (
          <motion.button
            key={opt.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(opt.id)}
            whileTap={{ scale: 0.96 }}
            className="relative flex h-11 min-w-[5.5rem] items-center justify-center rounded-full px-4 text-sm font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {active ? (
              <motion.span
                layoutId="spatial-island"
                className="absolute inset-0 rounded-full bg-gradient-to-b from-white/15 to-white/5 shadow-inner"
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
              />
            ) : null}
            <span
              className={cn(
                "relative z-10 transition-colors duration-300",
                active ? "text-white" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              {opt.label}
            </span>
            {active ? (
              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute -bottom-0.5 h-0.5 w-6 rounded-full"
                style={{ background: `linear-gradient(90deg, transparent, ${opt.accent}, transparent)` }}
              />
            ) : null}
          </motion.button>
        );
      })}
    </div>
  );
}

/** Spotlight for a set of screenshots: floating preview, animated details and an island switcher. */
export function SpatialShowcase({
  items,
  status,
  footer,
  switcherLabel = "Choose an option",
  className,
}: {
  items: SpatialItem[];
  status?: string;
  footer?: ReactNode;
  switcherLabel?: string;
  className?: string;
}) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const [dir, setDir] = useState(1);
  const reduce = useReducedMotion();
  const index = Math.max(
    0,
    items.findIndex((i) => i.id === activeId)
  );
  const current = items[index];
  if (!current) return null;

  const select = (id: string) => {
    const next = items.findIndex((i) => i.id === id);
    setDir(next >= index ? 1 : -1);
    setActiveId(id);
  };

  return (
    <div className={cn("relative text-zinc-100", className)}>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-x-[50vw] -inset-y-24"
        animate={{
          background: `radial-gradient(circle at ${dir > 0 ? "30%" : "20%"} 45%, ${current.accent}26, transparent 45%)`,
        }}
        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
      />

      <div className="relative grid items-center gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-16">
        <div className="relative flex items-center justify-center py-10 sm:py-14">
          <motion.div
            aria-hidden
            animate={reduce ? undefined : { rotate: 360 }}
            transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
            className="absolute aspect-square w-[88%] max-w-[32rem] rounded-full border border-dashed border-white/15"
          />
          <motion.div
            aria-hidden
            animate={reduce ? undefined : { scale: [1, 1.06, 1] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute aspect-square w-[66%] max-w-[24rem] rounded-full opacity-40 blur-3xl"
            style={{ background: `linear-gradient(135deg, ${current.accent}, #0a0a0a)` }}
          />

          <motion.div
            animate={reduce ? undefined : { y: [-8, 8, -8] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="relative z-10 w-full max-w-[36rem]"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/40 shadow-[0_40px_80px_-30px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
                <span className="h-2 w-2 rounded-full bg-white/20" />
              </div>
              <div className="relative aspect-[1200/833]">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.div
                    key={current.id}
                    variants={ANIMATIONS.image(dir)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    className="absolute inset-0"
                  >
                    <Image
                      src={current.image}
                      alt={current.imageAlt}
                      fill
                      sizes="(min-width: 1024px) 576px, 92vw"
                      className="object-cover object-top"
                      draggable={false}
                    />
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            {status ? (
              <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
                <div className="flex items-center gap-2 rounded-full border border-white/5 bg-zinc-950/80 px-4 py-2 text-[11px] uppercase tracking-widest text-zinc-400 backdrop-blur">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full" style={{ background: current.accent }} />
                  {status}
                </div>
              </div>
            ) : null}
          </motion.div>
        </div>

        <div className="min-h-[27rem]">
          <AnimatePresence mode="wait">
            <motion.div
              key={current.id}
              variants={ANIMATIONS.container}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <motion.p
                variants={ANIMATIONS.item}
                className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-zinc-500"
              >
                {index + 1} of {items.length}
              </motion.p>
              <motion.h3
                variants={ANIMATIONS.item}
                className="bg-gradient-to-b from-white to-zinc-500 bg-clip-text font-display text-4xl font-bold tracking-tight text-transparent sm:text-5xl"
              >
                {current.title}
              </motion.h3>
              {current.tagline ? (
                <motion.p variants={ANIMATIONS.item} className="mt-2 text-lg font-medium text-zinc-300">
                  {current.tagline}
                </motion.p>
              ) : null}
              <motion.p variants={ANIMATIONS.item} className="mt-3 max-w-md leading-relaxed text-zinc-400">
                {current.description}
              </motion.p>
              {current.details ? (
                <motion.div
                  variants={ANIMATIONS.item}
                  className="mt-7 rounded-2xl border border-white/5 bg-zinc-900/40 p-5 backdrop-blur-sm sm:p-6"
                >
                  {current.details}
                </motion.div>
              ) : null}
            </motion.div>
          </AnimatePresence>
          {footer ? <div className="mt-7">{footer}</div> : null}
        </div>
      </div>

      <div className="relative mt-12 flex justify-center sm:mt-16">
        <Switcher items={items} activeId={current.id} onSelect={select} label={switcherLabel} />
      </div>
    </div>
  );
}

export default SpatialShowcase;
