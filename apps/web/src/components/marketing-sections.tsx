import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** Full-bleed marketing band with optional muted surface. */
export function MarketingSection({
  children,
  muted = false,
  className = "",
  id,
}: {
  children: ReactNode;
  muted?: boolean;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`px-token-4 py-16 sm:px-token-6 sm:py-20 ${
        muted ? "bg-muted/50" : "bg-background"
      } ${className}`}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function MarketingEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
      {children}
    </p>
  );
}

export function MarketingHeading({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={`font-display text-3xl leading-tight text-foreground sm:text-4xl ${className}`}
    >
      {children}
    </h2>
  );
}

export function FeatureCard({
  icon: Icon,
  title,
  body,
}: {
  icon: LucideIcon;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-token-6 shadow-sm transition hover:shadow-md">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-accent-soft text-accent">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <h3 className="mt-token-4 font-display text-lg text-foreground">{title}</h3>
      <p className="mt-token-2 text-sm leading-relaxed text-muted-foreground">
        {body}
      </p>
    </div>
  );
}

export function CheckLine({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-token-3 text-sm text-muted-foreground">
      <span
        className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground"
        aria-hidden
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
