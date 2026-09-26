"use client";

import Link from "next/link";
import { FaqTabbedExplorer } from "@/components/ui/faq-tabbed-explorer";
import { Button } from "@/components/ui/button";
import {
  MarketingEyebrow,
  MarketingHeading,
  MarketingSection,
} from "@/components/marketing-sections";
import { useAppName } from "@/hooks/use-branding";

export default function FaqPage() {
  const appName = useAppName() || "Shopmi.ng";

  return (
    <div>
      <MarketingSection className="!pb-6 sm:!pb-8">
        <div className="mx-auto max-w-2xl text-center">
          <MarketingEyebrow>Help</MarketingEyebrow>
          <MarketingHeading className="mt-token-3">FAQs</MarketingHeading>
          <p className="mt-token-3 text-sm text-muted-foreground sm:text-base">
            Common questions about shopping and selling on {appName}.
          </p>
        </div>
      </MarketingSection>

      <div className="px-4 pb-4 sm:px-6">
        <FaqTabbedExplorer />
      </div>

      <div className="flex flex-wrap justify-center gap-token-3 pb-16 pt-2">
        <Link href="/contact">
          <Button variant="primary">Contact us</Button>
        </Link>
        <Link href="/support">
          <Button variant="outline">Support hub</Button>
        </Link>
      </div>
    </div>
  );
}
