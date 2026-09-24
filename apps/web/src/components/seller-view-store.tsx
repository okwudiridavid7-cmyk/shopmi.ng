"use client";

import { ExternalLink } from "lucide-react";
import { useSellerPlan } from "@/hooks/use-seller";
import { buildPublicShopUrl } from "@/lib/shop-url";

/** Persistent “View Store” control for the seller dashboard shell. */
export function SellerViewStoreButton({
  collapsed,
}: {
  collapsed?: boolean;
}) {
  const plan = useSellerPlan();
  const slug = plan.data?.tenant?.slug;
  if (!slug) return null;

  const href = buildPublicShopUrl(slug);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      title="View Store"
      className={`flex items-center gap-token-2 rounded-md border border-border bg-accent/10 px-token-3 py-token-2 text-sm font-medium text-accent transition hover:bg-accent/20 ${
        collapsed ? "justify-center px-token-2" : ""
      }`}
    >
      <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
      {!collapsed && <span className="truncate">View Store</span>}
    </a>
  );
}
