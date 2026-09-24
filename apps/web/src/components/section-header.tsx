type SectionHeaderProps = {
  title: string;
  description?: string;
  className?: string;
  actions?: React.ReactNode;
};

/** Shared marketplace section header — display title + optional muted line. */
export function SectionHeader({
  title,
  description,
  className = "",
  actions,
}: SectionHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-token-3 ${className}`}
    >
      <div className="min-w-0 space-y-token-1">
        <h2 className="font-display text-xl text-foreground sm:text-2xl">
          {title}
        </h2>
        {description ? (
          <p className="text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </div>
  );
}
