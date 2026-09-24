"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CampaignPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";

export default function SellerCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignPublic[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    headline: "",
    body: "",
    ctaLabel: "Shop now",
    ctaUrl: "",
  });

  async function load() {
    try {
      const res = await apiFetch<{ campaigns: CampaignPublic[] }>(
        "/api/seller/campaigns"
      );
      setCampaigns(res.campaigns);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    try {
      await apiFetch("/api/seller/campaigns", {
        method: "POST",
        body: JSON.stringify({
          content: {
            headline: form.headline,
            body: form.body,
            ctaLabel: form.ctaLabel || undefined,
            ctaUrl: form.ctaUrl || undefined,
          },
          active: true,
          triggerRule: { type: "on_visit" },
        }),
      });
      setForm({ headline: "", body: "", ctaLabel: "Shop now", ctaUrl: "" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    }
  }

  async function toggle(id: string, active: boolean) {
    await apiFetch(`/api/seller/campaigns/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !active }),
    });
    await load();
  }

  async function remove(id: string) {
    await apiFetch(`/api/seller/campaigns/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-token-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl">Popup campaigns</h2>
          <p className="text-sm text-muted-foreground">
            On-visit popups for your storefront (once per visitor session).
          </p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}

      <form
        onSubmit={create}
        className="max-w-lg space-y-3 rounded-lg border border-border bg-card p-token-4"
      >
        <input
          required
          placeholder="Headline"
          value={form.headline}
          onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <textarea
          required
          placeholder="Body"
          value={form.body}
          onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
          rows={3}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="CTA label"
          value={form.ctaLabel}
          onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <input
          placeholder="CTA URL (optional)"
          value={form.ctaUrl}
          onChange={(e) => setForm((f) => ({ ...f, ctaUrl: e.target.value }))}
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
        >
          Create popup
        </button>
      </form>

      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {campaigns.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
          >
            <div>
              <p className="font-medium">{c.content.headline}</p>
              <p className="text-muted-foreground">
                {c.active ? "Active" : "Inactive"} · {c.triggerRule.type}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => toggle(c.id, c.active)}
                className="text-accent underline"
              >
                {c.active ? "Deactivate" : "Activate"}
              </button>
              <button
                type="button"
                onClick={() => remove(c.id)}
                className="text-muted-foreground underline"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
        {campaigns.length === 0 && (
          <li className="px-4 py-6 text-muted-foreground">No campaigns yet.</li>
        )}
      </ul>
    </div>
  );
}
