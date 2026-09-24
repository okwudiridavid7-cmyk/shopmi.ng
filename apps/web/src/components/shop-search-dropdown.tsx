"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ProductPublic } from "@vendors/shared-types";
import { formatMoney, productImageUrl } from "@/lib/api";
import { Input } from "@/components/ui/input";

/**
 * Shop-page search ONLY — debounced typeahead DROPDOWN (not a filtered grid).
 * Marketplace search must remain grid-based on the homepage.
 */
export function ShopSearchDropdown({
  slug,
  products,
  brandColor,
}: {
  slug: string;
  /** Client-side filter over loaded shop products (or pass server-filtered list). */
  products: ProductPublic[];
  brandColor?: string | null;
}) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(q.trim().toLowerCase()), 220);
    return () => window.clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const matches =
    debounced.length === 0
      ? []
      : products
          .filter(
            (p) =>
              p.title.toLowerCase().includes(debounced) ||
              p.description.toLowerCase().includes(debounced)
          )
          .slice(0, 8);

  const showDropdown = open && q.trim().length > 0;

  return (
    <div ref={rootRef} className="relative z-20 w-full max-w-xl">
      <Input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search this shop…"
        aria-label="Search shop products"
        aria-expanded={showDropdown}
        aria-controls="shop-search-results"
        style={
          brandColor
            ? { borderColor: `color-mix(in srgb, ${brandColor} 45%, var(--color-border))` }
            : undefined
        }
      />
      {showDropdown && (
        <div
          id="shop-search-results"
          role="listbox"
          className="absolute left-0 right-0 top-full mt-token-1 max-h-80 overflow-y-auto rounded-md border border-border bg-card shadow-lg"
        >
          {matches.length === 0 ? (
            <p className="px-token-4 py-token-6 text-sm text-muted-foreground">
              No products found
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {matches.map((p) => {
                const img = productImageUrl(p.images);
                return (
                  <li key={p.id}>
                    <Link
                      href={`/shops/${slug}/products/${p.id}`}
                      role="option"
                      className="flex items-center gap-token-3 px-token-3 py-token-2 text-sm transition hover:bg-muted"
                      onClick={() => {
                        setOpen(false);
                        setQ("");
                      }}
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                        {img ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={img}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">
                          {p.title}
                        </p>
                        <p className="text-muted-foreground">
                          {formatMoney(p.price, p.currency)}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
