"use client";

import { useEffect, useState } from "react";
import type { CampaignPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";

export function CampaignPopup({ slug }: { slug: string }) {
  const [campaign, setCampaign] = useState<CampaignPublic | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!slug) return;
    const key = `vendors-campaign-seen:${slug}`;
    if (typeof window !== "undefined" && sessionStorage.getItem(key)) {
      return;
    }

    apiFetch<{ campaigns: CampaignPublic[] }>(
      `/api/shops/${slug}/campaigns/active`
    )
      .then((res) => {
        const first = res.campaigns[0];
        if (!first) return;
        setCampaign(first);
        setOpen(true);
        sessionStorage.setItem(key, first.id);
      })
      .catch(() => undefined);
  }, [slug]);

  if (!open || !campaign) return null;

  const { content } = campaign;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="campaign-title"
        className="w-full max-w-md rounded-lg border border-border bg-card p-token-6 shadow-lg animate-in fade-in"
      >
        <h2 id="campaign-title" className="font-display text-2xl">
          {content.headline}
        </h2>
        <p className="mt-3 text-sm text-muted-foreground">{content.body}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          {content.ctaLabel && content.ctaUrl && (
            <a
              href={content.ctaUrl}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              {content.ctaLabel}
            </a>
          )}
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-md border border-border px-4 py-2 text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
