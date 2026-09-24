"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  MarketingEyebrow,
  MarketingHeading,
  MarketingSection,
} from "@/components/marketing-sections";
import { useAppName } from "@/hooks/use-branding";

export default function FaqPage() {
  const appName = useAppName() || "Shopmi.ng";
  const items = [
    {
      q: `What is ${appName}?`,
      a: `${appName} is a marketplace where independent sellers run branded shops and buyers discover products, save favorites, and check out with Paystack.`,
    },
    {
      q: "How do I become a seller?",
      a: "Create an account as a seller (or choose Become a seller from your buyer menu), then complete onboarding to pick a shop name, branding, and first products.",
    },
    {
      q: "How are payments handled?",
      a: "Checkout runs through Paystack. Card numbers never land on our servers. You receive a receipt and the seller sees a paid order to fulfil.",
    },
    {
      q: "What does the verified badge mean?",
      a: "A verified shop has passed platform review. It is a trust signal, not a guarantee of product quality. Always read the listing.",
    },
    {
      q: "How do I contact support?",
      a: "Use the Contact Us page. Messages go to the platform support inbox. For an order you already placed, contact that shop as well.",
    },
    {
      q: "Can I reset my password?",
      a: "Yes. On the log-in page choose Forgot password and we will email a reset link if that address has an account.",
    },
  ];

  return (
    <div>
      <MarketingSection>
        <div className="mx-auto max-w-2xl text-center">
          <MarketingEyebrow>Help</MarketingEyebrow>
          <MarketingHeading className="mt-token-3">FAQs</MarketingHeading>
          <p className="mt-token-3 text-sm text-muted-foreground sm:text-base">
            Common questions about shopping and selling on {appName}.
          </p>
        </div>
        <ul className="mx-auto mt-10 max-w-3xl space-y-token-4">
          {items.map((item) => (
            <li
              key={item.q}
              className="rounded-lg border border-border bg-card px-token-5 py-token-4 shadow-sm"
            >
              <h2 className="font-medium text-foreground">{item.q}</h2>
              <p className="mt-token-2 text-sm leading-relaxed text-muted-foreground">
                {item.a}
              </p>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap justify-center gap-token-3">
          <Link href="/contact">
            <Button variant="primary">Contact us</Button>
          </Link>
          <Link href="/support">
            <Button variant="outline">Support hub</Button>
          </Link>
        </div>
      </MarketingSection>
    </div>
  );
}
