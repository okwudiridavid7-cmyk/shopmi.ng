import Link from "next/link";
import type { AdminOverview } from "@vendors/shared-types";
import { TrustBadge } from "@/components/shell/trust-badge";
import { TextLink } from "@/components/ui/text-link";

type Shop = NonNullable<AdminOverview["recentShops"]>[number];

function statusTone(status: string): {
  label: string;
  className: string;
} {
  const s = status.toLowerCase();
  if (s === "active" || s === "approved") {
    return {
      label: status.replace(/_/g, " "),
      className: "bg-success-muted text-success",
    };
  }
  if (s.includes("pending") || s.includes("review")) {
    return {
      label: status.replace(/_/g, " "),
      className: "bg-warning-muted text-warning",
    };
  }
  if (s.includes("suspend") || s.includes("reject") || s.includes("ban")) {
    return {
      label: status.replace(/_/g, " "),
      className: "bg-danger-muted text-danger",
    };
  }
  return {
    label: status.replace(/_/g, " "),
    className: "bg-muted text-muted-foreground",
  };
}

/** Live shop signups panel — maps recentShops from overview (real data only). */
export function AdminLivePanel({ shops }: { shops: Shop[] | undefined }) {
  const rows = shops ?? [];

  return (
    <section className="flex h-full flex-col rounded-xl border border-border bg-card shadow-sm">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium text-foreground">Live signups</h2>
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-success">
          <span
            className="h-1.5 w-1.5 rounded-full bg-success animate-live-pulse"
            aria-hidden
          />
          Live
        </span>
      </div>

      {!rows.length ? (
        <p className="flex-1 px-4 py-8 text-center text-sm text-muted-foreground">
          New shops will appear here as they onboard.
        </p>
      ) : (
        <ul className="flex-1 divide-y divide-border">
          {rows.slice(0, 8).map((shop) => {
            const tone = statusTone(shop.status);
            return (
              <li key={shop.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Link
                        href={`/admin/tenants/${shop.id}`}
                        className="truncate text-sm font-medium text-foreground transition hover:text-accent"
                      >
                        {shop.name}
                      </Link>
                      <TrustBadge verified={shop.verifiedBadge} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {new Date(shop.createdAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {shop.planName ? ` · ${shop.planName}` : ""}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${tone.className}`}
                  >
                    {tone.label}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="border-t border-border px-4 py-3">
        <TextLink href="/admin/tenants" arrow="right">
          View all shops
        </TextLink>
      </div>
    </section>
  );
}
