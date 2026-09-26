"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Palette } from "lucide-react";
import { BrandPreview } from "@/components/brand-preview";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { TextLink } from "@/components/ui/text-link";
import { apiFetch } from "@/lib/api";
import { uploadSellerFile, useSellerBranding } from "@/hooks/use-seller";
import { checkBrandContrast, parseHexColor } from "@/lib/theme";

export default function SellerBrandingPage() {
  const { data, isLoading, error } = useSellerBranding();
  const qc = useQueryClient();

  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoRectUrl, setLogoRectUrl] = useState<string | null>(null);
  const [primaryColor, setPrimaryColor] = useState("#1a5f4a");
  const [accentColor, setAccentColor] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      setLogoUrl(data.logoUrl);
      setLogoRectUrl(data.logoRectUrl);
      setPrimaryColor(data.primaryColor || "#1a5f4a");
      setAccentColor(data.accentColor || "");
    }
  }, [data]);

  const contrast = useMemo(
    () => checkBrandContrast(primaryColor),
    [primaryColor]
  );

  const previewTheme = useMemo(
    () => ({
      logoUrl,
      logoRectUrl,
      primaryColor: parseHexColor(primaryColor),
      accentColor: parseHexColor(accentColor) || parseHexColor(primaryColor),
    }),
    [logoUrl, logoRectUrl, primaryColor, accentColor]
  );

  async function onSquareFile(file: File | null) {
    if (!file) return;
    setErr(null);
    try {
      const res = await uploadSellerFile(file);
      setLogoUrl(res.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Square logo upload failed");
    }
  }

  async function onRectFile(file: File | null) {
    if (!file) return;
    setErr(null);
    try {
      const res = await uploadSellerFile(file);
      setLogoRectUrl(res.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Wide logo upload failed");
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const primary = parseHexColor(primaryColor);
      const accent = parseHexColor(accentColor);
      if (!primary) {
        throw new Error("Primary brand color must be a valid hex (e.g. #1a5f4a)");
      }
      if (logoRectUrl && !logoUrl) {
        setMsg(
          "Wide logo saved. Add a square icon too for favicon and compact nav — we won’t stretch the wide logo into a square."
        );
      }
      await apiFetch("/api/seller/branding", {
        method: "PATCH",
        body: JSON.stringify({
          logoUrl,
          logoRectUrl,
          primaryColor: primary,
          accentColor: accent,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "branding"] });
      await qc.invalidateQueries({ queryKey: ["seller", "shop"] });
      setMsg((m) =>
        m?.includes("Wide logo")
          ? m
          : "Branding saved — your shop header and accents will update on the storefront."
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn’t save branding");
    } finally {
      setBusy(false);
    }
  }

  if (isLoading && !data) {
    return <SkeletonLines count={4} />;
  }

  if (error && !data) {
    return (
      <QueryErrorState
        error={error}
        onRetry={() => {
          void qc.invalidateQueries({ queryKey: ["seller", "branding"] });
        }}
      />
    );
  }

  const shopName = data?.shopName ?? "Your shop";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Branding"
        description={
          <>
            Upload a square icon and optional wide lockup. Colors apply to your
            shop header, CTAs, and accents — never as a full-page background.
            Prefer the{" "}
            <TextLink href="/seller/website?tab=branding">
              Website → Branding
            </TextLink>{" "}
            logo builder if you don’t have files yet.
          </>
        }
        icon={Palette}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Brand settings
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={save} className="space-y-6">
              <div className="space-y-3">
                <Label>
                  <span>Square icon</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Favicon and compact logo (1:1). Used with your shop name when
                    no wide logo is set.
                  </span>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2"
                    onChange={(e) =>
                      void onSquareFile(e.target.files?.[0] ?? null)
                    }
                  />
                </Label>
                {logoUrl && (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoUrl}
                      alt=""
                      className="h-14 w-14 rounded-md border border-border object-cover"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoUrl(null)}
                    >
                      Remove square
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>
                  <span>Wide / rectangular logo</span>
                  <span className="mt-1 block text-xs font-normal text-muted-foreground">
                    Header lockup where space allows. We never crop this into a
                    square — upload a separate icon for that.
                  </span>
                  <Input
                    type="file"
                    accept="image/*"
                    className="mt-2"
                    onChange={(e) =>
                      void onRectFile(e.target.files?.[0] ?? null)
                    }
                  />
                </Label>
                {logoRectUrl && (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={logoRectUrl}
                      alt=""
                      className="h-10 max-w-[12rem] rounded-md border border-border object-contain"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setLogoRectUrl(null)}
                    >
                      Remove wide
                    </Button>
                  </div>
                )}
                {logoRectUrl && !logoUrl && (
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Add a square icon for favicon use — stretching the wide logo
                    would look wrong.
                  </p>
                )}
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Label>
                  <span>Primary brand color</span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={parseHexColor(primaryColor) ?? "#1a5f4a"}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-md border border-border bg-card"
                      aria-label="Primary color picker"
                    />
                    <Input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="#1a5f4a"
                    />
                  </div>
                </Label>

                <Label>
                  <span>Secondary / accent (optional)</span>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={
                        parseHexColor(accentColor) ??
                        parseHexColor(primaryColor) ??
                        "#1a5f4a"
                      }
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-14 cursor-pointer rounded-md border border-border bg-card"
                      aria-label="Accent color picker"
                    />
                    <Input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="Same as primary if empty"
                    />
                  </div>
                </Label>
              </div>

              {!contrast.ok && contrast.warning && (
                <div
                  role="alert"
                  className="rounded-xl border border-warning/40 bg-warning-muted px-3 py-2 text-sm text-warning"
                >
                  {contrast.warning} Preview uses{" "}
                  <strong>{contrast.suggestedTextColor}</strong> on buttons so
                  they stay readable.
                </div>
              )}

              {err && (
                <p className="text-sm text-red-700 dark:text-red-400">{err}</p>
              )}
              {msg && (
                <p className="text-sm text-emerald-700 dark:text-emerald-400">
                  {msg}
                </p>
              )}

              <Button type="submit" disabled={busy} variant="primary">
                {busy ? "Saving…" : "Save branding"}
              </Button>
            </form>
          </CardBody>
        </Card>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-foreground">Live preview</p>
          <p className="text-xs text-muted-foreground">
            Header bar and buttons use your brand color. Page background and body
            text keep the platform defaults.
          </p>
          <BrandPreview shopName={shopName} theme={previewTheme} />
        </div>
      </div>
    </div>
  );
}
