"use client";

import { FormEvent, useEffect, useState } from "react";
import type { CampaignPublic } from "@vendors/shared-types";
import { Link2, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { apiFetch } from "@/lib/api";

export default function SellerCampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignPublic[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
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
      setLoadError(null);
    } catch (err) {
      setLoadError(err);
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
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
      setFormError(err instanceof Error ? err.message : "Create failed");
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

  if (!loaded) {
    return <SkeletonLines count={4} />;
  }

  if (loadError) {
    return (
      <QueryErrorState
        error={loadError}
        onRetry={() => {
          void load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Popup campaigns"
        description="On-visit popups for your storefront (once per visitor session)."
        icon={Megaphone}
      />

      {formError && (
        <p className="text-sm text-red-700 dark:text-red-400">{formError}</p>
      )}

      <Card className="max-w-lg overflow-hidden rounded-2xl">
        <CardHeader className="bg-muted/30">
          <p className="text-sm font-semibold text-foreground">New campaign</p>
        </CardHeader>
        <CardBody>
          <form onSubmit={create} className="space-y-4">
            <Label>
              <span>Headline</span>
              <Input
                required
                placeholder="Headline"
                value={form.headline}
                onChange={(e) =>
                  setForm((f) => ({ ...f, headline: e.target.value }))
                }
              />
            </Label>
            <Label>
              <span>Body</span>
              <Textarea
                required
                placeholder="Body"
                value={form.body}
                onChange={(e) =>
                  setForm((f) => ({ ...f, body: e.target.value }))
                }
                rows={3}
              />
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label>
                <span>CTA label</span>
                <Input
                  placeholder="Shop now"
                  value={form.ctaLabel}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaLabel: e.target.value }))
                  }
                />
              </Label>
              <Label>
                <span>CTA URL</span>
                <InputWithIcon
                  icon={<Link2 />}
                  placeholder="https://…"
                  value={form.ctaUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, ctaUrl: e.target.value }))
                  }
                />
              </Label>
            </div>
            <Button type="submit" variant="primary">
              Create popup
            </Button>
          </form>
        </CardBody>
      </Card>

      {campaigns.length === 0 ? (
        <EmptyState
          kind="empty"
          title="No campaigns yet"
          description="Create an on-visit popup to greet shoppers on your storefront."
          icon={Megaphone}
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
          {campaigns.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-foreground">
                  {c.content.headline}
                </p>
                <p className="text-muted-foreground">
                  {c.active ? "Active" : "Inactive"} · {c.triggerRule.type}
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void toggle(c.id, c.active)}
                  className="text-sm font-medium text-accent transition hover:opacity-90"
                >
                  {c.active ? "Deactivate" : "Activate"}
                </button>
                <button
                  type="button"
                  onClick={() => void remove(c.id)}
                  className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
