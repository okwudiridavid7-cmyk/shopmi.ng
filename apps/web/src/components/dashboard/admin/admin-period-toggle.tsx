export type AdminPeriod = "today" | "week" | "month";

const OPTIONS: { value: AdminPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

type Props = {
  value: AdminPeriod;
  onChange: (value: AdminPeriod) => void;
  /** "onInk" for use inside the dark hero card. */
  tone?: "default" | "onInk";
};

export function AdminPeriodToggle({ value, onChange, tone = "default" }: Props) {
  const onInk = tone === "onInk";
  return (
    <div
      className={`inline-flex shrink-0 rounded-full p-1 ${
        onInk
          ? "border border-white/10 bg-white/[0.08]"
          : "border border-border bg-card shadow-sm"
      }`}
      role="group"
      aria-label="Stats period"
    >
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors duration-200 ${
              active
                ? onInk
                  ? "bg-accent text-accent-ink"
                  : "bg-ink text-ink-foreground dark:bg-accent dark:text-accent-ink"
                : onInk
                  ? "text-white/65 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
            }`}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
