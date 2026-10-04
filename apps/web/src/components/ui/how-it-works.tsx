"use client";

import React from "react";
import { LazyMotion, domAnimation, m } from "motion/react";
import { cn } from "@/lib/utils";

interface CardProps {
  number: string;
  title: string;
  description: string;
  colorTheme?: "orange" | "blue" | "purple";
  className?: string;
  rotate?: string;
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

const Pin = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    className={className}
  >
    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
    <path d="M16 3a1 1 0 0 1 .117 1.993l-.117 .007v4.764l1.894 3.789a1 1 0 0 1 .1 .331l.006 .116v2a1 1 0 0 1 -.883 .993l-.117 .007h-4v4a1 1 0 0 1 -1.993 .117l-.007 -.117v-4h-4a1 1 0 0 1 -.993 -.883l-.007 -.117v-2a1 1 0 0 1 .06 -.34l.046 -.107l1.894 -3.791v-4.762a1 1 0 0 1 -.117 -1.993l.117 -.007h8z" />
  </svg>
);

const Card = ({
  number,
  title,
  description,
  colorTheme = "blue",
  className,
  rotate,
  colors: customColors,
}: CardProps) => {
  const defaultBgColors = {
    orange: "bg-orange-50 dark:bg-orange-500/10",
    blue: "bg-blue-50 dark:bg-blue-500/10",
    purple: "bg-purple-50 dark:bg-purple-500/10",
  };
  const defaultTextColors = {
    orange: "text-orange-500 dark:text-orange-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400",
  };
  const defaultBorderColors = {
    orange: "border-orange-100 dark:border-orange-500/20",
    blue: "border-blue-100 dark:border-blue-500/20",
    purple: "border-purple-100 dark:border-purple-500/20",
  };

  const bgColor = customColors?.bg || defaultBgColors[colorTheme];
  const textColor = customColors?.text || defaultTextColors[colorTheme];
  const borderColor = customColors?.border || defaultBorderColors[colorTheme];

  return (
    <li
      className={cn(
        "relative w-full transition-transform duration-300 hover:z-30 hover:scale-105 max-lg:mx-auto max-lg:max-w-md lg:w-[280px]",
        rotate,
        className
      )}
    >
      <div className="rounded-[25px] border border-neutral-100 bg-white p-2 shadow-[0px_10px_20px_0px_#D3D3D3] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-none">
        <Pin className={cn("z-20 mx-auto mb-6 h-8 w-8", textColor)} />
        <div
          className={cn(
            "relative flex h-full flex-col overflow-hidden rounded-[15px] border p-[15px]",
            bgColor,
            borderColor
          )}
        >
          <span
            className={cn("mb-5 text-4xl", textColor)}
            style={{ fontFamily: '"Comic Sans MS", "Chalkboard SE", sans-serif' }}
          >
            {number}
          </span>
          <h3 className="mb-[10px] text-2xl font-semibold leading-none text-neutral-800 dark:text-neutral-100">
            {title}
          </h3>
          <p className="text-sm/5 tracking-tight text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
      </div>
    </li>
  );
};

export interface Step {
  title: string;
  description: string;
  colorTheme?: "orange" | "blue" | "purple";
  colors?: {
    bg: string;
    text: string;
    border: string;
  };
}

export interface StepPosition {
  className?: string;
  rotate?: string;
}

export interface HowItWorksProps {
  features?: Step[];
  className?: string;
  stepPositions?: StepPosition[];
}

const DEFAULT_CARD_POSITIONS: StepPosition[] = [
  { className: "lg:absolute lg:top-0 lg:left-[15%]", rotate: "rotate-[2deg] lg:rotate-[8deg]" },
  { className: "lg:absolute lg:top-[120px] lg:right-[15%]", rotate: "-rotate-[2deg] lg:-rotate-[8deg]" },
  { className: "lg:absolute lg:top-[450px] lg:left-[15%]", rotate: "rotate-[2deg] lg:rotate-[8deg]" },
  { className: "lg:absolute lg:top-[570px] lg:right-[10%]", rotate: "-rotate-[2deg] lg:-rotate-[8deg]" },
  { className: "lg:absolute lg:top-[850px] lg:left-[15%]", rotate: "rotate-[2deg] lg:rotate-[8deg]" },
];

const DEFAULT_FEATURES: Step[] = [
  {
    title: "Create Account",
    description: "Sign up in minutes. Enter your details and verify your email to get started.",
    colorTheme: "orange",
  },
  {
    title: "Verify Identity",
    description: "Complete your profile verification to ensure secure transactions and compliance.",
    colorTheme: "blue",
  },
  {
    title: "Select Plan",
    description: "Choose from a variety of investment plans tailored to your financial goals.",
    colorTheme: "purple",
  },
  {
    title: "Analyze & Invest",
    description: "Review returns and make your first investment with confidence.",
    colorTheme: "orange",
  },
  {
    title: "Track Growth",
    description: "Monitor your portfolio in real-time and watch your wealth grow over time.",
    colorTheme: "blue",
  },
];

/** Connector segments between consecutive default card positions, in a 1000-wide viewBox. */
const PATH_SEGMENTS = [
  "M 290 150 C 500 150, 550 270, 710 270",
  " C 850 270, 500 350, 290 450",
  " C 290 600, 550 720, 750 720",
  " C 950 720, 500 800, 290 850",
];

export default function HowItWorks({ features, className, stepPositions }: HowItWorksProps) {
  const data = features && features.length > 0 ? features : DEFAULT_FEATURES;
  const positions = stepPositions || DEFAULT_CARD_POSITIONS;

  let height = 1130;
  if (data.length === 1) height = 400;
  else if (data.length === 2) height = 450;
  else if (data.length === 3) height = 800;
  else if (data.length === 4) height = 900;

  const pathD = PATH_SEGMENTS.slice(0, Math.max(0, data.length - 1)).join("");

  return (
    <LazyMotion features={domAnimation}>
      <div className={cn("relative bg-background px-8 max-lg:pb-[100px] max-lg:pt-10 lg:py-20", className)}>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-0"
          style={{
            backgroundImage: "linear-gradient(#000 1px, transparent 1px)",
            backgroundSize: "100% 32px",
            marginTop: "4px",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-0 dark:opacity-[0.1]"
          style={{
            backgroundImage: "linear-gradient(#fff 1px, transparent 1px)",
            backgroundSize: "100% 32px",
            marginTop: "4px",
          }}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-background" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-background" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <ol
            className="relative mx-auto flex h-auto w-full max-w-[1000px] flex-col space-y-8 lg:block lg:h-[var(--md-height)] lg:space-y-0"
            style={{ "--md-height": `${height}px` } as React.CSSProperties}
          >
            {data.length > 1 && (
              <svg
                aria-hidden="true"
                className="pointer-events-none absolute left-0 top-0 z-0 hidden h-full w-full lg:block"
                viewBox={`0 0 1000 ${height}`}
                preserveAspectRatio="none"
              >
                <m.path
                  d={pathD}
                  stroke="currentColor"
                  className="text-neutral-300 dark:text-neutral-700"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  fill="none"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                  initial={{ strokeDashoffset: 0 }}
                  animate={{ strokeDashoffset: -140 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                />
              </svg>
            )}

            {data.map((step, index) => {
              const position = positions[index % positions.length];
              return (
                <Card
                  key={step.title}
                  number={`0${index + 1}`}
                  title={step.title}
                  description={step.description}
                  colorTheme={step.colorTheme || "blue"}
                  colors={step.colors}
                  rotate={position?.rotate}
                  className={position?.className}
                />
              );
            })}
          </ol>
        </div>
      </div>
    </LazyMotion>
  );
}
