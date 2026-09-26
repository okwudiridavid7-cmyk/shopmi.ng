"use client";

import React, { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CreditCard,
  LayoutGrid,
  type LucideIcon,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppName } from "@/hooks/use-branding";

type FAQCategory =
  | "general"
  | "buying"
  | "selling"
  | "payments"
  | "account";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: FAQCategory;
}

function buildFaq(appName: string): FAQItem[] {
  return [
    {
      id: "g1",
      category: "general",
      question: `What is ${appName}?`,
      answer: `${appName} is a Nigerian marketplace where independent sellers run branded shops and buyers discover products, save favorites, and check out securely with Paystack.`,
    },
    {
      id: "g2",
      category: "general",
      question: "Do I need an account to browse?",
      answer:
        "No. You can explore shops and products freely. An account is required to save favorites, place orders, or open a shop.",
    },
    {
      id: "g3",
      category: "general",
      question: "What does the verified badge mean?",
      answer:
        "A verified shop has passed platform review. It is a trust signal, not a guarantee of product quality — always read the listing carefully.",
    },
    {
      id: "g4",
      category: "general",
      question: "How do I contact support?",
      answer: `Use the Contact page or email support@shopmi.ng. For an order you already placed, message that shop as well so fulfilment stays fast.`,
    },
    {
      id: "b1",
      category: "buying",
      question: "How do I place an order?",
      answer:
        "Add items to your cart, proceed to checkout, and pay with Paystack. If your cart has products from multiple shops, you’ll complete payment for each shop in sequence.",
    },
    {
      id: "b2",
      category: "buying",
      question: "Can I buy from multiple shops at once?",
      answer:
        "Yes. Your cart can hold items from several sellers. At checkout we settle one payment per shop so each seller receives the correct amount.",
    },
    {
      id: "b3",
      category: "buying",
      question: "Where do I track my orders?",
      answer:
        "Open Your orders from the account menu (or /buyer/orders). You’ll see status updates and can open the invoice for each purchase.",
    },
    {
      id: "b4",
      category: "buying",
      question: "How do favorites work?",
      answer:
        "Tap the heart on a product while signed in. Saved items appear under Favorites so you can return to them later.",
    },
    {
      id: "s1",
      category: "selling",
      question: "How do I become a seller?",
      answer:
        "Create an account as a seller (or choose Become a seller from your buyer menu), then complete onboarding to pick a shop name, branding, and first products.",
    },
    {
      id: "s2",
      category: "selling",
      question: "Do I get my own shop website?",
      answer: `Yes. Every seller gets a branded shop page on ${appName} with products, contact, FAQ, and checkout — ready to share with customers.`,
    },
    {
      id: "s3",
      category: "selling",
      question: "How do I get paid?",
      answer:
        "Connect Paystack during setup. When a buyer pays, funds settle to your subaccount (minus the platform service fee). You’ll see paid orders in your seller dashboard.",
    },
    {
      id: "s4",
      category: "selling",
      question: "How does shop verification work?",
      answer:
        "Submit your verification documents from the seller dashboard. Our team reviews them; you’ll get an email when you’re approved or if anything needs updating.",
    },
    {
      id: "p1",
      category: "payments",
      question: "How are payments handled?",
      answer:
        "Checkout runs through Paystack. Card numbers never land on our servers. You receive a receipt and the seller sees a paid order to fulfil.",
    },
    {
      id: "p2",
      category: "payments",
      question: "What payment methods are accepted?",
      answer:
        "Paystack supports cards and local Nigerian payment options available on their checkout. Exact methods depend on Paystack’s current offerings.",
    },
    {
      id: "p3",
      category: "payments",
      question: "Are there platform fees?",
      answer:
        "Sellers may see a Shopmi service fee on successful orders. See Pricing for current plans.",
    },
    {
      id: "p4",
      category: "payments",
      question: "What if a payment fails mid multi-shop checkout?",
      answer:
        "Shops you already paid stay paid. You can retry the remaining shops from cart or checkout without duplicating completed payments.",
    },
    {
      id: "a1",
      category: "account",
      question: "How do I reset my password?",
      answer:
        'On the log-in page choose Forgot password. We’ll email a reset link if that address has an account.',
    },
    {
      id: "a2",
      category: "account",
      question: "Do I need to verify my email?",
      answer:
        "Yes when email verification is enabled. Check your inbox for a verify link after signup — it keeps your account secure and unlocks order updates.",
    },
    {
      id: "a3",
      category: "account",
      question: "Can I change my email address?",
      answer:
        "Contact support@shopmi.ng from your current account email and we’ll help update it after verification.",
    },
    {
      id: "a4",
      category: "account",
      question: "How is my data secured?",
      answer:
        "We use industry-standard practices including encrypted sessions, hashed passwords, and Paystack for card handling so sensitive payment data never touches our servers.",
    },
  ];
}

const CATEGORIES: {
  id: FAQCategory;
  icon: LucideIcon;
  label: string;
}[] = [
  { id: "general", icon: LayoutGrid, label: "General" },
  { id: "buying", icon: Truck, label: "Buying" },
  { id: "selling", icon: Store, label: "Selling" },
  { id: "payments", icon: CreditCard, label: "Payments" },
  { id: "account", icon: ShieldCheck, label: "Account" },
];

export function FaqTabbedExplorer() {
  const appName = useAppName() || "Shopmi.ng";
  const [activeTab, setActiveTab] = useState<FAQCategory>("general");
  const faqData = buildFaq(appName);
  const filteredItems = faqData.filter((item) => item.category === activeTab);

  return (
    <section className="w-full bg-background py-2 sm:py-4">
      <div className="mx-auto w-full max-w-5xl overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="flex flex-col items-stretch md:flex-row">
          <div className="w-full shrink-0 border-b border-border bg-muted/30 p-5 sm:p-6 md:w-64 md:border-b-0 md:border-r lg:w-72">
            <h3 className="mb-4 px-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Knowledge base
            </h3>
            <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:gap-1.5 md:overflow-visible md:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveTab(cat.id)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium transition-all md:w-full",
                    activeTab === cat.id
                      ? "border-border bg-background text-foreground shadow-sm"
                      : "border-transparent text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <cat.icon size={18} className="shrink-0" />
                  {cat.label}
                </button>
              ))}
            </nav>
          </div>

          <div className="min-w-0 flex-1 p-5 sm:p-6 md:p-8">
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl font-semibold capitalize text-foreground sm:text-2xl">
                {activeTab} questions
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Answers related to {activeTab} on {appName}.
              </p>
            </div>

            <Accordion
              type="single"
              collapsible
              defaultValue={filteredItems[0]?.id}
              key={activeTab}
              className="space-y-3"
            >
              {filteredItems.map((item) => (
                <AccordionItem
                  key={item.id}
                  value={item.id}
                  className="rounded-xl border border-border bg-background px-1"
                >
                  <AccordionTrigger className="px-3 py-3.5 text-sm font-semibold hover:no-underline sm:text-base">
                    <span className="pr-2 text-foreground">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 text-muted-foreground">
                    <p className="leading-relaxed">{item.answer}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </div>
    </section>
  );
}

export default FaqTabbedExplorer;
