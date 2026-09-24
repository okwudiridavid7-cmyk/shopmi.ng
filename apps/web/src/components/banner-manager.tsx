"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ShopBannerPublic } from "@vendors/shared-types";
import { BannerCarousel } from "@/components/banner-carousel";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { uploadSellerFile } from "@/hooks/use-seller";
import {
  DEFAULT_SHOP_BANNER,
  toBannerSlides,
} from "@/lib/default-banners";

type Draft = {
  id?: string;
  imageUrl: string;
  title: string;
  subtitle: string;
  ctaText: string;
  ctaUrl: string;
  scrollSpeed: number;
  displayOrder: number;
  active: boolean;
};

function emptyDraft(order: number): Draft {
  return {
    imageUrl: "",
    title: "",
    subtitle: "",
    ctaText: "",
    ctaUrl: "",
    scrollSpeed: 5,
    displayOrder: order,
    active: true,
  };
}

function fromBanner(b: ShopBannerPublic): Draft {
  return {
    id: b.id,
    imageUrl: b.imageUrl,
    title: b.title ?? "",
    subtitle: b.subtitle ?? "",
    ctaText: b.ctaText ?? "",
    ctaUrl: b.ctaUrl ?? "",
    scrollSpeed: b.scrollSpeed,
    displayOrder: b.displayOrder,
    active: b.active,
  };
}

export function BannerManager({
  brandColor,
  shopName,
}: {
  brandColor?: string | null;
  shopName?: string;
}) {
  const qc = useQueryClient();
  const bannersQ = useQuery({
    queryKey: ["seller", "banners"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ banners: ShopBannerPublic[] }>(
        "/api/seller/banners"
      );
      return res.banners;
    },
  });

  const banners = bannersQ.data ?? [];
  const [selectedId, setSelectedId] = useState<string | "new" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [useDefaultPreview, setUseDefaultPreview] = useState(false);

  useEffect(() => {
    if (!draft && banners.length > 0 && selectedId === null) {
      setSelectedId(banners[0]!.id);
      setDraft(fromBanner(banners[0]!));
    }
  }, [banners, draft, selectedId]);

  const previewSlides = useMemo(() => {
    if (useDefaultPreview || (banners.length === 0 && !draft?.imageUrl)) {
      return toBannerSlides([
        {
          id: "default",
          ...DEFAULT_SHOP_BANNER,
          title: shopName
            ? `Welcome to ${shopName}`
            : DEFAULT_SHOP_BANNER.title,
        },
      ]);
    }
    // Live preview: merge draft into list
    const list = banners.map((b) => {
      if (draft?.id && b.id === draft.id) {
        return {
          ...b,
          ...draft,
          title: draft.title || null,
          subtitle: draft.subtitle || null,
          ctaText: draft.ctaText || null,
          ctaUrl: draft.ctaUrl || null,
        };
      }
      return b;
    });
    if (draft && !draft.id && draft.imageUrl) {
      list.push({
        id: "preview-new",
        tenantId: "",
        imageUrl: draft.imageUrl,
        title: draft.title || null,
        subtitle: draft.subtitle || null,
        ctaText: draft.ctaText || null,
        ctaUrl: draft.ctaUrl || null,
        scrollSpeed: draft.scrollSpeed,
        displayOrder: draft.displayOrder,
        active: draft.active,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    const active = list.filter((b) => b.active && b.imageUrl);
    if (active.length === 0) {
      return toBannerSlides([
        {
          id: "default",
          ...DEFAULT_SHOP_BANNER,
          title: shopName
            ? `Welcome to ${shopName}`
            : DEFAULT_SHOP_BANNER.title,
        },
      ]);
    }
    return toBannerSlides(
      [...active].sort((a, b) => a.displayOrder - b.displayOrder)
    );
  }, [banners, draft, shopName, useDefaultPreview]);

  function selectBanner(b: ShopBannerPublic) {
    setSelectedId(b.id);
    setDraft(fromBanner(b));
    setUseDefaultPreview(false);
    setMsg(null);
    setErr(null);
  }

  function startNew() {
    setSelectedId("new");
    setDraft(emptyDraft(banners.length));
    setUseDefaultPreview(false);
    setMsg(null);
    setErr(null);
  }

  async function onUpload(file: File | null) {
    if (!file || !draft) return;
    try {
      const res = await uploadSellerFile(file);
      setDraft({ ...draft, imageUrl: res.url });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    }
  }

  async function save() {
    if (!draft) return;
    if (!draft.imageUrl) {
      setErr("Upload a banner image first");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const body = {
        imageUrl: draft.imageUrl,
        title: draft.title || null,
        subtitle: draft.subtitle || null,
        ctaText: draft.ctaText || null,
        ctaUrl: draft.ctaUrl || null,
        scrollSpeed: draft.scrollSpeed,
        displayOrder: draft.displayOrder,
        active: draft.active,
      };
      if (draft.id) {
        await apiFetch(`/api/seller/banners/${draft.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        setMsg("Banner updated");
      } else {
        const res = await apiFetch<{ banner: ShopBannerPublic }>(
          "/api/seller/banners",
          { method: "POST", body: JSON.stringify(body) }
        );
        setSelectedId(res.banner.id);
        setDraft(fromBanner(res.banner));
        setMsg("Banner created");
      }
      await qc.invalidateQueries({ queryKey: ["seller", "banners"] });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    if (!confirm("Delete this banner?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/seller/banners/${draft.id}`, { method: "DELETE" });
      setDraft(null);
      setSelectedId(null);
      await qc.invalidateQueries({ queryKey: ["seller", "banners"] });
      setMsg("Banner deleted");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function move(b: ShopBannerPublic, dir: -1 | 1) {
    const sorted = [...banners].sort(
      (a, c) => a.displayOrder - c.displayOrder
    );
    const idx = sorted.findIndex((x) => x.id === b.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      apiFetch(`/api/seller/banners/${b.id}`, {
        method: "PATCH",
        body: JSON.stringify({ displayOrder: swap.displayOrder }),
      }),
      apiFetch(`/api/seller/banners/${swap.id}`, {
        method: "PATCH",
        body: JSON.stringify({ displayOrder: b.displayOrder }),
      }),
    ]);
    await qc.invalidateQueries({ queryKey: ["seller", "banners"] });
  }

  async function applyDefaultBanner() {
    setBusy(true);
    setErr(null);
    try {
      await apiFetch("/api/seller/banners", {
        method: "POST",
        body: JSON.stringify({
          ...DEFAULT_SHOP_BANNER,
          title: shopName
            ? `Welcome to ${shopName}`
            : DEFAULT_SHOP_BANNER.title,
          displayOrder: banners.length,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "banners"] });
      setMsg("Default premium banner added");
      setUseDefaultPreview(false);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to add default");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-token-6">
      <div>
        <h2 className="font-display text-lg">Banners</h2>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Create rotating hero banners for your storefront. Live preview updates
          as you edit.
        </p>
      </div>

      <div>
        <p className="mb-token-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Live preview
        </p>
        <BannerCarousel
          slides={previewSlides}
          brandColor={brandColor}
          compact
        />
      </div>

      <div className="flex flex-wrap gap-token-2">
        <Button type="button" variant="primary" size="sm" onClick={startNew}>
          New banner
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={() => void applyDefaultBanner()}
        >
          Use default premium banner
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setUseDefaultPreview((v) => !v)}
        >
          {useDefaultPreview ? "Preview my banners" : "Preview default only"}
        </Button>
      </div>

      <div className="grid gap-token-6 lg:grid-cols-[14rem_1fr]">
        <Card>
          <CardHeader>
            <p className="text-sm font-medium">Your banners</p>
          </CardHeader>
          <CardBody className="space-y-token-2 p-token-3">
            {banners.length === 0 && (
              <p className="px-token-2 text-xs text-muted-foreground">
                No banners yet — add one or use the default.
              </p>
            )}
            {[...banners]
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((b) => (
                <div
                  key={b.id}
                  className={`flex items-center gap-token-1 rounded-md border px-token-2 py-token-2 text-sm ${
                    selectedId === b.id
                      ? "border-accent bg-accent/10"
                      : "border-border"
                  }`}
                >
                  <button
                    type="button"
                    className="min-w-0 flex-1 truncate text-left"
                    onClick={() => selectBanner(b)}
                  >
                    {b.title || "Untitled"}
                    {!b.active && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        (off)
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    aria-label="Move up"
                    onClick={() => void move(b, -1)}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    aria-label="Move down"
                    onClick={() => void move(b, 1)}
                  >
                    ↓
                  </button>
                </div>
              ))}
          </CardBody>
        </Card>

        {draft ? (
          <Card>
            <CardHeader>
              <p className="text-sm font-medium">
                {draft.id ? "Edit banner" : "New banner"}
              </p>
            </CardHeader>
            <CardBody className="space-y-token-4">
              <Label>
                <span>Image</span>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                />
              </Label>
              {draft.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={draft.imageUrl}
                  alt=""
                  className="h-24 w-full rounded-md object-cover"
                />
              )}
              <Label>
                <span>Title</span>
                <Input
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({ ...draft, title: e.target.value })
                  }
                />
              </Label>
              <Label>
                <span>Subtitle</span>
                <Textarea
                  rows={2}
                  value={draft.subtitle}
                  onChange={(e) =>
                    setDraft({ ...draft, subtitle: e.target.value })
                  }
                />
              </Label>
              <div className="grid gap-token-3 sm:grid-cols-2">
                <Label>
                  <span>CTA text</span>
                  <Input
                    value={draft.ctaText}
                    onChange={(e) =>
                      setDraft({ ...draft, ctaText: e.target.value })
                    }
                  />
                </Label>
                <Label>
                  <span>CTA URL</span>
                  <Input
                    value={draft.ctaUrl}
                    onChange={(e) =>
                      setDraft({ ...draft, ctaUrl: e.target.value })
                    }
                    placeholder="#products or /path"
                  />
                </Label>
              </div>
              <Label>
                <span>Scroll speed (seconds between slides)</span>
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={draft.scrollSpeed}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      scrollSpeed: Number(e.target.value) || 5,
                    })
                  }
                />
              </Label>
              <label className="flex items-center gap-token-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.active}
                  onChange={(e) =>
                    setDraft({ ...draft, active: e.target.checked })
                  }
                />
                Active on storefront
              </label>
              {msg && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  {msg}
                </p>
              )}
              {err && <p className="text-sm text-danger">{err}</p>}
              <div className="flex flex-wrap gap-token-2">
                <Button
                  type="button"
                  variant="primary"
                  disabled={busy}
                  onClick={() => void save()}
                >
                  {busy ? "Saving…" : "Save banner"}
                </Button>
                {draft.id && (
                  <Button
                    type="button"
                    variant="danger"
                    disabled={busy}
                    onClick={() => void remove()}
                  >
                    Delete
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody className="py-token-10 text-center text-sm text-muted-foreground">
              Select a banner or create a new one.
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
