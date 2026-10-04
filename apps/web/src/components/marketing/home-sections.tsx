import Image from "next/image";
import {
  CalendarCheck,
  CreditCard,
  Landmark,
  LayoutGrid,
  Link2,
  Lock,
  MessageCircle,
  Palette,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Users,
} from "lucide-react";
import type { PlanPublic } from "@vendors/shared-types";
import { Section, SectionIntro } from "@/components/marketing/blocks";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import CardTabs from "@/components/ui/card-tabs";
import ComparisonBlock from "@/components/ui/comparison-2";
import { Badge7 } from "@/components/ui/cta69-utils/badge7";
import PricingSection from "@/components/ui/pricing-section";
import Stats06, { type StatItem } from "@/components/ui/stats-06";
import { nairaWhole } from "@/lib/marketing-data";
import { STORE_THEMES } from "@/lib/store-themes";
import { cn } from "@/lib/utils";

export function AboutSection({ sellerBadge }: { sellerBadge?: string }) {
  return (
    <ComparisonBlock
      id="about"
      header={
        <SectionIntro
          eyebrow="About Shopmi.ng"
          title="One marketplace. Two ways in."
          body="Shopmi.ng is a Nigerian marketplace and online store builder. Buyers discover products from independent shops in one place. Sellers get their own branded store with payments, orders and promotion built in."
          className="mb-12"
        />
      }
      columns={[
        {
          title: "For buyers",
          badge: "Free to use",
          description: "Shop local and pay safely, without chasing sellers in the DMs.",
          points: [
            "Independent shops from across Nigeria in one marketplace",
            "Search for a product or browse by category",
            "Verified badges on shops we have reviewed",
            "Pay by card, bank transfer or USSD through Paystack",
            "Track your orders and download PDF invoices",
            "Chat with sellers on WhatsApp",
            "Contact details, FAQs and terms on every shop",
          ],
          cta: { label: "Explore marketplace", href: "/explore" },
          link: { label: "How buying works", href: "/buyers" },
        },
        {
          title: "For sellers",
          badge: sellerBadge,
          featured: true,
          description: "Your own online store, with payments, orders and promotion built in.",
          points: [
            "A branded shop link ready in minutes",
            `${STORE_THEMES.length} storefront themes and a built-in logo maker`,
            "Paystack checkout, with verified shops paid straight to their bank",
            "Orders, PDF invoices and WhatsApp alerts in one dashboard",
            "Promo pop-ups and banners for your offers",
            "AI product descriptions on paid plans",
            "Listed on the Shopmi.ng marketplace for buyers to find",
          ],
          cta: { label: "Create your shop", href: "/onboarding" },
          link: { label: "Why sell here", href: "/sellers" },
        },
      ]}
    />
  );
}

function GlassTile({
  className,
  title,
  body,
  children,
}: {
  className?: string;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-6 backdrop-blur-sm",
        className
      )}
    >
      {children ? <div className="mb-6">{children}</div> : null}
      <h3 className="mt-auto text-base font-semibold text-zinc-100">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}

export function FeaturesBento({ startOffer }: { startOffer: { value: string; label: string } }) {
  return (
    <section
      id="features"
      className="dark relative scroll-mt-20 overflow-hidden bg-black px-5 py-16 text-zinc-100 sm:px-8 sm:py-24"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_0%_30%,rgba(255,130,46,0.14),transparent_45%),radial-gradient(circle_at_100%_80%,rgba(0,195,247,0.08),transparent_45%)]"
      />
      <div className="relative mx-auto w-full max-w-6xl">
        <SectionIntro
          inverted
          eyebrow="Features"
          title="Built for how Nigerians sell online"
          body="Everything below is live today. No plugins, no extra apps."
        />
        <BentoGridShowcase
          className="mt-12"
          integration={<CardTabs className="h-full" />}
          trackers={
            <GlassTile
              title="Paystack checkout"
              body="Buyers pay by card, transfer or USSD. Verified sellers are paid straight to their bank."
            >
              <Image src="/brand/paystack-dark.svg" alt="Paystack" width={157} height={28} unoptimized className="h-6 w-auto" />
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  { icon: CreditCard, label: "Card" },
                  { icon: Landmark, label: "Transfer" },
                  { icon: Smartphone, label: "USSD" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-zinc-300"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#00c3f7]" aria-hidden />
                    {label}
                  </span>
                ))}
              </div>
            </GlassTile>
          }
          statistic={
            <div className="relative flex h-full min-h-[180px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-white/5 bg-zinc-900/40 p-6 text-center">
              <div
                aria-hidden
                className="absolute inset-0 opacity-20 [background-image:radial-gradient(#fafafa_1px,transparent_1px)] [background-size:16px_16px]"
              />
              <span className="relative font-display text-7xl font-bold tracking-tight text-white sm:text-8xl">
                {startOffer.value}
              </span>
              <span className="relative mt-2 text-sm text-zinc-400">{startOffer.label}</span>
            </div>
          }
          focus={
            <GlassTile title="WhatsApp alerts" body="Know the moment an order comes in, and let buyers chat with you.">
              <div className="flex items-start gap-3 rounded-2xl bg-[#0f2a1b] p-3.5 text-[#bdf0d2]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#25d366] text-white">
                  <MessageCircle className="h-4 w-4" aria-hidden />
                </span>
                <span className="min-w-0 text-xs leading-relaxed">
                  <span className="block font-semibold">New order received</span>
                  2 items, {nairaWhole(50500)}. Paid with Paystack.
                </span>
              </div>
            </GlassTile>
          }
          productivity={
            <GlassTile title="AI listing descriptions" body="Type a product name, get a clear description to edit.">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 text-xs leading-relaxed">
                <span className="flex items-center gap-1.5 font-semibold text-zinc-100">
                  <Sparkles className="h-3.5 w-3.5 text-[#ff9a52]" aria-hidden />
                  Ankara midi skirt
                </span>
                <span className="mt-1.5 block text-zinc-400">
                  A flowing midi skirt in bold Ankara print, with a comfortable elastic waist...
                </span>
              </div>
            </GlassTile>
          }
        />
      </div>
    </section>
  );
}

export function TrustStrip({
  plans,
  billingEnabled,
  categoryCount,
}: {
  plans: PlanPublic[];
  billingEnabled: boolean;
  categoryCount: number;
}) {
  const trialDays = billingEnabled ? Math.max(0, ...plans.map((p) => p.trialDays ?? 0)) : 0;
  const seats = billingEnabled
    ? Math.max(0, ...plans.map((p) => Number((p.featureFlags as Record<string, unknown> | null)?.staffAccounts ?? 0)))
    : 0;
  const candidates: (StatItem | null)[] = [
    { icon: Palette, value: String(STORE_THEMES.length), label: "Storefront themes", tone: "purple" },
    trialDays > 0
      ? { icon: CalendarCheck, value: `${trialDays} days`, label: "Free trial on paid plans", tone: "green" }
      : { icon: CalendarCheck, value: "₦0", label: "To open your shop", tone: "green" },
    categoryCount > 0
      ? { icon: LayoutGrid, value: String(categoryCount), label: "Categories to sell in", tone: "amber" }
      : null,
    seats > 0
      ? { icon: Users, value: `Up to ${seats}`, label: "Team members per shop", tone: "blue" }
      : { icon: Link2, value: "1 link", label: "For your whole shop", tone: "blue" },
  ];
  const items = candidates.filter((x): x is StatItem => x !== null);

  return (
    <Section id="numbers">
      <Stats06
        header={
          <SectionIntro
            eyebrow="In numbers"
            title="What your shop gets from day one"
            body="The essentials are built in, so you can open, take payments and grow without adding more tools."
          />
        }
        items={items}
        feature={{
          tone: "sky",
          mark: <ShieldCheck className="h-10 w-10 stroke-[1.75px] text-sky-500" aria-hidden />,
          value: (
            <>
              <span className="sr-only">Paystack</span>
              <Image src="/brand/paystack.svg" alt="" width={157} height={28} unoptimized className="h-9 w-auto dark:hidden sm:h-10" />
              <Image src="/brand/paystack-dark.svg" alt="" width={157} height={28} unoptimized className="hidden h-9 w-auto dark:block sm:h-10" />
            </>
          ),
          label: "Secured checkout",
          children: (
            <div className="rounded-lg border border-sky-200 bg-white p-4 shadow-sm dark:border-sky-400/20 dark:bg-[#0b1620]">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Buyers pay with</p>
              <ul className="mt-3 space-y-2">
                {[
                  { icon: CreditCard, label: "Card" },
                  { icon: Landmark, label: "Bank transfer" },
                  { icon: Smartphone, label: "USSD" },
                ].map(({ icon: Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
                  >
                    <Icon className="h-4 w-4 text-sky-500" aria-hidden />
                    {label}
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Lock className="h-3.5 w-3.5" aria-hidden />
                Verified sellers are paid straight to their bank
              </p>
            </div>
          ),
        }}
      />
    </Section>
  );
}

export function PricingTeaser({ plans }: { plans: PlanPublic[] }) {
  if (!plans.length) return null;
  return (
    <PricingSection
      id="pricing"
      plans={plans}
      headingAs="h2"
      eyebrow={<Badge7 label="Pricing" />}
      compareHref="/pricing#compare"
      className="min-h-0 scroll-mt-20 px-5 pb-16 pt-4 sm:px-8 sm:pb-24 sm:pt-6"
      assurances={[
        "No card needed to start",
        "Paystack checkout on every plan",
        "Change plans any time",
        "Prices in naira",
      ]}
    />
  );
}
