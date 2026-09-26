export type AdminPeriod = "today" | "week" | "month";

const OPTIONS: { value: AdminPeriod; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
];

type Props = {
  value: AdminPeriod;
  onChange: (value: AdminPeriod) => void;
};

export function AdminPeriodToggle({ value, onChange }: Props) {
  return (
    <div
      className="inline-flex shrink-0 rounded-full border border-border bg-card p-1 shadow-sm"
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
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
              active
                ? "bg-accent text-white"
                : "bg-transparent text-muted-foreground hover:text-foreground"
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
