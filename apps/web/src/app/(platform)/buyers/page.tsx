import Link from "next/link";
import { Badge7 } from "@/components/ui/cta69-utils/badge7";
import {
  BadgeCheck,
  FileText,
  Heart,
  MessageCircle,
  PackageCheck,
  ShieldCheck,
  Star,
  Store,
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
import { formatMoney, productImageUrl } from "@/lib/api";
import { getLatestProducts, getTopCategories } from "@/lib/marketing-data";
import { pageMetadata } from "@/lib/seo";

export const revalidate = 120;

export const metadata = pageMetadata({
  title: "For Buyers: Shop trusted independent sellers in Nigeria",
  description:
    "Discover fashion, beauty, electronics and more from verified Nigerian shops. Pay securely with Paystack, track every order and get a receipt by email.",
  path: "/buyers",
});

const BENEFITS: FeatureItem[] = [
  {
    icon: BadgeCheck,
    title: "Verified shops",
    body: "Look for the verified tick. Those sellers passed our review before getting it.",
  },
  {
    icon: ShieldCheck,
    title: "Secure checkout",
    body: "Pay with card, bank transfer or USSD through Paystack. Your card details never touch the shop.",
  },
  {
    icon: PackageCheck,
    title: "Track every order",
    body: "See the status of each order in your account, and get a payment confirmation by email.",
  },
  {
    icon: FileText,
    title: "Invoices included",
    body: "Download a PDF invoice for any order, any time.",
  },
  {
    icon: Star,
    title: "Real reviews",
    body: "Ratings and reviews from other buyers sit right on the product page.",
  },
  {
    icon: Heart,
    title: "Save favourites",
    body: "Heart the things you like and come back to them later from any device.",
  },
  {
    icon: MessageCircle,
    title: "Talk to the seller",
    body: "Ask a question through the shop's contact page or WhatsApp button before you buy.",
  },
  {
    icon: Store,
    title: "Policies up front",
    body: "Each shop shows its delivery, returns and FAQ pages, so you know what to expect.",
  },
];

const STEPS = [
  {
    title: "Find something you love",
    body: "Search the marketplace or browse by category, price and location.",
  },
  {
    title: "Pay securely",
    body: "Check out with Paystack using card, transfer or USSD. You get a confirmation straight away.",
  },
  {
    title: "Track your order",
    body: "Follow your order from your account and reach the shop directly if you need anything.",
  },
];

const FAQ: FaqItem[] = [
  {
    q: "Do I need an account to buy?",
    a: "You can browse and add items to your cart without one. You sign in at checkout so we can send your receipt and keep your order history in one place.",
  },
  {
    q: "How do I pay?",
    a: "All payments go through Paystack. You can pay by debit card, bank transfer or USSD.",
  },
  {
    q: "How do I track my order?",
    a: "Open Your orders in your account to see the status of each order and download its invoice. We also email you when your payment is confirmed.",
  },
  {
    q: "What does the verified tick mean?",
    a: "It means the shop passed our verification review. It is a good sign, but always check the shop's reviews and policies too.",
  },
  {
    q: "Who handles delivery and returns?",
    a: "Each shop sets its own delivery and return policy, shown on its FAQ and terms pages. Contact the shop directly through its contact page or WhatsApp button.",
  },
];

export default async function BuyersPage() {
  const [products, categories] = await Promise.all([getLatestProducts(8), getTopCategories(10)]);
  const mosaic = products.filter((p) => productImageUrl(p.images)).slice(0, 4);

  return (
    <>
      <JsonLd data={faqJsonLd(FAQ)} />

      <section className="overflow-hidden px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge7 label="For buyers" />
            <h1 className="mt-4 font-display text-[clamp(2.25rem,7vw,3.75rem)] font-bold leading-[1.05] tracking-tight text-foreground">
              Shop independent Nigerian brands with confidence.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Fashion, beauty, electronics, food and home goods from local shops. One secure checkout, verified sellers
              and every order tracked in one place.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <CtaLink href="/explore" arrow>
                Explore marketplace
              </CtaLink>
              <CtaLink href="/signup" variant="outline">
                Create a free account
              </CtaLink>
            </div>
          </div>

          {mosaic.length >= 4 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {mosaic.map((p, i) => (
                <Link
                  key={p.id}
                  href={p.tenant ? `/shops/${p.tenant.slug}/products/${p.id}` : "/explore"}
                  className={`group relative overflow-hidden rounded-2xl border border-border bg-muted ${
                    i % 2 === 1 ? "translate-y-6" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={productImageUrl(p.images)!}
                    alt={p.title}
                    loading={i < 2 ? "eager" : "lazy"}
                    decoding="async"
                    className="aspect-[4/5] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                  />
                  <span className="absolute inset-x-2 bottom-2 rounded-xl bg-[color-mix(in_oklab,var(--color-card)_92%,transparent)] px-3 py-2 text-xs shadow-sm backdrop-blur-sm">
                    <span className="block truncate font-semibold text-foreground">{p.title}</span>
                    <span className="text-muted-foreground">{formatMoney(Number(p.price), p.currency)}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <Section id="why" tone="muted">
        <SectionIntro
          eyebrow="Why shop here"
          title="Buy from small shops without the guesswork"
          body="The independence of buying direct from a seller, with the safety of a proper checkout."
        />
        <div className="mt-12">
          <FeatureGrid items={BENEFITS} columns={4} />
        </div>
      </Section>

      <Section id="how-it-works">
        <SectionIntro eyebrow="How it works" title="Three steps to checkout" />
        <div className="mt-12">
          <Steps steps={STEPS} />
        </div>
      </Section>

      {categories.length > 0 ? (
        <Section id="categories" tone="muted">
          <SectionIntro eyebrow="Browse" title="Start with a category" />
          <ul className="mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2.5">
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/explore?category=${encodeURIComponent(c.slug)}`}
                  className="inline-flex h-11 items-center rounded-full border border-border bg-card px-5 text-sm font-medium text-foreground transition hover:border-accent hover:text-accent-strong dark:hover:text-accent-on-dark"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section id="faq">
        <SectionIntro eyebrow="FAQ" title="Questions buyers ask" />
        <div className="mt-10">
          <FaqList items={FAQ} />
        </div>
      </Section>

      <CtaBand
        title="Find your next favourite shop"
        body="Discover products from independent sellers across Nigeria, all with one secure checkout."
        primary={{ href: "/explore", label: "Explore marketplace" }}
        secondary={{ href: "/signup", label: "Create a free account" }}
      />
    </>
  );
}
