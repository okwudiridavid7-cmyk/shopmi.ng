"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import NumberFlow from "@number-flow/react";
import { Briefcase, CheckCheck, Package, Server } from "lucide-react";
import { motion } from "motion/react";
import type { PlanPublic } from "@vendors/shared-types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TimelineContent } from "@/components/ui/timeline-animation";
import { formatMoney } from "@/lib/api";
import { cn } from "@/lib/utils";

type BillingInterval = "monthly" | "biannual" | "annual";

const INTERVALS: {
  id: BillingInterval;
  label: string;
  months: number;
  discount: number;
  saveLabel?: string;
}[] = [
  { id: "monthly", label: "Monthly", months: 1, discount: 0 },
  { id: "biannual", label: "6 months", months: 6, discount: 0.15, saveLabel: "Save 15%" },
  { id: "annual", label: "Yearly", months: 12, discount: 0.3, saveLabel: "Save 30%" },
];

function planMeta(p: PlanPublic) {
  const f = (p.featureFlags ?? {}) as Record<string, unknown>;
  const benefits = Array.isArray(f.benefits)
    ? (f.benefits as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const description =
    typeof f.description === "string" ? f.description : null;
  const recommended = f.recommended === true;
  const cta = f.cta === "demo" ? "demo" : "select";
  const includes = Array.isArray(f.includes)
    ? (f.includes as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  return { benefits, description, recommended, cta, includes };
}

function pricedForInterval(
  monthly: number,
  interval: (typeof INTERVALS)[number]
) {
  const full = monthly * interval.months;
  const discounted = Math.round(full * (1 - interval.discount));
  return {
    full,
    discounted,
    save: full - discounted,
    discountPct: Math.round(interval.discount * 100),
  };
}

const FEATURE_ICONS = [Briefcase, Package, Server] as const;

function PricingSwitch({
  value,
  onChange,
}: {
  value: BillingInterval;
  onChange: (v: BillingInterval) => void;
}) {
  return (
    <div className="flex justify-center">
      <div className="relative z-10 mx-auto flex w-fit rounded-full border border-border bg-card p-1 shadow-sm">
        {INTERVALS.map((opt) => {
          const selected = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                "relative z-10 flex h-10 w-fit shrink-0 items-center rounded-full px-3 py-1 font-medium transition-colors sm:h-12 sm:px-5",
                selected
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {selected && (
                <motion.span
                  layoutId="pricing-switch"
                  className="absolute left-0 top-0 h-10 w-full rounded-full border-2 border-accent bg-gradient-to-t from-accent-deep via-accent to-accent shadow-sm shadow-accent/40 sm:h-12"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-2 text-sm sm:text-base">
                {opt.label}
                {opt.saveLabel ? (
                  <span className="hidden rounded-full bg-accent/15 px-2 py-0.5 text-xs font-medium text-accent sm:inline dark:text-accent-on-dark">
                    {opt.saveLabel}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type PricingSectionProps = {
  plans: PlanPublic[];
  appName?: string;
  loading?: boolean;
  error?: boolean;
};

export default function PricingSection({
  plans,
  appName = "Shopmi.ng",
  loading = false,
  error = false,
}: PricingSectionProps) {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const pricingRef = useRef<HTMLDivElement>(null);
  const activeInterval =
    INTERVALS.find((i) => i.id === interval) ?? INTERVALS[2]!;

  const sorted = useMemo(
    () => [...plans].sort((a, b) => a.price - b.price),
    [plans]
  );

  const revealVariants = {
    visible: (i: number) => ({
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      transition: {
        delay: i * 0.2,
        duration: 0.45,
      },
    }),
    hidden: {
      filter: "blur(10px)",
      y: -20,
      opacity: 0,
    },
  };

  return (
    <div
      className="relative mx-auto min-h-[70vh] bg-background px-4 pb-16 pt-12 sm:pt-16"
      ref={pricingRef}
    >
      <div
        className="pointer-events-none absolute left-[10%] right-[10%] top-0 z-0 h-[70%] w-[80%]"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,130,46,0.35) 0%, transparent 70%)",
          opacity: 0.55,
          mixBlendMode: "multiply",
        }}
        aria-hidden
      />

      <div className="relative z-10 mx-auto mb-6 max-w-3xl text-center">
        <TimelineContent
          as="h1"
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="mb-4 text-3xl font-semibold text-foreground sm:text-4xl md:text-5xl"
        >
          Plans that work best for your{" "}
          <TimelineContent
            as="span"
            animationNum={1}
            timelineRef={pricingRef}
            customVariants={revealVariants}
            className="inline-block rounded-xl border border-dashed border-accent bg-accent/10 px-2 py-1 capitalize text-foreground"
          >
            shop
          </TimelineContent>
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="mx-auto w-[90%] text-sm text-muted-foreground sm:w-[75%] sm:text-base"
        >
          Grow on {appName} with a free trial — no card required. Longer billing
          terms unlock bigger savings.
        </TimelineContent>
      </div>

      <TimelineContent
        as="div"
        animationNum={3}
        timelineRef={pricingRef}
        customVariants={revealVariants}
        className="relative z-10"
      >
        <PricingSwitch value={interval} onChange={setInterval} />
        <p className="mt-4 text-center">
          <Link
            href="/onboarding"
            className="text-sm font-semibold text-accent hover:underline dark:text-accent-on-dark"
          >
            Start free trial (No card required)
          </Link>
        </p>
      </TimelineContent>

      {loading ? (
        <div className="relative z-10 mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-[28rem] animate-pulse rounded-2xl bg-muted/60"
            />
          ))}
        </div>
      ) : error ? (
        <p className="relative z-10 mt-10 text-center text-sm text-danger">
          Could not load plans. Try again shortly.
        </p>
      ) : (
        <div className="relative z-10 mx-auto grid max-w-7xl gap-4 py-8 md:grid-cols-3">
          {sorted.map((plan, index) => {
            const meta = planMeta(plan);
            const priced = pricedForInterval(plan.price, activeInterval);
            const popular = meta.recommended;
            const benefitList =
              meta.benefits.length > 0
                ? meta.benefits
                : [`Up to ${plan.productLimit ?? "unlimited"} products`];
            const includeList =
              meta.includes.length > 0
                ? meta.includes
                : [
                    popular
                      ? "Everything in lower plans, plus:"
                      : "Plan includes:",
                    ...benefitList.slice(0, 3),
                  ];

            return (
              <TimelineContent
                key={plan.id}
                as="div"
                animationNum={4 + index}
                timelineRef={pricingRef}
                customVariants={revealVariants}
              >
                <Card
                  className={cn(
                    "relative h-full overflow-hidden border-border",
                    popular
                      ? "bg-accent/5 ring-2 ring-accent dark:bg-accent/10"
                      : "bg-card"
                  )}
                >
                  <CardHeader className="space-y-0 border-0 p-6 text-left">
                    <div className="flex justify-between gap-2">
                      <h3 className="mb-2 text-2xl font-semibold text-foreground sm:text-3xl">
                        {plan.name}
                      </h3>
                      {popular ? (
                        <span className="h-fit shrink-0 rounded-full bg-accent px-3 py-1 text-sm font-medium text-white">
                          Popular
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-4 min-h-[2.5rem] text-sm text-muted-foreground">
                      {meta.description ??
                        `Sell on ${appName} with this plan.`}
                    </p>
                    <div className="flex flex-wrap items-baseline gap-1">
                      {priced.discountPct > 0 ? (
                        <span className="mr-1 text-sm text-muted-foreground line-through">
                          {formatMoney(priced.full, plan.currency)}
                        </span>
                      ) : null}
                      <span className="text-3xl font-semibold text-foreground sm:text-4xl">
                        <NumberFlow
                          value={priced.discounted}
                          format={{
                            style: "currency",
                            currency: plan.currency || "NGN",
                            maximumFractionDigits: 0,
                          }}
                          className="text-3xl font-semibold sm:text-4xl"
                        />
                      </span>
                      <span className="text-muted-foreground">
                        /
                        {activeInterval.id === "monthly"
                          ? "month"
                          : activeInterval.id === "biannual"
                            ? "6 mo"
                            : "year"}
                      </span>
                    </div>
                    {priced.save > 0 ? (
                      <p className="mt-1 text-xs font-medium text-accent dark:text-accent-on-dark">
                        Save {formatMoney(priced.save, plan.currency)}
                      </p>
                    ) : null}
                  </CardHeader>

                  <CardContent className="pt-0">
                    {meta.cta === "demo" ? (
                      <Link
                        href="/contact?intent=demo"
                        className={cn(
                          "mb-6 block w-full rounded-xl p-4 text-center text-lg font-semibold text-white shadow-lg",
                          popular
                            ? "border border-accent bg-gradient-to-t from-accent-deep to-accent shadow-accent/30"
                            : "border border-neutral-700 bg-gradient-to-t from-neutral-900 to-neutral-600 shadow-neutral-900/30"
                        )}
                      >
                        Book a Demo
                      </Link>
                    ) : (
                      <Link
                        href={`/onboarding?plan=${plan.slug}`}
                        className={cn(
                          "mb-6 block w-full rounded-xl p-4 text-center text-lg font-semibold text-white shadow-lg",
                          popular
                            ? "border border-accent bg-gradient-to-t from-accent-deep to-accent shadow-accent/30"
                            : "border border-neutral-700 bg-gradient-to-t from-neutral-900 to-neutral-600 shadow-neutral-900/30"
                        )}
                      >
                        Get started
                      </Link>
                    )}

                    <ul className="space-y-2 py-5 font-medium">
                      {benefitList.slice(0, 3).map((text, featureIndex) => {
                        const Icon =
                          FEATURE_ICONS[featureIndex % FEATURE_ICONS.length]!;
                        return (
                          <li key={text} className="flex items-center">
                            <span className="mr-3 mt-0.5 grid place-content-center text-foreground">
                              <Icon size={20} />
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>

                    <div className="space-y-3 border-t border-border pt-4">
                      <h4 className="mb-3 text-base font-medium text-foreground">
                        {includeList[0]}
                      </h4>
                      <ul className="space-y-2 font-medium">
                        {includeList.slice(1).map((feature) => (
                          <li key={feature} className="flex items-center">
                            <span className="mr-3 mt-0.5 grid h-6 w-6 place-content-center rounded-full border border-accent bg-accent/10">
                              <CheckCheck className="h-4 w-4 text-accent" />
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {feature}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </TimelineContent>
            );
          })}
        </div>
      )}

      <p className="relative z-10 mt-4 text-center text-sm text-muted-foreground">
        Need an in-depth look at plans?{" "}
        <Link
          href="/contact?intent=compare"
          className="font-semibold text-foreground underline-offset-2 hover:underline"
        >
          Compare features
        </Link>
      </p>
    </div>
  );
}
