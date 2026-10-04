import type { PlanPublic } from "@vendors/shared-types";
import { HomeHero } from "@/components/marketing/home-hero";
import { JsonLd } from "@/components/json-ld";
import { Cta69 } from "@/components/ui/cta69";
import ScrollFAQAccordion from "@/components/ui/scroll-faqaccordion";
import {
  faqJsonLd,
  Section,
  SectionIntro,
  type FaqItem,
} from "@/components/marketing/blocks";
import { CircularGallery, type GalleryItem } from "@/components/ui/circular-gallery";
import { HowItWorksTabs } from "@/components/marketing/how-it-works-tabs";
import {
  AboutSection,
  FeaturesBento,
  PricingTeaser,
  TrustStrip,
} from "@/components/marketing/home-sections";
import { ReplacesSection, ThemesShowcase } from "@/components/marketing/sections";
import { categoryPhoto } from "@/lib/category-images";
import {
  cheapestPaidPlan,
  getPlans,
  getTopCategories,
  hasFreePlan,
  nairaWhole,
} from "@/lib/marketing-data";
import { pageMetadata, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/seo";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "Shopmi.ng | Shop local brands or open your online store in Nigeria",
  description:
    "Discover products from independent Nigerian shops, or create your own online store in minutes with Paystack checkout, WhatsApp order alerts and a branded shop link.",
  path: "/",
  absoluteTitle: true,
});

const HOW_IT_WORKS = [
  {
    id: "sell",
    label: "I want to sell",
    steps: [
      { title: "Create your shop", body: "Sign up, name your shop and pick a theme. It takes a few minutes." },
      { title: "Add products", body: "Upload photos, set prices and stock. AI can draft descriptions for you." },
      { title: "Share and get paid", body: "Share your link anywhere. Buyers pay with Paystack, you get paid to your bank." },
    ],
  },
  {
    id: "buy",
    label: "I want to buy",
    steps: [
      { title: "Discover", body: "Search the marketplace or browse categories from shops across Nigeria." },
      { title: "Pay securely", body: "Check out with card, transfer or USSD through Paystack." },
      { title: "Track your order", body: "Follow every order from your account and download the invoice." },
    ],
  },
];

function homeFaq(billingEnabled: boolean, free: boolean, fromPrice: string | null): FaqItem[] {
  const cost = !billingEnabled
    ? "Opening a shop is free right now."
    : [
        free ? "You can start on the free plan." : null,
        fromPrice ? `Paid plans start from ${fromPrice} a month.` : null,
        "Buyers never pay to use Shopmi.ng.",
      ]
        .filter(Boolean)
        .join(" ");
  return [
    {
      q: "What is Shopmi.ng?",
      a: "Shopmi.ng is a Nigerian marketplace and online store builder. Independent sellers get their own branded shop, and buyers can discover and buy from all of them in one place.",
    },
    { q: "How much does it cost?", a: cost },
    {
      q: "How do payments work?",
      a: "Every payment goes through Paystack. Buyers pay by card, bank transfer or USSD, and verified sellers receive payouts directly to their bank account.",
    },
    {
      q: "How do I know a seller is genuine?",
      a: "Look for the verified tick, which shops earn by passing our review. Product pages also show reviews from other buyers and each shop's policies.",
    },
    {
      q: "Can I use my own domain for my shop?",
      a: "Yes, on plans that include a custom domain. Connect a domain you already own, or buy one from your seller dashboard.",
    },
    {
      q: "Do I need an account to shop?",
      a: "You can browse and fill your cart without one. You sign in at checkout so we can send your receipt and keep your orders in one place.",
    },
  ];
}

function ctaFootnote(billingEnabled: boolean, free: boolean, fromPrice: string | null): string {
  if (!billingEnabled) return "Opening a shop is free right now.";
  if (free && fromPrice) return `Free to start. Paid plans from ${fromPrice}/month.`;
  if (fromPrice) return `Plans from ${fromPrice}/month.`;
  return "Free to start.";
}

function categoryGallery(categories: Awaited<ReturnType<typeof getTopCategories>>): GalleryItem[] {
  return categories.flatMap((c) => {
    const photo = categoryPhoto(c.slug);
    if (!photo) return [];
    const examples = (c.children ?? []).slice(0, 3).map((child) => child.name);
    return [
      {
        common: c.name,
        binomial: examples.length ? examples.join(", ") : undefined,
        href: `/explore?category=${encodeURIComponent(c.slug)}`,
        photo: { url: photo.url, text: photo.alt, pos: photo.pos },
      },
    ];
  });
}

function startOffer(billingEnabled: boolean, plans: PlanPublic[]): { value: string; label: string } {
  if (!billingEnabled || hasFreePlan(plans)) return { value: "₦0", label: "to open your shop" };
  const trialDays = plans.find((p) => p.trialDays > 0)?.trialDays ?? 0;
  if (trialDays > 0) return { value: `${trialDays}`, label: "days free, no card needed" };
  return { value: "1 link", label: "for your whole shop" };
}

function sellerBadge(billingEnabled: boolean, plans: PlanPublic[]): string | undefined {
  if (!billingEnabled || hasFreePlan(plans)) return "Free to start";
  const trialDays = plans.find((p) => p.trialDays > 0)?.trialDays ?? 0;
  return trialDays > 0 ? `${trialDays}-day free trial` : undefined;
}

export default async function HomePage() {
  const [{ plans, billingEnabled }, categories] = await Promise.all([getPlans(), getTopCategories(40)]);
  const cheapest = cheapestPaidPlan(plans);
  const faq = homeFaq(billingEnabled, hasFreePlan(plans), cheapest ? nairaWhole(Number(cheapest.price)) : null);
  const gallery = categoryGallery(categories);

  const structuredData = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/brand/logo-light.png`,
      description: SITE_DESCRIPTION,
      areaServed: "NG",
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: SITE_NAME,
      url: SITE_URL,
      potentialAction: {
        "@type": "SearchAction",
        target: { "@type": "EntryPoint", urlTemplate: `${SITE_URL}/explore?q={search_term_string}` },
        "query-input": "required name=search_term_string",
      },
    },
    faqJsonLd(faq),
  ];

  return (
    <>
      <JsonLd data={structuredData} />
      <HomeHero />

      <AboutSection sellerBadge={sellerBadge(billingEnabled, plans)} />

      {gallery.length >= 6 ? (
        <section className="overflow-hidden bg-[#0b0b0b] px-5 py-16 sm:px-8 sm:py-24">
          <SectionIntro
            inverted
            eyebrow="On Shopmi.ng"
            title="What people are selling"
            body="Fashion, beauty, gadgets, food and home goods from shops across Nigeria. Tap a category to start browsing."
          />
          <div className="mt-6 h-[clamp(15rem,40vw,19rem)] sm:mt-10">
            <CircularGallery items={gallery} autoRotateSpeed={0.08} maxScale={0.5} />
          </div>
        </section>
      ) : null}

      <Section id="how-it-works">
        <SectionIntro eyebrow="How it works" title="Simple on both sides" />
        <div className="mt-10">
          <HowItWorksTabs tabs={HOW_IT_WORKS} />
        </div>
      </Section>

      <FeaturesBento startOffer={startOffer(billingEnabled, plans)} />

      <ReplacesSection plans={plans} billingEnabled={billingEnabled} tone="muted" />

      <ThemesShowcase />

      <TrustStrip plans={plans} billingEnabled={billingEnabled} categoryCount={categories.length} />

      {billingEnabled ? <PricingTeaser plans={plans} /> : null}

      <Section id="faq" tone="muted">
        <ScrollFAQAccordion
          className="py-0"
          pinOffset={96}
          data={faq.map((f, i) => ({ id: i + 1, question: f.q, answer: f.a }))}
          header={<SectionIntro eyebrow="FAQ" title="Popular Questions" className="mb-10" />}
        />
      </Section>

      <Cta69
        badge={{ label: "Get started" }}
        heading="Ready when you are."
        button={{ label: "Create your shop", href: "/onboarding" }}
        secondaryButton={{ label: "Explore marketplace", href: "/explore" }}
        marqueeDurationSec={120}
        labels={{
          marqueePhrase: "Shopmi.ng",
          note: "Find something you love, or open your own shop and make your first sale.",
          footnote: ctaFootnote(billingEnabled, hasFreePlan(plans), cheapest ? nairaWhole(Number(cheapest.price)) : null),
        }}
      />
    </>
  );
}
