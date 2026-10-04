"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Check, ExternalLink, Eye, LayoutTemplate } from "lucide-react";
import type { StoreThemeId } from "@vendors/shared-types";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button, buttonClasses } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextLink } from "@/components/ui/text-link";
import { useToast } from "@/components/ui/toast";
import { useSellerBranding } from "@/hooks/use-seller";
import { apiFetch } from "@/lib/api";
import { buildPublicShopUrl } from "@/lib/shop-url";
import {
  STORE_THEMES,
  THEME_FILTERS,
  THEME_PREVIEW_PARAM,
  storeThemeMeta,
  themePreviewStorageKey,
  type StoreThemeMeta,
} from "@/lib/store-themes";
import { parseStoreThemeId } from "@/lib/theme";

const ALL = "All";

function previewUrl(slug: string, id: StoreThemeId): string {
  return `${buildPublicShopUrl(slug)}?${THEME_PREVIEW_PARAM}=${id}`;
}

function ThemeShot({ theme, className = "" }: { theme: StoreThemeMeta; className?: string }) {
  const [broken, setBroken] = useState(false);
  const [bg, surface, ink, accent] = theme.swatches;
  if (broken) {
    return (
      <div
        className={`flex flex-col gap-2 p-5 ${className}`}
        style={{ background: bg, color: ink }}
        aria-hidden
      >
        <div className="h-3 w-1/3 rounded" style={{ background: ink, opacity: 0.85 }} />
        <div className="h-24 rounded" style={{ background: surface }} />
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-14 rounded" style={{ background: surface }} />
          ))}
        </div>
        <div className="h-3 w-16 rounded" style={{ background: accent }} />
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={theme.preview}
      alt={`${theme.name} theme preview`}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`object-cover object-top ${className}`}
    />
  );
}

function Swatches({ colors }: { colors: readonly string[] }) {
  return (
    <span className="flex -space-x-1" aria-hidden>
      {colors.map((c, i) => (
        <span
          key={`${c}-${i}`}
          className="h-5 w-5 rounded-full border-2 border-card ring-1 ring-border"
          style={{ background: c }}
        />
      ))}
    </span>
  );
}

export default function SellerThemesPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const brandingQ = useSellerBranding();

  const [filter, setFilter] = useState(ALL);
  const [pending, setPending] = useState<StoreThemeMeta | null>(null);
  const [busy, setBusy] = useState(false);

  const slug = brandingQ.data?.slug ?? "";
  const currentId = parseStoreThemeId(brandingQ.data?.storeTheme);
  const current = storeThemeMeta(currentId);

  const tags = [ALL, ...THEME_FILTERS];

  const visible = useMemo(
    () =>
      filter === ALL
        ? STORE_THEMES
        : STORE_THEMES.filter((t) => t.bestFor.includes(filter) || t.bestFor.includes("Any shop")),
    [filter]
  );

  const applyParam = searchParams.get("apply");
  useEffect(() => {
    if (!applyParam || !brandingQ.data) return;
    const id = parseStoreThemeId(applyParam);
    if (id === applyParam && id !== currentId) setPending(storeThemeMeta(id));
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applyParam, brandingQ.data]);

  async function apply(theme: StoreThemeMeta) {
    setBusy(true);
    try {
      await apiFetch("/api/seller/branding", {
        method: "PATCH",
        body: JSON.stringify({ storeTheme: theme.id }),
      });
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["seller", "branding"] }),
        qc.invalidateQueries({ queryKey: ["seller", "shop"] }),
        slug ? qc.invalidateQueries({ queryKey: ["shops", slug] }) : Promise.resolve(),
      ]);
      try {
        sessionStorage.removeItem(themePreviewStorageKey(slug));
      } catch {
        /* storage unavailable */
      }
      toast({ title: `${theme.name} is now live on your store`, tone: "success" });
      setPending(null);
    } catch (e) {
      toast({
        title: "Could not switch theme",
        description: e instanceof Error ? e.message : undefined,
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  if (brandingQ.isLoading) return <SkeletonLines count={6} />;
  if (brandingQ.error) {
    return <QueryErrorState error={brandingQ.error} onRetry={() => void brandingQ.refetch()} />;
  }

  const credited = STORE_THEMES.filter((t) => t.credit);

  return (
    <div className="space-y-token-8">
      <PageHeader
        title="Themes"
        description="Choose how your storefront looks. Preview any theme on your real shop first, then switch with one click."
        icon={LayoutTemplate}
        actions={
          slug ? (
            <a
              href={buildPublicShopUrl(slug)}
              target="_blank"
              rel="noreferrer"
              className={buttonClasses("outline", "md")}
            >
              View store <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          ) : null
        }
      />

      <section className="grid overflow-hidden rounded-lg border border-border bg-card md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="aspect-[16/10] overflow-hidden border-b border-border bg-muted md:aspect-auto md:min-h-[280px] md:border-b-0 md:border-r">
          <ThemeShot theme={current} className="h-full w-full" />
        </div>
        <div className="flex flex-col justify-center gap-token-4 p-token-6">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Live on your store
          </p>
          <div>
            <h2 className="text-2xl font-semibold text-foreground">{current.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{current.description}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Your logo, brand colour, banners, products and pages carry over to every theme. Change
            colours and logo in{" "}
            <TextLink href="/seller/website?tab=branding">Branding</TextLink>, and hero images in{" "}
            <TextLink href="/seller/website?tab=banners">Banners</TextLink>.
          </p>
        </div>
      </section>

      <section className="space-y-token-4">
        <div className="flex flex-wrap items-center justify-between gap-token-3">
          <h2 className="text-lg font-semibold text-foreground">Theme library</h2>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter themes">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setFilter(tag)}
                aria-pressed={filter === tag}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  filter === tag
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card text-muted-foreground hover:text-foreground"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-token-6 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((t) => {
            const isCurrent = t.id === currentId;
            return (
              <article
                key={t.id}
                className={`group flex flex-col overflow-hidden rounded-lg border bg-card transition ${
                  isCurrent ? "border-foreground" : "border-border hover:border-muted-foreground"
                }`}
              >
                <div className="relative aspect-[16/11] overflow-hidden border-b border-border bg-muted">
                  <ThemeShot
                    theme={t}
                    className="h-full w-full transition duration-500 group-hover:scale-[1.02]"
                  />
                  {isCurrent ? (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1 text-xs font-medium text-background">
                      <Check className="h-3.5 w-3.5" aria-hidden /> Current
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-1 flex-col gap-token-3 p-token-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">{t.name}</h3>
                      <p className="text-sm text-muted-foreground">{t.tagline}</p>
                    </div>
                    <Swatches colors={t.swatches} />
                  </div>
                  <p className="text-sm text-muted-foreground">{t.description}</p>
                  <ul className="flex flex-wrap gap-1.5">
                    {t.bestFor.map((tag) => (
                      <li
                        key={tag}
                        className="rounded-sm bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                      >
                        {tag}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto flex gap-token-2 pt-token-2">
                    {slug ? (
                      <a
                        href={previewUrl(slug, t.id)}
                        target="_blank"
                        rel="noreferrer"
                        className={buttonClasses("outline", "md", "flex-1")}
                      >
                        <Eye className="h-4 w-4" aria-hidden /> Preview
                      </a>
                    ) : null}
                    <Button
                      className="flex-1"
                      variant={isCurrent ? "secondary" : "primary"}
                      disabled={isCurrent}
                      onClick={() => setPending(t)}
                    >
                      {isCurrent ? "In use" : "Use theme"}
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-token-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Design credits</p>
        <p className="mt-1">
          These themes are adapted from open-source projects released under the MIT licence:
        </p>
        <ul className="mt-2 space-y-1">
          {credited.map((t) => (
            <li key={t.id}>
              {t.name}: based on{" "}
              <a
                href={t.credit!.url}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {t.credit!.name}
              </a>{" "}
              by {t.credit!.author} ({t.credit!.license})
            </li>
          ))}
        </ul>
      </section>

      <Modal
        open={!!pending}
        onClose={() => (busy ? undefined : setPending(null))}
        title={pending ? `Switch to ${pending.name}?` : undefined}
        footer={
          pending ? (
            <div className="flex flex-wrap justify-end gap-token-2">
              {slug ? (
                <a
                  href={previewUrl(slug, pending.id)}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonClasses("ghost", "md")}
                >
                  Preview first
                </a>
              ) : null}
              <Button variant="outline" onClick={() => setPending(null)} disabled={busy}>
                Cancel
              </Button>
              <Button onClick={() => void apply(pending)} disabled={busy}>
                {busy ? "Switching..." : `Use ${pending.name}`}
              </Button>
            </div>
          ) : null
        }
      >
        <p className="text-sm text-muted-foreground">
          Your storefront switches to the {pending?.name} layout straight away. Products, banners,
          logo, colours and pages stay as they are, and you can switch back at any time.
        </p>
      </Modal>
    </div>
  );
}
