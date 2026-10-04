import Image from "next/image";
import Link from "next/link";
import {
  Check,
  Compass,
  Megaphone,
  MessageCircle,
  PenTool,
  Receipt,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import type { PlanPublic } from "@vendors/shared-types";
import { STORE_THEMES } from "@/lib/store-themes";
import { cheapestPaidPlan } from "@/lib/marketing-data";
import { CtaLink, Section, SectionIntro } from "@/components/marketing/blocks";
import { SpatialShowcase, type SpatialItem } from "@/components/ui/spatial-product-showcase";
import { cn } from "@/lib/utils";

/** Glow colour per theme. Runway's own accent is near-black, so it gets a light stone glow on the dark band. */
const THEME_GLOW: Record<string, string> = {
  classic: "#ff822e",
  mono: "#155dfc",
  runway: "#d6cfc4",
  atelier: "#c08a5f",
  bazaar: "#1a56db",
  pop: "#ff5c8a",
};

const SWATCH_LABELS = ["Page", "Surface", "Text", "Accent"] as const;

export function ThemesShowcase({ id = "themes" }: { id?: string }) {
  const items: SpatialItem[] = STORE_THEMES.map((t) => ({
    id: t.id,
    label: t.name,
    title: t.name,
    tagline: t.tagline,
    description: t.description,
    image: t.preview,
    imageAlt: `A Shopmi.ng shop using the ${t.name} theme`,
    accent: THEME_GLOW[t.id] ?? t.defaultBrand,
    details: (
      <div className="space-y-5">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Colour palette</p>
          <ul className="mt-3 grid grid-cols-4 gap-2 sm:gap-3">
            {t.swatches.map((hex, i) => (
              <li key={SWATCH_LABELS[i]} className="min-w-0">
                <span className="block h-11 rounded-lg ring-1 ring-inset ring-white/10" style={{ background: hex }} />
                <span className="mt-2 block truncate text-xs font-medium text-zinc-300">{SWATCH_LABELS[i]}</span>
                <span className="block font-mono text-[10px] uppercase text-zinc-500">{hex}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-zinc-500">The accent switches to your brand colour once you set one.</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Best for</p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {t.bestFor.map((tag) => (
              <li
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-zinc-300"
              >
                {tag}
              </li>
            ))}
          </ul>
        </div>
      </div>
    ),
  }));

  return (
    <section
      id={id}
      className="dark relative scroll-mt-20 overflow-hidden bg-[#0a0a0a] px-5 py-16 text-zinc-100 sm:px-8 sm:py-24"
    >
      <div className="relative mx-auto w-full max-w-6xl">
        <SectionIntro
          inverted
          eyebrow="Storefront themes"
          title={`${STORE_THEMES.length} themes, made for what you sell`}
          body="Every shop runs on a theme. Pick the one that suits your products, add your logo and brand colour, and your storefront is ready to share. Switch any time without touching your products or orders."
        />
        <SpatialShowcase
          className="mt-8 sm:mt-10"
          items={items}
          status="Your shop, one link"
          switcherLabel="Storefront themes"
          footer={
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
              <CtaLink href="/onboarding" arrow>
                Start with any theme
              </CtaLink>
              <p className="text-xs leading-relaxed text-zinc-500 sm:max-w-[15rem]">
                Every theme is included on every plan, with a built-in logo maker.
              </p>
            </div>
          }
        />
      </div>
    </section>
  );
}

type Tool = { name: string; logo?: string };

type ReplaceRowId = "store" | "orders" | "popups" | "ai" | "logo" | "chat" | "discovery";

const REPLACE_ROWS: { id: ReplaceRowId; icon: LucideIcon; title: string; tools: Tool[]; monthly: number }[] = [
  {
    id: "store",
    icon: Store,
    title: "Online store",
    tools: [
      { name: "Bumpa", logo: "bumpa" },
      { name: "Shopify", logo: "shopify" },
      { name: "Wix", logo: "wix" },
    ],
    monthly: 18000,
  },
  {
    id: "orders",
    icon: Receipt,
    title: "Orders and invoices",
    tools: [
      { name: "Google Sheets", logo: "google-sheets" },
      { name: "Zoho Invoice", logo: "zoho" },
    ],
    monthly: 5000,
  },
  {
    id: "popups",
    icon: Megaphone,
    title: "Promo pop-ups and banners",
    tools: [
      { name: "Privy", logo: "privy" },
      { name: "Poptin", logo: "poptin" },
    ],
    monthly: 10000,
  },
  {
    id: "ai",
    icon: Sparkles,
    title: "AI product descriptions",
    tools: [{ name: "ChatGPT", logo: "chatgpt" }, { name: "a copywriter" }],
    monthly: 15000,
  },
  {
    id: "logo",
    icon: PenTool,
    title: "Logo maker",
    tools: [
      { name: "Canva", logo: "canva" },
      { name: "Fiverr", logo: "fiverr" },
    ],
    monthly: 8000,
  },
  {
    id: "chat",
    icon: MessageCircle,
    title: "WhatsApp chat and order alerts",
    tools: [
      { name: "Tawk.to", logo: "tawk" },
      { name: "Intercom", logo: "intercom" },
    ],
    monthly: 8000,
  },
  {
    id: "discovery",
    icon: Compass,
    title: "A spot on the marketplace",
    tools: [
      { name: "Jiji boosts", logo: "jiji" },
      { name: "Instagram ads", logo: "instagram" },
    ],
    monthly: 10000,
  },
];

const ROW_FLAGS: Partial<Record<ReplaceRowId, string>> = {
  store: "storefront",
  orders: "invoices",
  popups: "campaigns",
  ai: "ai",
  chat: "whatsapp",
};

const naira = (n: number) => `₦${n.toLocaleString("en-NG")}`;

function toolList(tools: Tool[]) {
  const names = tools.map((t) => t.name);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} or ${names.at(-1)}` : (names[0] ?? "");
}

/** "What Shopmi.ng replaces": standalone tool costs vs one plan. Tool prices are rough estimates. */
export function ReplacesSection({
  plans,
  billingEnabled,
  id = "replaces",
  tone = "plain",
}: {
  plans: PlanPublic[];
  billingEnabled: boolean;
  id?: string;
  tone?: "plain" | "muted";
}) {
  const sorted = [...plans].sort((a, b) => Number(a.price) - Number(b.price));
  const cheapest = billingEnabled ? cheapestPaidPlan(plans) : null;
  const freePlan = billingEnabled ? (sorted.find((p) => Number(p.price) === 0) ?? null) : null;
  const notes: Partial<Record<ReplaceRowId, string>> = {};
  if (billingEnabled && sorted.length > 1) {
    for (const [row, flag] of Object.entries(ROW_FLAGS) as [ReplaceRowId, string][]) {
      const idx = sorted.findIndex((p) => (p.featureFlags as Record<string, unknown> | null)?.[flag] === true);
      if (idx > 0) notes[row] = `${sorted[idx]!.name} and up`;
    }
  }
  const total = REPLACE_ROWS.reduce((sum, r) => sum + r.monthly, 0);
  const ours = cheapest ? Number(cheapest.price) : 0;
  const oursShare = Math.max(2, Math.round((ours / total) * 100));

  return (
    <Section id={id} tone={tone}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <SectionIntro
            align="left"
            eyebrow="One dashboard, not seven"
            title="What Shopmi.ng replaces"
            body="Most small shops juggle a website builder, a pop-up tool, a designer and a chat app, then track orders in a notebook. Shopmi.ng puts all of it in one place."
          />

          <div className="mt-8 rounded-2xl border border-border bg-card p-6">
            <div className="space-y-5">
              <div>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Separate tools</span>
                  <span className="font-semibold tabular-nums text-muted-foreground">about {naira(total)}/mo</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[color-mix(in_oklab,var(--color-foreground)_12%,transparent)]" />
              </div>
              <div>
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="font-semibold text-foreground">Shopmi.ng</span>
                  <span className="font-display text-lg font-bold tabular-nums text-foreground">
                    {ours > 0 ? (
                      <>
                        <span className="mr-1 text-xs font-medium text-muted-foreground">from</span>
                        {naira(ours)}/mo
                      </>
                    ) : (
                      "Free"
                    )}
                  </span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-[color-mix(in_oklab,var(--color-foreground)_6%,transparent)]">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${oursShare}%` }} />
                </div>
              </div>
            </div>
            {freePlan && ours > 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">Or start free on {freePlan.name} and upgrade when you need more.</p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
            <CtaLink href="/onboarding" variant="dark" arrow>
              Create your shop
            </CtaLink>
            {billingEnabled ? (
              <Link
                href="/pricing"
                className="text-sm font-semibold text-foreground underline-offset-4 hover:underline"
              >
                See pricing
              </Link>
            ) : null}
          </div>
        </div>

        <div>
          <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-card">
            {REPLACE_ROWS.map(({ id: rowId, icon: Icon, title, tools, monthly }) => (
              <li key={rowId} className="flex items-center gap-3 px-4 py-5 sm:gap-4 sm:px-6">
                <span className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-foreground sm:flex">
                  <Icon className="h-[18px] w-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-foreground">{title}</p>
                  <p className="mt-1 flex items-start gap-2 text-[13px] text-muted-foreground sm:items-center sm:text-sm">
                    <span className="flex shrink-0 -space-x-1.5" aria-hidden>
                      {tools
                        .filter((t) => t.logo)
                        .map((t) => (
                          <span
                            key={t.name}
                            className="flex h-5 w-5 items-center justify-center overflow-hidden rounded-full bg-white ring-2 ring-card"
                          >
                            <Image
                              src={`/brand/tools/${t.logo}.png`}
                              alt=""
                              width={20}
                              height={20}
                              className="h-3.5 w-3.5 object-contain"
                            />
                          </span>
                        ))}
                    </span>
                    <span className="min-w-0">Instead of {toolList(tools)}</span>
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm tabular-nums text-muted-foreground">{naira(monthly)}/mo</p>
                  <p
                    className={cn(
                      "mt-1 inline-flex items-center gap-1 text-xs font-medium",
                      notes[rowId] ? "text-muted-foreground" : "text-success"
                    )}
                  >
                    {notes[rowId] ?? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Included
                      </>
                    )}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Tool costs are rough monthly estimates for comparable services in Nigeria. Features vary by plan. Brand names
            belong to their owners.
          </p>
        </div>
      </div>
    </Section>
  );
}
