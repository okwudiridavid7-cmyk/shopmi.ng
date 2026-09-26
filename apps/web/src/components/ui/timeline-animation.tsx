"use client";

import * as React from "react";
import { motion, useInView, type Variants } from "motion/react";
import { cn } from "@/lib/utils";

type TimelineContentProps = {
  as?: "div" | "h1" | "h2" | "h3" | "p" | "span" | "section";
  animationNum?: number;
  timelineRef?: React.RefObject<HTMLElement | null>;
  customVariants?: Variants;
  className?: string;
  children?: React.ReactNode;
};

const defaultVariants: Variants = {
  visible: (i: number) => ({
    y: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: {
      delay: i * 0.15,
      duration: 0.45,
    },
  }),
  hidden: {
    filter: "blur(10px)",
    y: -16,
    opacity: 0,
  },
};

const motionTags = {
  div: motion.div,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
  p: motion.p,
  span: motion.span,
  section: motion.section,
} as const;

/**
 * Scroll-reveal wrapper used by pricing and marketing sections.
 */
export function TimelineContent({
  as = "div",
  animationNum = 0,
  customVariants,
  className,
  children,
}: TimelineContentProps) {
  const ref = React.useRef<HTMLElement | null>(null);
  const inView = useInView(ref, { once: true, amount: 0.15 });
  const MotionTag = motionTags[as] ?? motion.div;

  return (
    <MotionTag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      custom={animationNum}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={customVariants ?? defaultVariants}
      className={cn(className)}
    >
      {children}
    </MotionTag>
  );
}
