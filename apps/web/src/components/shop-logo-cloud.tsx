"use client";

import Link from "next/link";
import { useAnimationFrame } from "motion/react";
import { useRef } from "react";
import { VerifiedBadge } from "@/components/shell/trust-badge";
import { BorderBeam } from "@/components/ui/logo-cloud-15-utils/border-beam";
import { Marquee } from "@/components/ui/logo-cloud-15-utils/marquee";
import { cn } from "@/lib/utils";

export type ShopEntry = {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  verified?: boolean;
  faviconUrl?: string | null;
};

type ShopLogoCloudProps = {
  shops: ShopEntry[];
  className?: string;
};

const BEAM_DURATION = 8;
const BEAM_SIZE = 100;

function shopInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
}

function ShopMark({ shop }: { shop: ShopEntry }) {
  const src = shop.logoUrl || shop.faviconUrl;
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt=""
        className="h-9 w-9 shrink-0 rounded-md border border-border bg-muted object-cover"
      />
    );
  }
  return (
    <span
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-accent-soft text-xs font-semibold text-accent"
      aria-hidden
    >
      {shopInitials(shop.name)}
    </span>
  );
}

function ShopChip({ shop }: { shop: ShopEntry }) {
  return (
    <Link
      href={`/shops/${shop.slug}`}
      className="mr-6 inline-flex shrink-0 items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2 transition hover:border-accent/40 hover:bg-muted/40"
    >
      <ShopMark shop={shop} />
      <span className="flex max-w-[10rem] items-center gap-1 truncate text-sm font-medium text-foreground">
        <span className="truncate">{shop.name}</span>
        {shop.verified ? <VerifiedBadge size="sm" /> : null}
      </span>
    </Link>
  );
}

/** Marketplace logo cloud — marquee of trusted shops with border beam. */
export function ShopLogoCloud({ shops, className }: ShopLogoCloudProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const waveSpanRef = useRef<HTMLSpanElement>(null);
  const startTimeRef = useRef<number | null>(null);

  useAnimationFrame((time) => {
    if (!(cardRef.current && textRef.current && waveSpanRef.current)) return;

    if (startTimeRef.current === null) {
      startTimeRef.current = time;
    }

    const elapsed = ((time - startTimeRef.current) / 1000) % BEAM_DURATION;
    const beamOffset = (elapsed / BEAM_DURATION) * 100;

    const cardRect = cardRef.current.getBoundingClientRect();
    const textRect = textRef.current.getBoundingClientRect();

    const W = cardRect.width;
    const H = cardRect.height;
    const perimeter = 2 * (W + H);

    const textLeft = Math.max(0, textRect.left - cardRect.left);
    const textRight = Math.min(W, textRect.right - cardRect.left);

    const textStartPercent = (textLeft / perimeter) * 100;
    const textEndPercent = (textRight / perimeter) * 100;

    const span = waveSpanRef.current;

    if (beamOffset >= textStartPercent && beamOffset <= textEndPercent) {
      const t =
        (beamOffset - textStartPercent) / (textEndPercent - textStartPercent);
      span.style.backgroundPosition = `${95 - t * 90}% center`;
    } else if (beamOffset < textStartPercent) {
      span.style.backgroundPosition = "0% center";
    } else {
      span.style.backgroundPosition = "100% center";
    }
  });

  if (shops.length === 0) return null;

  return (
    <div className={cn("flex items-center justify-center px-4 sm:px-6", className)}>
      <div
        className="relative w-full max-w-screen-lg rounded-lg border border-border bg-card"
        ref={cardRef}
      >
        <BorderBeam
          className="isolate -z-[1]"
          duration={BEAM_DURATION}
          size={BEAM_SIZE}
          colorFrom="#ff822e"
          colorTo="#ffaa40"
        />

        <div className="absolute inset-x-0 top-0 flex -translate-y-1/2 items-center justify-center px-6 sm:px-10">
          <p
            className="bg-background px-3 text-center font-medium text-foreground/80 text-lg tracking-[-0.01em] sm:px-6 sm:text-xl"
            ref={textRef}
          >
            <span
              ref={waveSpanRef}
              style={{
                backgroundImage:
                  "linear-gradient(90deg, currentColor 0%, currentColor 45%, #ffaa40 47%, #ff822e 50%, #ffaa40 53%, currentColor 55%, currentColor 100%)",
                backgroundSize: "250% 100%",
                backgroundRepeat: "no-repeat",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundPosition: "0% center",
              }}
            >
              Trusted shops on Shopmi.ng
            </span>
          </p>
        </div>

        <div className="grid">
          <div className="flex min-w-0 items-center justify-center p-8 pt-12 sm:p-10 sm:pt-12">
            <Marquee
              className="[--duration:28s] [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]"
              pauseOnHover
            >
              {shops.map((shop) => (
                <ShopChip key={shop.id} shop={shop} />
              ))}
            </Marquee>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShopLogoCloud;
