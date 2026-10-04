"use client";

import Link from "next/link";
import { useMemo, useRef, useState, type ReactNode } from "react";
import NumberFlow from "@number-flow/react";
import { Check, CheckCheck } from "lucide-react";
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
  return { benefits, description, recommended, cta };
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

function PlanPrice({
  plan,
  priced,
  interval,
}: {
  plan: PlanPublic;
  priced: ReturnType<typeof pricedForInterval>;
  interval: (typeof INTERVALS)[number];
}) {
  const priceClass = "text-3xl font-semibold text-foreground xl:text-[1.75rem]";
  if (plan.price === 0) {
    return (
      <div>
        <p className="h-5" aria-hidden />
        <div className="flex h-10 items-center gap-1">
          <span className={priceClass}>Free</span>
          <span className="text-sm text-muted-foreground">forever</span>
        </div>
        <p className="mt-1 h-4 text-xs font-medium text-muted-foreground">No card needed</p>
      </div>
    );
  }
  return (
    <div>
      <p className="h-5 text-sm text-muted-foreground line-through">
        {priced.discountPct > 0 ? formatMoney(priced.full, plan.currency) : null}
      </p>
      <div className="flex h-10 items-center gap-1 whitespace-nowrap">
        <NumberFlow
          value={priced.discounted}
          format={{
            style: "currency",
            currency: plan.currency || "NGN",
            maximumFractionDigits: 0,
          }}
          className={priceClass}
        />
        <span className="text-sm text-muted-foreground">
          /{interval.id === "monthly" ? "month" : interval.id === "biannual" ? "6 mo" : "year"}
        </span>
      </div>
      <p className="mt-1 h-4 text-xs font-medium text-accent-strong dark:text-accent-on-dark">
        {priced.save > 0 ? `Save ${formatMoney(priced.save, plan.currency)}` : null}
      </p>
    </div>
  );
}

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
                  className="absolute left-0 top-0 h-10 w-full rounded-full bg-accent-strong sm:h-12"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-2 text-sm sm:text-base">
                {opt.label}
                {opt.saveLabel ? (
                  <span
                    className={cn(
                      "hidden rounded-full px-2 py-0.5 text-xs font-semibold sm:inline",
                      selected
                        ? "bg-white text-accent-strong"
                        : "bg-[color-mix(in_oklab,var(--color-accent)_15%,transparent)] text-accent-strong dark:text-accent-on-dark"
                    )}
                  >
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
  id?: string;
  className?: string;
  headingAs?: "h1" | "h2";
  eyebrow?: ReactNode;
  compareHref?: string;
  assurances?: string[];
};

export default function PricingSection({
  plans,
  appName = "Shopmi.ng",
  loading = false,
  error = false,
  id,
  className,
  headingAs = "h1",
  eyebrow,
  compareHref = "#compare",
  assurances,
}: PricingSectionProps) {
  const [interval, setInterval] = useState<BillingInterval>("annual");
  const pricingRef = useRef<HTMLDivElement>(null);
  const activeInterval =
    INTERVALS.find((i) => i.id === interval) ?? INTERVALS[2]!;

  const sorted = useMemo(
    () => [...plans].sort((a, b) => a.price - b.price),
    [plans]
  );
  const freePlan = sorted.find((p) => p.price === 0);
  const topPlan = [...sorted].reverse().find((p) => p.price > 0);
  const trialDays = sorted.find((p) => p.trialDays > 0)?.trialDays ?? 0;

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
      id={id}
      className={cn(
        "relative mx-auto min-h-[70vh] bg-background px-4 pb-16 pt-12 sm:pt-16",
        className
      )}
      ref={pricingRef}
    >
      <div className="relative z-10 mx-auto mb-6 max-w-3xl text-center">
        {eyebrow ? <div className="mb-5 flex justify-center">{eyebrow}</div> : null}
        <TimelineContent
          as={headingAs}
          animationNum={0}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="mb-4 text-3xl font-semibold text-foreground [text-wrap:balance] sm:text-4xl md:text-5xl"
        >
          Plans that work best for your shop
        </TimelineContent>

        <TimelineContent
          as="p"
          animationNum={2}
          timelineRef={pricingRef}
          customVariants={revealVariants}
          className="mx-auto w-[90%] text-sm text-muted-foreground sm:w-[75%] sm:text-base"
        >
          {trialDays > 0
            ? `Every new shop on ${appName} gets ${trialDays} days of ${topPlan?.name ?? "every feature"} free. `
            : ""}
          {freePlan
            ? `After that, pick a plan or keep selling on ${freePlan.name}. `
            : ""}
          Longer billing terms save more.
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
            className="text-sm font-semibold text-accent-strong hover:underline dark:text-accent-on-dark"
          >
            Start free trial (No card required)
          </Link>
        </p>
      </TimelineContent>

      {loading ? (
        <div className="relative z-10 mx-auto mt-8 grid max-w-7xl gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[28rem] animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : error ? (
        <p className="relative z-10 mt-10 text-center text-sm text-danger">
          Could not load plans. Try again shortly.
        </p>
      ) : (
        <div
          className={cn(
            "relative z-10 mx-auto grid max-w-7xl gap-4 py-8 md:grid-cols-2",
            sorted.length >= 4 ? "xl:grid-cols-4" : "lg:grid-cols-3"
          )}
        >
          {sorted.map((plan, index) => {
            const meta = planMeta(plan);
            const priced = pricedForInterval(plan.price, activeInterval);
            const popular = meta.recommended;
            const benefitList =
              meta.benefits.length > 0
                ? meta.benefits
                : [`Up to ${plan.productLimit ?? "unlimited"} products`];
            const inheritsFrom = benefitList[0]?.startsWith("Everything in")
              ? benefitList[0]
              : null;
            const featureList = inheritsFrom ? benefitList.slice(1) : benefitList;

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
                      ? "bg-[color-mix(in_oklab,var(--color-accent)_6%,var(--color-card))] ring-2 ring-accent"
                      : "bg-card"
                  )}
                >
                  <CardHeader className="space-y-0 border-0 p-6 text-left">
                    <div className="flex justify-between gap-2">
                      <h3 className="mb-2 text-2xl font-semibold text-foreground sm:text-3xl">
                        {plan.name}
                      </h3>
                      {popular ? (
                        <span className="h-fit shrink-0 rounded-full bg-accent-strong px-3 py-1 text-sm font-medium text-white">
                          Popular
                        </span>
                      ) : null}
                    </div>
                    <p className="mb-4 min-h-[2.5rem] text-sm text-muted-foreground">
                      {meta.description}
                    </p>
                    <PlanPrice
                      plan={plan}
                      priced={priced}
                      interval={activeInterval}
                    />
                  </CardHeader>

                  <CardContent className="pt-0">
                    {meta.cta === "demo" ? (
                      <Link
                        href="/contact?intent=demo"
                        className={cn(
                          "mb-6 block w-full rounded-xl p-4 text-center text-lg font-semibold transition hover:brightness-90",
                          popular
                            ? "bg-accent-strong text-white"
                            : "bg-foreground text-background"
                        )}
                      >
                        Book a Demo
                      </Link>
                    ) : (
                      <Link
                        href={`/onboarding?plan=${plan.slug}`}
                        className={cn(
                          "mb-6 block w-full rounded-xl p-4 text-center text-lg font-semibold transition hover:brightness-90",
                          popular
                            ? "bg-accent-strong text-white"
                            : "bg-foreground text-background"
                        )}
                      >
                        Get started
                      </Link>
                    )}

                    <div className="space-y-3 border-t border-border pt-4">
                      <h4 className="mb-3 text-base font-medium text-foreground">
                        {inheritsFrom ? `${inheritsFrom}, plus:` : "Includes:"}
                      </h4>
                      <ul className="space-y-2 font-medium">
                        {featureList.map((feature) => (
                          <li key={feature} className="flex items-center">
                            <span className="mr-3 mt-0.5 grid h-6 w-6 shrink-0 place-content-center rounded-full border border-accent bg-[color-mix(in_oklab,var(--color-accent)_12%,transparent)]">
                              <CheckCheck className="h-4 w-4 text-accent-strong dark:text-accent-on-dark" />
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

      {assurances?.length ? (
        <ul className="relative z-10 mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {assurances.map((line) => (
            <li key={line} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-success" aria-hidden />
              {line}
            </li>
          ))}
        </ul>
      ) : null}

      <p className="relative z-10 mt-4 text-center text-sm text-muted-foreground">
        Need an in-depth look at plans?{" "}
        <a
          href={compareHref}
          className="font-semibold text-foreground underline-offset-2 hover:underline"
        >
          Compare plans
        </a>
      </p>
    </div>
  );
}
