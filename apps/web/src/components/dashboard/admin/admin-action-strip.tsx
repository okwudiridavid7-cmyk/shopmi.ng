import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export type AdminAction = {
  href: string;
  label: string;
  icon: LucideIcon;
  variant?: "primary" | "outline" | "secondary";
};

export function AdminActionStrip({ actions }: { actions: AdminAction[] }) {
  return (
    <section className="rounded-xl border border-border bg-card shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Quick actions</h2>
      </div>
      <ul className="grid gap-1 p-2 sm:grid-cols-2 lg:grid-cols-5">
        {actions.map((action) => {
          const Icon = action.icon;
          const primary = action.variant === "primary";
          return (
            <li key={action.href}>
              <Link
                href={action.href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition ${
                  primary
                    ? "bg-accent font-medium text-accent-foreground hover:opacity-95"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{action.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
