"use client";

import Link from "next/link";
import {
  TiltedGridHero,
  type TiltedGridImage,
} from "@/components/ui/tilted-grid-hero";
import { Badge7 } from "@/components/ui/cta69-utils/badge7";
import { categoryPhoto } from "@/lib/category-images";

/** Marketplace categories people sell on Shopmi — Unsplash covers via categoryPhoto. */
const SOLD_SLUGS = [
  "fashion",
  "beauty-health-personal-care",
  "electronics-gadgets",
  "groceries-food",
  "home-kitchen",
  "baby-kids-toys",
  "sports-outdoors",
  "automotive",
  "pet-supplies",
  "arts-crafts-hobbies",
] as const;

function soldImages(): TiltedGridImage[] {
  const fromCategories = SOLD_SLUGS.flatMap((slug) => {
    const photo = categoryPhoto(slug, 900);
    if (!photo) return [];
    return [{ src: photo.url, alt: photo.alt }];
  });

  // Extra Unsplash product shots so the loop never feels short.
  const extras: TiltedGridImage[] = [
    {
      src: "https://images.unsplash.com/photo-1523275335684-378608b95293?auto=format&fit=crop&w=900&h=506&q=70",
      alt: "White smartwatch on a colourful backdrop",
    },
    {
      src: "https://images.unsplash.com/photo-1572635196237-14b3f281503f?auto=format&fit=crop&w=900&h=506&q=70",
      alt: "Classic sunglasses on a bright surface",
    },
    {
      src: "https://images.unsplash.com/photo-1560343090-f0409e92791a?auto=format&fit=crop&w=900&h=506&q=70",
      alt: "Fresh white sneakers",
    },
    {
      src: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&h=506&q=70",
      alt: "Wireless headphones on a yellow backdrop",
    },
  ];

  return [...fromCategories, ...extras];
}

const IMAGES = soldImages();

export function ThingsSoldSection() {
  return (
    <section className="overflow-hidden bg-[#0b0b0b]">
      {/* Intro is outside the band; spacer absorbs curved tiles that swell upward */}
      <div className="relative z-20 mx-auto max-w-2xl bg-[#0b0b0b] px-5 pb-6 pt-12 text-center sm:px-8 sm:pt-16">
        <Badge7
          label="On Shopmi.ng"
          className="border-white/15 bg-white/5 text-accent-on-dark shadow-none"
        />
        <h2 className="mt-5 text-balance font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
          Things sold on Shopmi
        </h2>
        <p className="mx-auto mt-4 max-w-md text-balance text-base leading-relaxed text-zinc-400 sm:text-lg">
          Fashion, beauty, gadgets, food and home goods from independent shops
          across Nigeria.
        </p>
      </div>
      <div aria-hidden className="relative z-20 h-12 bg-[#0b0b0b] sm:h-8" />

      <TiltedGridHero
        images={IMAGES}
        speed={3.5}
        tileHeight={28}
        axis={58}
        curve={70}
        fade={14}
        className="relative z-0 h-[min(24rem,68vw)] w-full sm:h-[28rem]"
      >
        <div className="relative z-10 flex h-full flex-col items-center justify-end px-5 pb-10 text-center sm:px-8 sm:pb-12">
          <Link
            href="/explore"
            className="inline-flex rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-neutral-950 shadow-[0_0_0_6px_rgba(11,11,11,0.55)] transition hover:bg-white/90"
          >
            Browse the marketplace
          </Link>
        </div>
      </TiltedGridHero>
    </section>
  );
}
