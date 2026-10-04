import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ChevronDown, type LucideIcon } from "lucide-react";
import { Badge7 } from "@/components/ui/cta69-utils/badge7";
import { cn } from "@/lib/utils";

/* Server-safe marketing primitives shared by Home, /buyers and /sellers. */

export function Section({
  id,
  tone = "plain",
  className,
  children,
}: {
  id?: string;
  tone?: "plain" | "muted";
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn(
        "scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24",
        tone === "muted" ? "bg-muted" : "bg-background",
        className
      )}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.18em] text-accent-strong dark:text-accent-on-dark",
        className
      )}
    >
      {children}
    </p>
  );
}

export function SectionIntro({
  eyebrow,
  title,
  body,
  align = "center",
  className,
  action,
  inverted = false,
}: {
  eyebrow?: string;
  title: ReactNode;
  body?: ReactNode;
  align?: "center" | "left";
  className?: string;
  action?: ReactNode;
  /** Light text for use on a dark band. */
  inverted?: boolean;
}) {
  return (
    <div
      className={cn(
        "max-w-2xl",
        align === "center" ? "mx-auto text-center" : "text-left",
        className
      )}
    >
      {eyebrow ? (
        <Badge7
          label={eyebrow}
          className={
            inverted
              ? "border-white/15 bg-white/5 text-[#ff9a52] shadow-none dark:text-[#ff9a52]"
              : undefined
          }
        />
      ) : null}
      <h2
        className={cn(
          "mt-5 font-display text-3xl font-bold leading-tight tracking-tight sm:text-4xl",
          inverted ? "text-white" : "text-foreground"
        )}
      >
        {title}
      </h2>
      {body ? (
        <p
          className={cn(
            "mt-4 text-base leading-relaxed sm:text-lg",
            inverted ? "text-zinc-400" : "text-muted-foreground"
          )}
        >
          {body}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

const CTA_BASE =
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:active:scale-[0.98]";

const CTA_VARIANTS = {
  primary: "bg-accent-strong text-white shadow-md hover:brightness-90",
  outline:
    "border border-[color-mix(in_oklab,var(--color-foreground)_22%,transparent)] bg-card text-foreground hover:bg-muted",
  dark: "bg-[#141414] text-white hover:bg-black dark:bg-white dark:text-[#141414] dark:hover:bg-zinc-200",
} as const;

export function CtaLink({
  href,
  variant = "primary",
  arrow = false,
  className,
  children,
}: {
  href: string;
  variant?: keyof typeof CTA_VARIANTS;
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={cn(CTA_BASE, CTA_VARIANTS[variant], className)}>
      {children}
      {arrow ? <ArrowRight className="h-4 w-4" aria-hidden /> : null}
    </Link>
  );
}

export type FeatureItem = { icon: LucideIcon; title: string; body: string };

export function FeatureGrid({
  items,
  columns = 3,
}: {
  items: FeatureItem[];
  columns?: 2 | 3 | 4;
}) {
  return (
    <ul
      className={cn(
        "grid gap-4 sm:grid-cols-2",
        columns === 3 && "lg:grid-cols-3",
        columns === 4 && "lg:grid-cols-4"
      )}
    >
      {items.map(({ icon: Icon, title, body }) => (
        <li
          key={title}
          className="rounded-2xl border border-border bg-card p-6 transition hover:border-[color-mix(in_oklab,var(--color-accent)_45%,var(--color-border))]"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[color-mix(in_oklab,var(--color-accent)_14%,transparent)] text-accent-strong dark:text-accent-on-dark">
            <Icon className="h-5 w-5" aria-hidden />
          </span>
          <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</p>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-4 md:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-2xl border border-border bg-card p-6">
          <span className="font-display text-sm font-bold text-accent-strong dark:text-accent-on-dark">
            {String(i + 1).padStart(2, "0")}
          </span>
          <h3 className="mt-3 text-lg font-semibold text-foreground">{s.title}</h3>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export type FaqItem = { q: string; a: string };

/** Native <details> so answers are in the HTML for crawlers and work without JS. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="mx-auto max-w-3xl divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((item) => (
        <details key={item.q} className="group px-5 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-base font-semibold text-foreground [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown
              className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <p className="-mt-1 pb-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
            {item.a}
          </p>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(items: FaqItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({
      "@type": "Question",
      name: i.q,
      acceptedAnswer: { "@type": "Answer", text: i.a },
    })),
  };
}

/** Closing call to action. Warm brand surface so it never merges with the dark footer. */
export function CtaBand({
  title,
  body,
  primary,
  secondary,
}: {
  title: string;
  body: string;
  primary: { href: string; label: string };
  secondary?: { href: string; label: string };
}) {
  return (
    <section className="px-5 pb-16 pt-4 sm:px-8 sm:pb-24">
      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl bg-[#ff822e] px-6 py-14 text-center sm:px-12 sm:py-16">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage:
              "repeating-radial-gradient(circle at 85% 120%, #141414 0px, #141414 1px, transparent 1px, transparent 18px)",
          }}
        />
        <div className="relative">
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-[#141414] sm:text-4xl">
            {title}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[#2b1a0e] sm:text-lg">
            {body}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Link
              href={primary.href}
              className={cn(CTA_BASE, "bg-[#141414] text-white hover:bg-black")}
            >
              {primary.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            {secondary ? (
              <Link
                href={secondary.href}
                className={cn(CTA_BASE, "border border-[#141414]/25 bg-white/70 text-[#141414] hover:bg-white")}
              >
                {secondary.label}
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
