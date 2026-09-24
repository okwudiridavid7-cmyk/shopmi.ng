"use client";

import Link from "next/link";
import type { SocialLinks } from "@vendors/shared-types";
import { useAppName } from "@/hooks/use-branding";
import { BrandMark } from "@/components/brand-mark";
import { ShopLogoFallback } from "@/components/shop-logo-fallback";

export type ShopFooterProps = {
  shopName: string;
  slug: string;
  /** CSS color for shop branding (from themeSettings). */
  accentColor?: string | null;
  logoUrl?: string | null;
  verified?: boolean;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  socialLinks?: SocialLinks | null;
  platformName?: string;
  aboutText?: string | null;
};

type SocialKey = keyof SocialLinks;

function socialHref(key: SocialKey, value: string): string {
  if (value.startsWith("http")) return value;
  if (key === "whatsapp") {
    const digits = value.replace(/\D/g, "");
    return `https://wa.me/${digits}`;
  }
  if (key === "instagram") return `https://instagram.com/${value.replace(/^@/, "")}`;
  if (key === "twitter") return `https://twitter.com/${value.replace(/^@/, "")}`;
  if (key === "facebook") return `https://facebook.com/${value}`;
  if (key === "tiktok") return `https://tiktok.com/@${value.replace(/^@/, "")}`;
  if (key === "youtube") return `https://youtube.com/${value}`;
  return value;
}

function SocialGlyph({ name }: { name: SocialKey }) {
  const common = "h-4 w-4";
  switch (name) {
    case "instagram":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden>
          <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
          <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
        </svg>
      );
    case "twitter":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
        </svg>
      );
    case "facebook":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M14 9h3V6h-3c-1.7 0-3 1.3-3 3v2H8v3h3v7h3v-7h3l1-3h-4V9c0-.6.4-1 1-1z" />
        </svg>
      );
    case "youtube":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
        </svg>
      );
    case "tiktok":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M19.6 8.2a6.8 6.8 0 0 1-3.9-1.2v7.1a5.7 5.7 0 1 1-5.7-5.7c.3 0 .6 0 .9.1v2.8a2.9 2.9 0 1 0 2 2.8V2h2.8c.2 1.6 1.2 3 2.6 3.8A6.8 6.8 0 0 0 19.6 7v1.2z" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className={common} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <path d="M12 2a10 10 0 0 0-8.7 15l-1.1 4 4.1-1.1A10 10 0 1 0 12 2zm5.6 14.2c-.2.7-1.3 1.2-2.1 1.4-.6.1-1.3.2-3.8-.8-3.2-1.3-5.2-4.6-5.4-4.8-.2-.2-1.5-2-1.5-3.8s1-2.7 1.3-3.1c.3-.4.7-.5 1-.5h.7c.2 0 .5 0 .7.6l1 2.4c.1.2.1.4 0 .6l-.4.7c-.2.3-.4.5-.2.8.2.3.8 1.3 1.8 2.1 1.2 1 2.2 1.3 2.5 1.5.3.1.5.1.7-.1l.8-1.1c.2-.2.4-.2.7-.1l2.2 1c.3.1.5.2.6.4.1.2.1 1.1-.1 1.8z" />
        </svg>
      );
    default:
      return null;
  }
}

const SOCIAL_META: { key: SocialKey; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "twitter", label: "Twitter / X" },
  { key: "facebook", label: "Facebook" },
  { key: "tiktok", label: "TikTok" },
  { key: "whatsapp", label: "WhatsApp" },
  { key: "youtube", label: "YouTube" },
];

const PLATFORM_USEFUL = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/faq", label: "FAQs" },
  { href: "/support", label: "Support" },
] as const;

const PLATFORM_BUYING = [
  { href: "/buyer/orders", label: "Your orders" },
  { href: "/buyer/favorites", label: "Favorites" },
  { href: "/cart", label: "Cart" },
  { href: "/faq", label: "Buying help" },
] as const;

const PLATFORM_LEGAL = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
] as const;

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-foreground">
      {children}
    </p>
  );
}

function FooterNav({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav className="mt-token-3 flex flex-col gap-token-2 text-sm text-muted-foreground">
      {links.map((l) => (
        <Link
          key={l.href + l.label}
          href={l.href}
          className="transition hover:text-foreground"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Marketplace / platform pages footer — multi-column, token surfaces. */
export function PlatformFooter() {
  const appName = useAppName();
  const year = new Date().getFullYear();

  return (
    <footer className="mt-token-8 border-t border-border bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-token-6 py-token-8 sm:py-token-10">
        <div className="grid gap-token-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-token-10">
          <div className="space-y-token-4 sm:col-span-2 lg:col-span-1">
            <BrandMark />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {appName} is a marketplace for independent shops — branded
              storefronts, real checkout, and tools sized for small teams.
            </p>
          </div>

          <div>
            <FooterHeading>Useful links</FooterHeading>
            <FooterNav links={PLATFORM_USEFUL} />
          </div>

          <div>
            <FooterHeading>Buying help</FooterHeading>
            <FooterNav links={PLATFORM_BUYING} />
          </div>

          <div className="space-y-token-6">
            <div>
              <FooterHeading>Payments</FooterHeading>
              <p className="mt-token-3 text-sm text-muted-foreground">
                Secure checkout at each shop. Cards and local payment methods
                where available.
              </p>
            </div>
            <div>
              <FooterHeading>Legal</FooterHeading>
              <FooterNav links={PLATFORM_LEGAL} />
            </div>
          </div>
        </div>

        <p className="mt-token-8 border-t border-border pt-token-6 text-sm text-muted-foreground">
          © {year} {appName}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/** Individual shop storefront footer — branding accents only, token surfaces. */
export function ShopFooter({
  shopName,
  slug,
  accentColor,
  logoUrl,
  phone,
  email,
  address,
  socialLinks,
  platformName = "Marketplace",
  aboutText,
}: ShopFooterProps) {
  const accent = accentColor || undefined;
  const year = new Date().getFullYear();
  const base = `/shops/${slug}`;

  const storeLinks = [
    { href: base, label: "Home" },
    { href: `${base}/contact`, label: "About" },
    { href: `${base}#products`, label: "Shop" },
    { href: "/buyer/favorites", label: "Favorites" },
    { href: `/login?returnTo=${encodeURIComponent(base)}`, label: "Login" },
    { href: "/signup", label: "Register" },
  ];

  const helpLinks = [
    { href: `${base}/faq`, label: "FAQs" },
    { href: `${base}/contact`, label: "Contact Us" },
    { href: `${base}/terms`, label: "Terms" },
    { href: `${base}/privacy`, label: "Privacy Policy" },
  ];

  const socials = SOCIAL_META.filter((s) => {
    const v = socialLinks?.[s.key];
    return typeof v === "string" && v.trim().length > 0;
  });

  return (
    <footer
      className="mt-token-8 border-t border-border bg-muted/40"
      style={accent ? { borderTopColor: accent } : undefined}
    >
      <div className="mx-auto w-full max-w-6xl px-token-6 py-token-8 sm:py-token-10">
        <div className="grid gap-token-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-token-10">
          <div className="space-y-token-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-token-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-md border border-border object-cover"
                />
              ) : (
                <ShopLogoFallback />
              )}
              <p className="font-display text-lg text-foreground">{shopName}</p>
            </div>
            {aboutText?.trim() && (
              <p className="text-sm leading-relaxed text-muted-foreground">
                {aboutText.trim()}
              </p>
            )}
            {(address || phone || email) && (
              <ul className="space-y-token-2 text-sm text-muted-foreground">
                {address && <li className="whitespace-pre-line">{address}</li>}
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="transition hover:text-foreground"
                    >
                      {email}
                    </a>
                  </li>
                )}
                {phone && (
                  <li>
                    <a
                      href={`tel:${phone}`}
                      className="transition hover:text-foreground"
                    >
                      {phone}
                    </a>
                  </li>
                )}
              </ul>
            )}
          </div>

          <div>
            <FooterHeading>Store</FooterHeading>
            <FooterNav links={storeLinks} />
          </div>

          <div className="space-y-token-6">
            <div>
              <FooterHeading>Buying help</FooterHeading>
              <FooterNav links={helpLinks} />
            </div>
            <div>
              <FooterHeading>Payments</FooterHeading>
              <p className="mt-token-3 text-sm leading-relaxed text-muted-foreground">
                Pay securely at checkout. Accepted methods depend on this shop’s
                settings.
              </p>
            </div>
          </div>

          <div>
            <FooterHeading>Social</FooterHeading>
            {socials.length > 0 ? (
              <div className="mt-token-3 flex flex-wrap gap-token-2">
                {socials.map(({ key, label }) => (
                  <a
                    key={key}
                    href={socialHref(key, socialLinks![key]!.trim())}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:border-foreground/20 hover:text-foreground"
                  >
                    <SocialGlyph name={key} />
                  </a>
                ))}
              </div>
            ) : (
              <p className="mt-token-3 text-sm text-muted-foreground">
                Follow links will appear here when the shop adds them.
              </p>
            )}
          </div>
        </div>

        <p className="mt-token-8 border-t border-border pt-token-6 text-sm text-muted-foreground">
          {shopName} © {year}. Powered by {platformName}.
        </p>
      </div>
    </footer>
  );
}
