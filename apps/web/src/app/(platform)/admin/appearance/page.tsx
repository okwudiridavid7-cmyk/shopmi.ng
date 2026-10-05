"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Palette as PaletteIcon, RotateCcw, Save } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { useAdminSettings, useSaveAdminSettings } from "@/hooks/use-admin";
import {
  DEFAULT_PALETTE,
  PALETTE_PRESETS,
  PALETTE_SETTING_KEY,
  derivePalette,
  isHex,
  matchPreset,
  paletteIssues,
  parsePalette,
  type PaletteColors,
  type PaletteIssue,
} from "@/lib/palette";
import { cn } from "@/lib/utils";
import { refreshPlatformPalette } from "./actions";

const FIELDS: { key: keyof PaletteColors; label: string; hint: string }[] = [
  { key: "primary", label: "Primary", hint: "Sidebar, highlight cards, dark buttons and chart bars." },
  { key: "secondary", label: "Secondary", hint: "Soft background behind dashboard cards and muted sections." },
  { key: "text", label: "Text", hint: "Headings and body copy on light backgrounds." },
  { key: "accent", label: "Accent", hint: "Main buttons, active menu items, links and highlights." },
];

const sameColors = (a: PaletteColors, b: PaletteColors) =>
  FIELDS.every(({ key }) => a[key].toLowerCase() === b[key].toLowerCase());

function colorsOf(p: PaletteColors): PaletteColors {
  return { primary: p.primary, secondary: p.secondary, text: p.text, accent: p.accent };
}

function ColorField({
  label,
  hint,
  value,
  issues,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  issues: PaletteIssue[];
  onChange: (hex: string) => void;
}) {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const id = `palette-${label.toLowerCase()}`;

  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={`${label} colour picker`}
          value={value}
          onChange={(e) => onChange(e.target.value.toLowerCase())}
          className="h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-border bg-card p-1 [&::-moz-color-swatch]:rounded-lg [&::-moz-color-swatch]:border-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-lg [&::-webkit-color-swatch]:border-0"
        />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="text-sm font-semibold text-foreground">
            {label}
          </label>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Input
          id={id}
          value={text}
          spellCheck={false}
          maxLength={7}
          onChange={(e) => {
            const next = e.target.value.trim();
            setText(next);
            const hex = next.startsWith("#") ? next : `#${next}`;
            if (isHex(hex)) onChange(hex.toLowerCase());
          }}
          onBlur={() => setText(value)}
          className="w-[6.5rem] shrink-0 font-mono text-sm uppercase"
        />
      </div>
      {issues.map((issue) => (
        <p
          key={issue.message}
          className={cn(
            "mt-2 flex items-start gap-1.5 text-xs",
            issue.blocking ? "text-danger" : "text-warning"
          )}
        >
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
          {issue.message}
        </p>
      ))}
    </div>
  );
}

/** Small dashboard and call-to-action mock drawn with the draft colours. */
function PalettePreview({ colors }: { colors: PaletteColors }) {
  const d = derivePalette(colors);
  const bars = [52, 70, 44, 82, 58, 76, 64, 90];

  return (
    <div className="space-y-4">
      <div
        className="flex overflow-hidden rounded-2xl border border-border"
        style={{ background: d.secondary, color: d.text }}
      >
        <div className="hidden w-40 shrink-0 flex-col gap-1 p-3 sm:flex" style={{ background: d.primary }}>
          <p className="mb-3 flex items-center gap-1.5 px-2 pt-1 text-sm font-bold text-white">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: d.accentOnDark }} />
            Shopmi.ng
          </p>
          {["Dashboard", "Orders", "Products", "Customers"].map((item, i) => (
            <span
              key={item}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs",
                i === 0 ? "bg-white/10 font-semibold text-white" : "text-white/60"
              )}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: i === 0 ? d.accentOnDark : "rgb(255 255 255 / 0.3)" }}
              />
              {item}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1 space-y-3 p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-base font-bold">Dashboard</p>
              <p className="text-[11px] opacity-60">Sales at a glance</p>
            </div>
            <span
              className="rounded-full px-3 py-1.5 text-[11px] font-semibold"
              style={{ background: d.accent, color: d.accentForeground }}
            >
              + Create
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl p-3.5 text-white" style={{ background: d.primary }}>
              <span className="inline-block rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                Update
              </span>
              <p className="mt-2 text-sm font-semibold leading-snug">Sales up 40% this week</p>
              <p className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold" style={{ color: d.accentOnDark }}>
                See statistics <ArrowRight className="h-3 w-3" aria-hidden />
              </p>
            </div>
            <div className="rounded-xl bg-white p-3.5">
              <p className="text-[11px] opacity-60">Net income</p>
              <p className="mt-1 text-lg font-bold">₦196,000</p>
              <p className="text-[11px] font-medium" style={{ color: d.accentStrong }}>
                View all orders
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-white p-3.5">
            <p className="text-[11px] font-semibold">Revenue</p>
            <div className="mt-3 flex h-20 items-end gap-2">
              {bars.map((h, i) => (
                <span
                  key={i}
                  className="flex-1 rounded-t-md"
                  style={{ height: `${h}%`, background: i === bars.length - 1 ? d.accent : d.primary }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-2xl px-5 py-4" style={{ background: d.accent }}>
        <p className="text-sm font-bold" style={{ color: d.accentInk }}>
          Ready when you are.
        </p>
        <span className="rounded-full bg-[#141414] px-3.5 py-1.5 text-[11px] font-semibold text-white">
          Create your shop
        </span>
      </div>
    </div>
  );
}

export default function AdminAppearancePage() {
  const { data: settings, isLoading, error } = useAdminSettings();
  const save = useSaveAdminSettings();
  const { toast } = useToast();
  const router = useRouter();
  const [refreshing, startRefresh] = useTransition();

  const saved = useMemo<PaletteColors>(() => {
    const raw = settings?.find((s) => s.key === PALETTE_SETTING_KEY)?.value;
    return colorsOf(parsePalette(raw ?? null) ?? DEFAULT_PALETTE);
  }, [settings]);

  const [draft, setDraft] = useState<PaletteColors>(colorsOf(DEFAULT_PALETTE));
  useEffect(() => setDraft(saved), [saved]);

  const preset = matchPreset(draft);
  const issues = paletteIssues(draft);
  const blocked = issues.some((i) => i.blocking);
  const dirty = !sameColors(draft, saved);
  const busy = save.isPending || refreshing;

  async function onSave() {
    try {
      await save.mutateAsync([{ key: PALETTE_SETTING_KEY, value: JSON.stringify(draft) }]);
      await refreshPlatformPalette();
      startRefresh(() => router.refresh());
      const name = PALETTE_PRESETS.find((p) => p.id === preset)?.name ?? "your custom palette";
      toast({ title: "Palette saved", description: `Shopmi.ng now uses ${name}.`, tone: "success" });
    } catch (err) {
      toast({
        title: "Save failed",
        description: err instanceof Error ? err.message : "Please try again.",
        tone: "danger",
      });
    }
  }

  if (error && !settings) return <QueryErrorState error={error} sellerHomeHref="/admin" />;
  if (isLoading && !settings) return <SkeletonLines count={5} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Appearance"
        icon={PaletteIcon}
        description="Colours for the Shopmi.ng site and every dashboard. Seller storefronts keep their own brand colours."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="space-y-6">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Palettes</p>
              <p className="text-xs text-muted-foreground">Start from a preset, then fine-tune the colours below.</p>
            </CardHeader>
            <CardBody>
              <div className="grid gap-3 sm:grid-cols-2">
                {PALETTE_PRESETS.map((p) => {
                  const active = preset === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDraft({ ...p.colors })}
                      aria-pressed={active}
                      className={cn(
                        "group rounded-xl border bg-card p-3 text-left transition hover:border-[color-mix(in_oklab,var(--color-foreground)_30%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        active ? "border-transparent ring-2 ring-accent" : "border-border"
                      )}
                    >
                      <span className="flex h-12 overflow-hidden rounded-lg" aria-hidden>
                        <span className="w-2/5" style={{ background: p.colors.primary }} />
                        <span className="flex-1" style={{ background: p.colors.secondary }} />
                        <span className="w-1/5" style={{ background: p.colors.accent }} />
                      </span>
                      <span className="mt-2.5 flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{p.name}</span>
                        {active ? <Check className="h-4 w-4 text-accent-strong" aria-hidden /> : null}
                      </span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">{p.description}</span>
                    </button>
                  );
                })}
              </div>
            </CardBody>
          </Card>

          <Card className="overflow-hidden rounded-2xl">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-foreground">Colours</p>
                <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {PALETTE_PRESETS.find((p) => p.id === preset)?.name ?? "Custom"}
                </span>
              </div>
            </CardHeader>
            <CardBody>
              <div className="divide-y divide-border">
                {FIELDS.map((f) => (
                  <ColorField
                    key={f.key}
                    label={f.label}
                    hint={f.hint}
                    value={draft[f.key]}
                    issues={issues.filter((i) => i.field === f.key)}
                    onChange={(hex) => setDraft((d) => ({ ...d, [f.key]: hex }))}
                  />
                ))}
              </div>
              <p className="mt-5 text-xs leading-relaxed text-muted-foreground">
                Button text, hover shades and dark mode colours are worked out from these automatically so text stays readable.
              </p>
            </CardBody>
          </Card>

          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => void onSave()} disabled={!dirty || blocked || busy}>
              <Save className="h-4 w-4" aria-hidden />
              {busy ? "Saving…" : "Save palette"}
            </Button>
            {dirty ? (
              <Button variant="ghost" onClick={() => setDraft(saved)} disabled={busy}>
                Discard changes
              </Button>
            ) : null}
            {preset !== "tangerine" ? (
              <Button variant="outline" onClick={() => setDraft(colorsOf(DEFAULT_PALETTE))} disabled={busy}>
                <RotateCcw className="h-4 w-4" aria-hidden />
                Reset to Tangerine
              </Button>
            ) : null}
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader>
              <p className="text-sm font-semibold text-foreground">Preview</p>
              <p className="text-xs text-muted-foreground">
                {dirty ? "Unsaved changes. Save to apply them across the site." : "This is what the site uses now."}
              </p>
            </CardHeader>
            <CardBody>
              <PalettePreview colors={draft} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
