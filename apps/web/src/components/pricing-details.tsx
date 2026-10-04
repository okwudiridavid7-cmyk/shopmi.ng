"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { PlanPublic } from "@vendors/shared-types";
import {
  ComparisonTable,
  type ComparisonColumn,
  type ComparisonRow,
} from "@/components/ui/comparison-02";
import { cn } from "@/lib/utils";

type Flags = Record<string, unknown>;

type Feature = {
  title: string;
  body: string;
  on: (f: Flags) => boolean;
};

const FEATURES: Feature[] = [
  {
    title: "Branded storefront",
    body: "Your own shop page with your logo, colours and banners.",
    on: (f) => f.storefront === true,
  },
  {
    title: "Product catalog",
    body: "Photos, prices, stock and categories in one place.",
    on: (f) => f.products === true,
  },
  {
    title: "Paystack checkout",
    body: "Buyers pay by card, transfer or USSD.",
    on: (f) => f.checkout === true,
  },
  {
    title: "Orders & invoices",
    body: "Track every order. Buyers get a PDF invoice.",
    on: (f) => f.invoices === true,
  },
  {
    title: "Promo pop-ups",
    body: "Show offers to shoppers when they visit your shop.",
    on: (f) => f.campaigns === true,
  },
  {
    title: "WhatsApp",
    body: "A chat button on your shop and new-order alerts.",
    on: (f) => f.whatsapp === true,
  },
  {
    title: "AI listing descriptions",
    body: "Turn a product name into a clear description.",
    on: (f) => f.ai === true,
  },
  {
    title: "Custom domain",
    body: "Use your own web address, like yourshop.com. Connect one you own or buy one in your dashboard.",
    on: (f) => f.customDomain === true,
  },
  {
    title: "Free .com.ng domain",
    body: "One .com.ng domain registered for you, renewed free while you stay on the plan.",
    on: (f) => f.freeDomain === true,
  },
];

function flagsOf(plan: PlanPublic): Flags {
  return (plan.featureFlags ?? {}) as Flags;
}

function sortPlans(plans: PlanPublic[]) {
  return [...plans].sort((a, b) => a.price - b.price);
}

function monthlyPrice(plan: PlanPublic) {
  if (plan.price === 0) return "Free";
  const amount = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: plan.currency || "NGN",
    maximumFractionDigits: 0,
  }).format(plan.price);
  return `${amount}/mo`;
}

function planAction(plan: PlanPublic, featured: boolean) {
  const demo = flagsOf(plan).cta === "demo";
  return (
    <Link
      href={demo ? "/contact?intent=demo" : `/onboarding?plan=${plan.slug}`}
      className={cn(
        "inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-semibold transition",
        featured
          ? "bg-accent-strong text-white hover:brightness-90"
          : "border border-border bg-card text-foreground hover:bg-muted"
      )}
    >
      {demo ? "Book a demo" : "Get started"}
    </Link>
  );
}

/** Side-by-side plan table. Rows come from plan flags, so only shipped features appear. */
export function PlanComparison({ plans }: { plans: PlanPublic[] }) {
  const sorted = sortPlans(plans);
  if (sorted.length === 0) return null;

  const columns: ComparisonColumn[] = sorted.map((plan) => {
    const f = flagsOf(plan);
    const featured = f.recommended === true;
    return {
      key: plan.id,
      name: plan.name,
      summary: typeof f.description === "string" ? f.description : undefined,
      featured,
      badge: featured ? "Popular" : undefined,
      action: planAction(plan, featured),
    };
  });

  const seats = (plan: PlanPublic) => Number(flagsOf(plan).staffAccounts ?? 0);
  const rows: ComparisonRow[] = [
    { label: "Price", cells: sorted.map(monthlyPrice), emphasis: true },
    {
      label: "Live products",
      hint: "Drafts don't count.",
      cells: sorted.map((p) => (p.productLimit == null ? "Unlimited" : String(p.productLimit))),
    },
    ...FEATURES.filter((feat) => sorted.some((p) => feat.on(flagsOf(p)))).map((feat) => ({
      label: feat.title,
      hint: feat.body,
      cells: sorted.map((p) => feat.on(flagsOf(p))),
    })),
    ...(sorted.some((p) => seats(p) > 0)
      ? [
          {
            label: "Team members",
            hint: "Staff with their own logins, besides you.",
            cells: sorted.map((p) => (seats(p) > 0 ? `Up to ${seats(p)}` : false)),
          },
        ]
      : []),
  ];

  return (
    <ComparisonTable
      id="compare"
      title="Compare plans"
      description="Everything in each plan, side by side."
      caption="Comparing Shopmi.ng plans"
      columns={columns}
      rows={rows}
      className="border-t border-border"
    />
  );
}

export function PricingFaq({ plans }: { plans: PlanPublic[] }) {
  const sorted = sortPlans(plans);
  const trialDays = sorted.find((p) => p.trialDays > 0)?.trialDays ?? 0;
  const freePlan = sorted.find((p) => p.price === 0);
  const topPlan = [...sorted].reverse().find((p) => p.price > 0);
  const domainPlans = sorted.filter((p) => flagsOf(p).customDomain === true);
  const freeDomainPlans = sorted.filter((p) => flagsOf(p).freeDomain === true);
  const domainAnswer =
    domainPlans.length === 0
      ? null
      : domainPlans.length === sorted.length
        ? "Every plan includes a custom domain."
        : domainPlans.length === 1
          ? `Custom domains come with the ${domainPlans[0]!.name} plan.`
          : `Custom domains come with ${domainPlans[0]!.name} and every plan above it.`;

  const items: { q: string; a: string }[] = [
    ...(trialDays > 0
      ? [
          {
            q: "Is there a free trial?",
            a: `Yes. Every new shop gets ${trialDays} days of ${topPlan?.name ?? "our top plan"} free, and you don’t need a card to begin.${
              freePlan ? ` If you don’t pick a plan when it ends, your shop moves to ${freePlan.name}.` : ""
            }`,
          },
        ]
      : []),
    ...(freePlan
      ? [
          {
            q: `What happens if I have more than ${freePlan.productLimit ?? "the allowed"} products on ${freePlan.name}?`,
            a: `Nothing is deleted. Your ${freePlan.productLimit} most recently updated products stay live and the rest are paused, which hides them from shoppers. Upgrade and they come back automatically, or unpublish some to choose which ones stay live.`,
          },
        ]
      : []),
    {
      q: "Can I change my plan later?",
      a: "Yes. You can change plans from the Plan page in your seller dashboard.",
    },
    {
      q: "What happens when I reach my product limit?",
      a: "Your live products stay up. To publish more, unpublish one or move to a plan with a higher limit. Drafts don’t count towards the limit.",
    },
    {
      q: "How do buyers pay?",
      a: "Through Paystack checkout, by card, bank transfer or USSD. Payouts go to the bank account you add in your dashboard.",
    },
    ...(domainAnswer
      ? [{ q: "Which plans include a custom domain?", a: domainAnswer }]
      : []),
    ...(freeDomainPlans.length > 0
      ? [
          {
            q: "Do you give a free domain?",
            a: `Yes. ${freeDomainPlans.map((p) => p.name).join(" and ")} include${
              freeDomainPlans.length === 1 ? "s" : ""
            } one free .com.ng domain. We register it, connect it to your store and renew it for free while you stay on the plan. You can also buy other domains, like .com or .ng, from your dashboard.`,
          },
        ]
      : []),
    {
      q: "Do longer billing periods cost less?",
      a: "Yes. Paying for 6 months saves 15%, and paying yearly saves 30%.",
    },
  ];

  return (
    <section className="px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center font-display text-3xl font-semibold text-foreground sm:text-4xl">
          Frequently asked questions
        </h2>
        <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
          {items.map((item) => (
            <details key={item.q} className="group px-5 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-[15px] font-semibold text-foreground">
                {item.q}
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>
              <p className="pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingCta() {
  return (
    <section className="px-4 pb-16 pt-4 sm:pb-20">
      <div className="mx-auto max-w-5xl rounded-3xl bg-[#0a0a0b] px-6 py-14 text-center text-white ring-1 ring-white/10 sm:py-16">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Ready to create your shop?</h2>
        <p className="mx-auto mt-3 max-w-md text-base text-zinc-400">
          Start your free trial today. No card required.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/onboarding"
            className="inline-flex h-11 items-center rounded-lg bg-accent-strong px-6 text-sm font-semibold text-white transition hover:brightness-90"
          >
            Create your shop
          </Link>
          <Link
            href="/contact"
            className="inline-flex h-11 items-center rounded-lg border border-white/25 px-6 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Talk to us
          </Link>
        </div>
      </div>
    </section>
  );
}
