// Adapted from Comparison 2 by Hirael <https://hirael.com/blocks/comparison/comparison-02>
// MIT · Mohammad Shehadeh · https://github.com/MohammadShehadeh/hirael

import type { ReactNode } from "react";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComparisonCell = boolean | string;

export interface ComparisonColumn {
  key: string;
  name: string;
  summary?: string;
  featured?: boolean;
  /** Small label next to the name on the featured column. */
  badge?: string;
  /** Rendered in the footer row under this column. */
  action?: ReactNode;
}

export interface ComparisonRow {
  label: string;
  hint?: string;
  cells: ComparisonCell[];
  /** Larger, bolder values (e.g. price). */
  emphasis?: boolean;
}

const CellValue = ({ value, emphasis }: { value: ComparisonCell; emphasis?: boolean }) => {
  if (typeof value === "string") {
    return (
      <span
        className={cn(
          "text-foreground",
          emphasis ? "text-lg font-bold tracking-tight" : "text-sm font-medium"
        )}
      >
        {value}
      </span>
    );
  }
  return value ? (
    <>
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-success-muted text-success">
        <Check aria-hidden className="size-4" strokeWidth={2.5} />
      </span>
      <span className="sr-only">Yes</span>
    </>
  ) : (
    <>
      <Minus aria-hidden className="size-4 text-muted-foreground/50" />
      <span className="sr-only">No</span>
    </>
  );
};

export function ComparisonTable({
  id,
  eyebrow = "Plan",
  title,
  description,
  caption,
  columns,
  rows,
  className,
}: {
  id?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  caption: string;
  columns: ComparisonColumn[];
  rows: ComparisonRow[];
  className?: string;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  const hasActions = columns.some((c) => c.action);

  return (
    <section
      id={id}
      className={cn("min-w-0 max-w-full scroll-mt-24 bg-background px-4 py-16 sm:py-20", className)}
      aria-labelledby={headingId}
    >
      <div className="mx-auto w-full min-w-0 max-w-5xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2
            id={headingId}
            className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl"
          >
            {title}
          </h2>
          {description ? (
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">{description}</p>
          ) : null}
        </div>

        <div className="relative mt-12 w-full min-w-0 overflow-x-auto">
          <table className="w-full min-w-[46rem] border-collapse text-start">
            <caption className="sr-only">{caption}</caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 w-[28%] border-b-2 border-foreground bg-background p-4 text-start align-bottom"
                >
                  <span className="text-xs font-bold uppercase tracking-[0.14em] text-foreground">
                    {eyebrow}
                  </span>
                </th>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      "border-b-2 border-b-foreground p-4 pt-5 text-start align-bottom",
                      column.featured && "rounded-t-xl border-x border-t border-x-border border-t-border bg-card"
                    )}
                  >
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-display text-xl font-bold tracking-tight text-foreground">
                        {column.name}
                      </span>
                      {column.featured && column.badge ? (
                        <span className="rounded-full bg-accent-strong px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-white">
                          {column.badge}
                        </span>
                      ) : null}
                    </span>
                    {column.summary ? (
                      <span className="mt-1 block text-sm font-normal text-muted-foreground">
                        {column.summary}
                      </span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-t border-border">
                  <th
                    scope="row"
                    className="sticky left-0 z-10 bg-background p-4 text-start align-middle"
                  >
                    <span className="block text-sm font-semibold text-foreground">{row.label}</span>
                    {row.hint ? (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                        {row.hint}
                      </span>
                    ) : null}
                  </th>
                  {row.cells.map((cell, index) => (
                    <td
                      key={columns[index]?.key ?? index}
                      className={cn(
                        "p-4 align-middle",
                        columns[index]?.featured && "border-x border-border bg-card"
                      )}
                    >
                      <span className="flex items-center">
                        <CellValue value={cell} emphasis={row.emphasis} />
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              {hasActions ? (
                <tr className="border-t border-border">
                  <td className="sticky left-0 z-10 bg-background" />
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        "p-4",
                        column.featured &&
                          "rounded-b-xl border-x border-b border-border bg-card"
                      )}
                    >
                      {column.action}
                    </td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export default ComparisonTable;
