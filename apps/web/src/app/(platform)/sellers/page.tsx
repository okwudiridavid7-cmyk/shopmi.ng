import Image from "next/image";
import { Badge7 } from "@/components/ui/cta69-utils/badge7";
import {
  BadgeCheck,
  CreditCard,
  Globe,
  Megaphone,
  MessageCircle,
  Palette,
  Receipt,
  Search,
  Sparkles,
} from "lucide-react";
import { JsonLd } from "@/components/json-ld";
import {
  CtaBand,
  CtaLink,
  FaqList,
  faqJsonLd,
  FeatureGrid,
  Section,
  SectionIntro,
  Steps,
  type FaqItem,
  type FeatureItem,
} from "@/components/marketing/blocks";
import { ReplacesSection, ThemesShowcase } from "@/components/marketing/sections";
import { cheapestPaidPlan, getPlans, hasFreePlan, nairaWhole } from "@/lib/marketing-data";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "For Sellers: Create your online store in Nigeria",
  description:
    "Open a branded online shop in minutes. Accept card, transfer and USSD payments with Paystack, get paid to your bank, and manage orders from your phone.",
  path: "/sellers",
});

const FEATURES: FeatureItem[] = [
  {
    icon: Palette,
    title: "Branded storefront",
    body: "Your logo, colours and banners on one of six themes, with your own shop link to share anywhere.",
  },
  {
    icon: CreditCard,
    title: "Paystack checkout",
    body: "Buyers pay by card, bank transfer or USSD. Once verified, payouts settle straight to your bank account.",
  },
  {
    icon: Receipt,
    title: "Orders and invoices",
    body: "Every order in one list with status updates and sales at a glance. Buyers get a PDF invoice automatically.",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp",
    body: "A chat button on your shop, and an alert on WhatsApp when a new order comes in.",
  },
  {
    icon: Megaphone,
    title: "Promo pop-ups and banners",
    body: "Announce a sale or new arrivals to everyone who visits your shop.",
  },
  {
    icon: Sparkles,
    title: "AI listing help",
    body: "Turn a product name into a clear description, and watermark photos with your brand.",
  },
  {
    icon: BadgeCheck,
    title: "Verified badge",
    body: "Pass a quick review and a verified tick appears next to your shop name.",
  },
  {
    icon: Search,
    title: "Marketplace listing",
    body: "Your products also show up in the Shopmi.ng marketplace, where buyers are already searching.",
  },
  {
    icon: Globe,
    title: "Custom domain",
    body: "Use your own web address, like yourshop.com. Connect one you own or buy one in your dashboard.",
  },
];

const STEPS = [
  {
    title: "Create your shop",
    body: "Sign up, name your shop and pick a theme. Add your logo or make one with the built-in logo maker.",
  },
  {
    title: "Add your products",
    body: "Upload photos, set prices and stock, and choose a category. Easy to do from your phone.",
  },
  {
    title: "Share and get paid",
    body: "Share your shop link on WhatsApp, Instagram or TikTok. Buyers pay with Paystack and you get paid to your bank.",
  },
];

function sellerFaq(trialDays: number, freePlan: boolean, fromPrice: string | null, billingEnabled: boolean): FaqItem[] {
  const priceAnswer = !billingEnabled
    ? "Shopmi.ng is free to use right now. We will give you plenty of notice before any pricing changes."
    : [
        freePlan ? "You can start on the free plan." : null,
        fromPrice ? `Paid plans start from ${fromPrice} a month.` : null,
        trialDays > 0 ? `Paid plans include a ${trialDays}-day free trial.` : null,
        "See the pricing page for what each plan includes.",
      ]
        .filter(Boolean)
        .join(" ");
  return [
    { q: "How much does it cost to open a shop?", a: priceAnswer },
    {
      q: "How do I get paid?",
      a: "Buyers pay through Paystack by card, bank transfer or USSD. Once your shop is verified and your bank details are added, payouts settle directly to your account.",
    },
    {
      q: "Do I need a website or technical skills?",
      a: "No. Your shop is ready as soon as you sign up. You choose a theme, add products and share the link. Everything is managed from your dashboard, including on a phone.",
    },
    {
      q: "Can I use my own domain name?",
      a: "Yes, on plans that include a custom domain. You can connect a domain you already own or buy one from your dashboard.",
    },
    {
      q: "What does the verified badge mean?",
      a: "It shows buyers your shop passed our verification review. You can request verification from your dashboard.",
    },
  ];
}

export default async function SellersPage() {
  const { plans, billingEnabled } = await getPlans();
  const cheapest = cheapestPaidPlan(plans);
  const free = hasFreePlan(plans);
  const trialDays = Math.max(0, ...plans.map((p) => p.trialDays ?? 0));
  const faq = sellerFaq(trialDays, free, cheapest ? nairaWhole(Number(cheapest.price)) : null, billingEnabled);
  const priceLine = !billingEnabled
    ? "Free to use"
    : free
      ? "Free to start"
      : trialDays > 0
        ? `${trialDays}-day free trial`
        : null;

  return (
    <>
      <JsonLd data={faqJsonLd(faq)} />

      <section className="overflow-hidden px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div>
            <Badge7 label="For sellers" />
            <h1 className="mt-4 font-display text-[clamp(2.25rem,7vw,3.75rem)] font-bold leading-[1.05] tracking-tight text-foreground">
              Your online store, ready in minutes.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              A branded shop link, Paystack checkout and an orders dashboard you can run from your phone. Built for
              Nigerian sellers on WhatsApp, Instagram and TikTok.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaLink href="/onboarding" arrow>
                Create your shop
              </CtaLink>
              {billingEnabled ? (
                <CtaLink href="/pricing" variant="outline">
                  See pricing
                </CtaLink>
              ) : null}
            </div>
            {priceLine ? (
              <p className="mt-4 text-sm text-muted-foreground">{priceLine}. No setup fees.</p>
            ) : null}
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(60,40,20,0.45)] lg:-mr-24">
              <Image
                src="/og/dashboard.jpg"
                alt="Shopmi.ng seller dashboard showing revenue, orders and quick actions"
                width={1100}
                height={688}
                priority
                sizes="(min-width: 1024px) 640px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </div>
      </section>

      <Section id="features" tone="muted">
        <SectionIntro
          eyebrow="Features"
          title="Everything a growing shop needs"
          body="No plugins, no extra apps. Some features depend on your plan."
        />
        <div className="mt-12">
          <FeatureGrid items={FEATURES} columns={3} />
        </div>
      </Section>

      <Section id="how-it-works">
        <SectionIntro eyebrow="How it works" title="From sign-up to first sale" />
        <div className="mt-12">
          <Steps steps={STEPS} />
        </div>
      </Section>

      <ThemesShowcase />

      <ReplacesSection plans={plans} billingEnabled={billingEnabled} />

      <Section id="faq" tone="muted">
        <SectionIntro eyebrow="FAQ" title="Questions sellers ask" />
        <div className="mt-10">
          <FaqList items={faq} />
        </div>
      </Section>

      <div className="bg-muted">
        <CtaBand
          title="Open your shop today"
          body="Set up takes a few minutes. Add your first product and share your link today."
          primary={{ href: "/onboarding", label: "Create your shop" }}
          secondary={billingEnabled ? { href: "/pricing", label: "Compare plans" } : undefined}
        />
      </div>
    </>
  );
}
