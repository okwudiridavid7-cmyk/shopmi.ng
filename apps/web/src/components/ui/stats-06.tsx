import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type StatTone = "blue" | "green" | "amber" | "purple" | "sky";

const TONES: Record<StatTone, { card: string; icon: string }> = {
  blue: {
    card: "border-blue-200 bg-blue-50 dark:border-blue-400/30 dark:bg-blue-500/15",
    icon: "text-blue-500",
  },
  green: {
    card: "border-green-600/30 bg-green-50 dark:border-green-500/30 dark:bg-green-500/15",
    icon: "text-green-600",
  },
  amber: {
    card: "border-amber-600/30 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/15",
    icon: "text-amber-600",
  },
  purple: {
    card: "border-purple-200 bg-purple-50 dark:border-purple-400/30 dark:bg-purple-400/15",
    icon: "text-purple-500",
  },
  sky: {
    card: "border-sky-200 bg-sky-50 dark:border-sky-400/30 dark:bg-sky-400/15",
    icon: "text-sky-500",
  },
};

const labelClass =
  "mt-4 text-lg text-[color-mix(in_oklab,var(--color-foreground)_80%,transparent)] sm:text-xl";

export type StatItem = {
  icon: LucideIcon;
  value: string;
  label: string;
  tone: StatTone;
};

export function StatCard({ icon: Icon, value, label, tone }: StatItem) {
  return (
    <div className={cn("rounded-xl border p-6 py-7", TONES[tone].card)}>
      <Icon className={cn("mb-7 h-10 w-10 stroke-[1.75px]", TONES[tone].icon)} aria-hidden />
      <span className="font-display text-5xl font-semibold tracking-tight text-foreground">{value}</span>
      <p className={labelClass}>{label}</p>
    </div>
  );
}

export type Stats06Props = {
  title?: ReactNode;
  description?: ReactNode;
  header?: ReactNode;
  /** Up to four cards; the tall feature card sits in the third column. */
  items: StatItem[];
  feature: {
    tone: StatTone;
    mark: ReactNode;
    value: ReactNode;
    label: string;
    children?: ReactNode;
  };
  className?: string;
};

export default function Stats06({ title, description, header, items, feature, className }: Stats06Props) {
  const [first, second, ...rest] = items;
  return (
    <div className={cn("mx-auto max-w-5xl", className)}>
      {header ??
        (title ? (
          <>
            <h2 className="text-balance text-center font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h2>
            {description ? (
              <p className="mt-3.5 text-pretty text-center text-base text-muted-foreground sm:text-lg">
                {description}
              </p>
            ) : null}
          </>
        ) : null)}

      <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {first ? <StatCard {...first} /> : null}
        {second ? <StatCard {...second} /> : null}
        <div
          className={cn(
            "flex flex-col overflow-hidden rounded-xl border p-6 py-7 sm:row-span-2",
            TONES[feature.tone].card
          )}
        >
          <div className="mb-7 flex h-10 items-center">{feature.mark}</div>
          <span className="font-display text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {feature.value}
          </span>
          <p className={cn(labelClass, "mb-2")}>{feature.label}</p>
          {feature.children ? <div className="mt-auto pt-6">{feature.children}</div> : null}
        </div>
        {rest.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>
    </div>
  );
}
