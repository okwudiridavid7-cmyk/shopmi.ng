"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Coffee,
  Crown,
  Gem,
  Heart,
  Home,
  Leaf,
  Package,
  Palette,
  Shirt,
  ShoppingBag,
  Sparkles,
  Star,
  Store,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

const ICON_MAP: Record<string, LucideIcon> = {
  store: Store,
  "shopping-bag": ShoppingBag,
  sparkles: Sparkles,
  heart: Heart,
  star: Star,
  package: Package,
  gem: Gem,
  leaf: Leaf,
  coffee: Coffee,
  home: Home,
  shirt: Shirt,
  zap: Zap,
  crown: Crown,
  truck: Truck,
  palette: Palette,
  "book-open": BookOpen,
};

type Catalog = {
  icons: { id: string; label: string }[];
  fontPairs: { id: string; label: string }[];
  presets: { id: string; color: string; label: string }[];
};

export type LogoBuilderValue = {
  iconId: string;
  color: string;
  fontPairId: string;
};

type Props = {
  shopName: string;
  value: LogoBuilderValue;
  onChange: (v: LogoBuilderValue) => void;
  onGenerated?: (urls: { squareUrl: string; rectUrl: string }) => void;
};

export function LogoBuilder({
  shopName,
  value,
  onChange,
  onGenerated,
}: Props) {
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<{
    squareUrl: string;
    rectUrl: string;
  } | null>(null);

  useEffect(() => {
    apiFetch<Catalog>("/api/seller/tools/logo/catalog")
      .then(setCatalog)
      .catch(() => setCatalog(null));
  }, []);

  const Icon = ICON_MAP[value.iconId] ?? Store;
  const fontLabel =
    catalog?.fontPairs.find((f) => f.id === value.fontPairId)?.label ?? "Modern";

  const previewStyle = useMemo(
    () => ({ backgroundColor: value.color, color: "#f8faf9" }),
    [value.color]
  );

  async function generate(save: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await apiFetch<{
        squareUrl: string;
        rectUrl: string;
        logoUrl: string;
      }>("/api/seller/tools/logo/build", {
        method: "POST",
        body: JSON.stringify({ ...value, saveToTenant: save }),
      });
      setPreviewUrls({ squareUrl: res.squareUrl, rectUrl: res.rectUrl });
      onGenerated?.({ squareUrl: res.squareUrl, rectUrl: res.rectUrl });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Logo build failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-token-6 lg:grid-cols-2">
      <div className="space-y-token-4">
        <div>
          <p className="mb-token-2 text-sm font-medium">Icon</p>
          <div className="grid grid-cols-4 gap-token-2 sm:grid-cols-6">
            {(catalog?.icons ?? [{ id: "store", label: "Store" }]).map(
              (icon) => {
                const Ic = ICON_MAP[icon.id] ?? Store;
                const selected = value.iconId === icon.id;
                return (
                  <button
                    key={icon.id}
                    type="button"
                    title={icon.label}
                    onClick={() => onChange({ ...value, iconId: icon.id })}
                    className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs transition ${
                      selected
                        ? "border-accent bg-accent/10 ring-1 ring-accent"
                        : "border-border hover:border-foreground/30"
                    }`}
                  >
                    <Ic className="h-5 w-5" aria-hidden />
                    <span className="truncate w-full text-center">
                      {icon.label}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>

        <Label>
          <span>Brand color</span>
          <div className="flex flex-wrap items-center gap-token-2">
            <Input
              type="color"
              value={value.color}
              onChange={(e) =>
                onChange({ ...value, color: e.target.value })
              }
              className="h-10 w-14 cursor-pointer p-1"
            />
            <Input
              value={value.color}
              onChange={(e) =>
                onChange({ ...value, color: e.target.value })
              }
              className="max-w-[8rem] font-mono text-sm"
            />
          </div>
        </Label>

        {catalog?.presets && (
          <div className="flex flex-wrap gap-token-2">
            {catalog.presets.map((p) => (
              <button
                key={p.id}
                type="button"
                title={p.label}
                onClick={() => onChange({ ...value, color: p.color })}
                className="h-8 w-8 rounded-md border border-border"
                style={{ backgroundColor: p.color }}
              />
            ))}
          </div>
        )}

        <Label>
          <span>Font pairing</span>
          <select
            className="w-full rounded-md border border-border bg-card px-token-3 py-token-2 text-sm"
            value={value.fontPairId}
            onChange={(e) =>
              onChange({ ...value, fontPairId: e.target.value })
            }
          >
            {(catalog?.fontPairs ?? [{ id: "modern", label: "Modern" }]).map(
              (f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              )
            )}
          </select>
        </Label>

        <div className="flex flex-wrap gap-token-2">
          <Button
            type="button"
            variant="primary"
            disabled={busy}
            onClick={() => void generate(true)}
          >
            {busy ? "Generating…" : "Save logo to shop"}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void generate(false)}
          >
            Preview only
          </Button>
        </div>
        {err && <p className="text-sm text-danger">{err}</p>}
      </div>

      <Card>
        <CardHeader>
          <p className="text-sm font-medium">Live preview</p>
          <p className="text-xs text-muted-foreground">
            Outputs both a square icon (favicon / compact) and a wide lockup
            (header) · {fontLabel}
          </p>
        </CardHeader>
        <CardBody className="space-y-token-4">
          <div className="flex items-center gap-token-4">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-xl shadow-sm"
              style={previewStyle}
            >
              <Icon className="h-10 w-10" strokeWidth={1.75} />
            </div>
            <div
              className="flex min-w-0 flex-1 items-center gap-token-3 rounded-xl px-token-4 py-token-3 shadow-sm"
              style={previewStyle}
            >
              <Icon className="h-8 w-8 shrink-0" strokeWidth={1.75} />
              <span className="truncate font-display text-lg font-semibold">
                {shopName || "Your shop"}
              </span>
            </div>
          </div>
          {previewUrls && (
            <div className="space-y-token-2 border-t border-border pt-token-4">
              <p className="text-xs text-muted-foreground">Generated assets</p>
              <div className="flex flex-wrap gap-token-3">
                <div className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrls.squareUrl}
                    alt=""
                    className="h-16 w-16 rounded-lg border border-border object-cover bg-muted"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">Square</p>
                </div>
                <div className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrls.rectUrl}
                    alt=""
                    className="h-16 max-w-[12rem] rounded-lg border border-border object-contain bg-muted"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Horizontal
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
