"use client";

import { useEffect, useState } from "react";
import type { FaqItem, TenantPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";

export default function ShopFaqPage({ params }: { params: { slug: string } }) {
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ tenant: TenantPublic }>(`/api/shops/${params.slug}`)
      .then((r) => setTenant(r.tenant))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [params.slug]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  const faq: FaqItem[] = tenant?.faqContent?.length
    ? tenant.faqContent
    : [
        {
          question: "How do I place an order?",
          answer:
            "Browse products, add items to your cart, then checkout. You’ll receive confirmation after payment.",
        },
        {
          question: "How can I contact the shop?",
          answer: "Use the Contact page for phone, email, and social links.",
        },
      ];

  return (
    <div className="mx-auto max-w-3xl space-y-token-6">
      <h1 className="font-display text-3xl text-foreground">FAQ</h1>
      <ul className="space-y-token-4">
        {faq.map((item, i) => (
          <li
            key={`${item.question}-${i}`}
            className="rounded-lg border border-border bg-card px-token-4 py-token-4"
          >
            <h2 className="font-medium text-foreground">{item.question}</h2>
            <p className="mt-token-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {item.answer}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
