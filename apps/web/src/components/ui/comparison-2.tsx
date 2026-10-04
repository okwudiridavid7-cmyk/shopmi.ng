import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export type ComparisonColumn = {
  title: string;
  description: string;
  points: string[];
  /** "cross" lists drawbacks instead of benefits. */
  kind?: "check" | "cross";
  featured?: boolean;
  badge?: string;
  cta?: { label: string; href: string };
  link?: { label: string; href: string };
};

function CheckRow({ text, featured }: { text: string; featured: boolean }) {
  return (
    <li className="flex items-start gap-3">
      <span
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px]",
          featured ? "bg-accent-strong text-white" : "bg-foreground text-background"
        )}
      >
        <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
      </span>
      <span className="text-sm text-foreground">{text}</span>
    </li>
  );
}

function CrossRow({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] bg-muted">
        <X className="h-3 w-3 text-muted-foreground" strokeWidth={3} aria-hidden />
      </span>
      <span className="text-sm text-muted-foreground">{text}</span>
    </li>
  );
}

function ColumnCard({ column }: { column: ComparisonColumn }) {
  const featured = column.featured === true;
  const cross = column.kind === "cross";
  return (
    <Card
      className={cn(
        "flex flex-col rounded-2xl",
        featured
          ? "border-[color-mix(in_oklab,var(--color-accent)_45%,transparent)] shadow-[0_24px_60px_-30px_rgba(194,83,10,0.45)] ring-1 ring-[color-mix(in_oklab,var(--color-accent)_25%,transparent)]"
          : "bg-[color-mix(in_oklab,var(--color-muted)_45%,var(--color-card))] shadow-none"
      )}
    >
      <CardHeader className="space-y-1.5 border-0 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className={cn("text-lg font-semibold", cross && "text-muted-foreground")}>{column.title}</CardTitle>
          {column.badge ? (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                featured ? "bg-accent-strong text-white" : "border border-border bg-card text-foreground"
              )}
            >
              {column.badge}
            </span>
          ) : null}
        </div>
        <CardDescription className="leading-relaxed">{column.description}</CardDescription>
      </CardHeader>

      <Separator />

      <CardContent className="flex-1 p-6">
        <ul className="flex flex-col gap-3">
          {column.points.map((point) =>
            cross ? <CrossRow key={point} text={point} /> : <CheckRow key={point} text={point} featured={featured} />
          )}
        </ul>
      </CardContent>

      {column.cta || column.link ? (
        <CardFooter className="flex flex-col items-stretch gap-3 px-6 py-5">
          {column.cta ? (
            <Link
              href={column.cta.href}
              className={cn(
                "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition",
                featured
                  ? "bg-accent-strong text-white hover:brightness-90"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              )}
            >
              {column.cta.label}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : null}
          {column.link ? (
            <Link
              href={column.link.href}
              className="text-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              {column.link.label}
            </Link>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
}

export type ComparisonBlockProps = {
  id?: string;
  /** Replaces the default heading block. */
  header?: ReactNode;
  title?: string;
  description?: string;
  columns: [ComparisonColumn, ComparisonColumn];
  className?: string;
};

export default function ComparisonBlock({ id, header, title, description, columns, className }: ComparisonBlockProps) {
  return (
    <section id={id} className={cn("w-full scroll-mt-20 bg-background px-5 py-16 text-foreground sm:px-8 sm:py-24", className)}>
      <div className="mx-auto w-full max-w-4xl">
        {header ?? (
          <div className="mb-10 text-center">
            {title ? <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2> : null}
            {description ? <p className="mt-3 text-sm text-muted-foreground">{description}</p> : null}
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2">
          {columns.map((column) => (
            <ColumnCard key={column.title} column={column} />
          ))}
        </div>
      </div>
    </section>
  );
}
