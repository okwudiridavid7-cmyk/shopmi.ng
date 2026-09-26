"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { SocialLinks } from "@vendors/shared-types";
import { useAppName, usePlatformBranding } from "@/hooks/use-branding";
import { BrandMark } from "@/components/brand-mark";
import { ShopLogoFallback } from "@/components/shop-logo-fallback";
import { useToast } from "@/components/ui/toast";

export type ShopFooterProps = {
  shopName: string;
  slug: string;
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

const PLATFORM_PRODUCT = [
  { href: "/explore", label: "Marketplace" },
  { href: "/pricing", label: "Pricing" },
  { href: "/signup", label: "Create account" },
  { href: "/onboarding", label: "Start selling" },
  { href: "/cart", label: "Cart" },
  { href: "/buyer/favorites", label: "Favorites" },
] as const;

const PLATFORM_RESOURCES = [
  { href: "/faq", label: "FAQs" },
  { href: "/support", label: "Support" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
] as const;

const PLATFORM_COMPANY = [
  { href: "/about", label: "About" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/buyer/orders", label: "Your orders" },
  { href: "/login", label: "Sign in" },
] as const;

/** Always-dark footer shell — independent of page theme. */
const FOOTER_SHELL =
  "mt-auto border-t border-white/10 bg-[#0a0a0b] text-zinc-100";

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-semibold text-white">{children}</p>
  );
}

function FooterNav({
  links,
}: {
  links: readonly { href: string; label: string }[];
}) {
  return (
    <nav className="mt-4 flex flex-col gap-2.5 text-sm text-zinc-400">
      {links.map((l) => (
        <Link
          key={l.href + l.label}
          href={l.href}
          className="transition hover:text-white"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

function NewsletterBlock({ appName }: { appName: string }) {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    window.setTimeout(() => {
      setBusy(false);
      setEmail("");
      toast({
        title: "You're on the list",
        description: "We'll send product updates — no spam.",
        tone: "success",
      });
    }, 400);
  }

  return (
    <div className="space-y-4 sm:col-span-2 lg:col-span-2">
      <BrandMark inverted className="brightness-110" />
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          Ship faster with our newsletter
        </h2>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
          Product updates, new seller tools, and marketplace notes from{" "}
          {appName}. One email a week, no spam.
        </p>
      </div>
      <form
        onSubmit={onSubmit}
        noValidate
        className="grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]"
      >
        <label className="sr-only" htmlFor="footer-newsletter-email">
          Email for newsletter
        </label>
        <input
          id="footer-newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          inputMode="email"
          className="box-border h-11 w-full min-w-0 rounded-lg border border-white/20 bg-white/10 px-3.5 text-base text-white placeholder:text-zinc-400 outline-none transition focus:border-white/40 focus:ring-2 focus:ring-white/15 sm:text-sm"
        />
        <button
          type="submit"
          disabled={busy}
          className="box-border inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-white px-5 text-sm font-semibold text-zinc-950 transition hover:bg-zinc-200 disabled:opacity-60 sm:w-auto sm:min-w-[7.5rem]"
        >
          {busy ? "…" : "Subscribe"}
          <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
        </button>
      </form>
      <p className="text-xs text-zinc-500">
        By subscribing you agree to our{" "}
        <Link href="/privacy" className="text-zinc-300 transition hover:text-white">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}

function SocialSquare({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-zinc-400 transition hover:border-white/30 hover:text-white"
    >
      {children}
    </a>
  );
}

/** Marketplace / platform pages footer. */
export function PlatformFooter() {
  const appName = useAppName();
  const year = new Date().getFullYear();
  const branding = usePlatformBranding().data;
  const billingEnabled = branding?.billingEnabled !== false;

  const productLinks = PLATFORM_PRODUCT.filter(
    (l) => billingEnabled || l.href !== "/pricing"
  );

  return (
    <footer className={FOOTER_SHELL}>
      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          <NewsletterBlock appName={appName} />

          <div>
            <FooterHeading>Product</FooterHeading>
            <FooterNav links={productLinks} />
          </div>

          <div>
            <FooterHeading>Resources</FooterHeading>
            <FooterNav links={PLATFORM_RESOURCES} />
          </div>

          <div>
            <FooterHeading>Company</FooterHeading>
            <FooterNav links={PLATFORM_COMPANY} />
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-500">
            © {year} {appName}. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-2">
            <SocialSquare href="https://github.com" label="GitHub">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M12 2C6.477 2 2 6.486 2 12.021c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.009-.866-.014-1.7-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.467-1.11-1.467-.908-.62.069-.608.069-.608 1.003.071 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.339-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.56 9.56 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0 0 22 12.021C22 6.486 17.523 2 12 2z" />
              </svg>
            </SocialSquare>
            <SocialSquare href="https://x.com" label="X">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.727-8.835L1.254 2.25H8.08l4.253 5.622L18.244 2.25zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77z" />
              </svg>
            </SocialSquare>
            <SocialSquare href="https://linkedin.com" label="LinkedIn">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </SocialSquare>
            <SocialSquare href="https://youtube.com" label="YouTube">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z" />
              </svg>
            </SocialSquare>
          </div>
        </div>
      </div>
    </footer>
  );
}

/** Individual shop storefront footer — always dark, shop-branded. */
export function ShopFooter({
  shopName,
  slug,
  logoUrl,
  phone,
  email,
  address,
  socialLinks,
  platformName = "Marketplace",
  aboutText,
}: ShopFooterProps) {
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
    <footer className={FOOTER_SHELL}>
      <div className="mx-auto w-full max-w-6xl px-6 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          <div className="space-y-4 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="h-10 w-10 rounded-lg border border-white/15 object-cover"
                />
              ) : (
                <span className="rounded-lg border border-white/15 p-1.5">
                  <ShopLogoFallback />
                </span>
              )}
              <p className="font-display text-lg text-white">{shopName}</p>
            </div>
            {aboutText?.trim() ? (
              <p className="text-sm leading-relaxed text-zinc-400">
                {aboutText.trim()}
              </p>
            ) : (
              <p className="text-sm leading-relaxed text-zinc-400">
                Independent shop on {platformName}. Secure checkout, clear
                policies, and real fulfillment.
              </p>
            )}
            {(address || phone || email) && (
              <ul className="space-y-2 text-sm text-zinc-400">
                {address && <li className="whitespace-pre-line">{address}</li>}
                {email && (
                  <li>
                    <a
                      href={`mailto:${email}`}
                      className="transition hover:text-white"
                    >
                      {email}
                    </a>
                  </li>
                )}
                {phone && (
                  <li>
                    <a
                      href={`tel:${phone}`}
                      className="transition hover:text-white"
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

          <div>
            <FooterHeading>Buying help</FooterHeading>
            <FooterNav links={helpLinks} />
          </div>

          <div>
            <FooterHeading>Social</FooterHeading>
            {socials.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {socials.map(({ key, label }) => (
                  <SocialSquare
                    key={key}
                    href={socialHref(key, socialLinks![key]!.trim())}
                    label={label}
                  >
                    <SocialGlyph name={key} />
                  </SocialSquare>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-zinc-500">
                Social links appear when this shop adds them.
              </p>
            )}
            <p className="mt-6 text-sm text-zinc-500">
              Pay securely at checkout. Accepted methods depend on this shop’s
              settings.
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-6 sm:flex-row sm:items-center">
          <p className="text-sm text-zinc-500">
            {shopName} © {year}. Powered by {platformName}.
          </p>
        </div>
      </div>
    </footer>
  );
}
