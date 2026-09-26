"use client";

import { FormEvent, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { FaqItem, SocialLinks } from "@vendors/shared-types";
import { Globe, Link2, Mail, MessageCircle, Phone } from "lucide-react";
import { LogoBuilder, type LogoBuilderValue } from "@/components/logo-builder";
import { BannerManager } from "@/components/banner-manager";
import { BrandPreview } from "@/components/brand-preview";
import { CountryStateSelect } from "@/components/country-state-select";
import { PageHeader } from "@/components/dashboard/page-header";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { TextLink } from "@/components/ui/text-link";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { apiFetch } from "@/lib/api";
import {
  useSellerBranding,
  useSellerShop,
  type SellerShop,
} from "@/hooks/use-seller";
import { checkBrandContrast, parseHexColor, parseThemeSettings } from "@/lib/theme";

type Tab = "branding" | "pages" | "contact" | "banners" | "widgets";

const TABS: { id: Tab; label: string }[] = [
  { id: "branding", label: "Branding" },
  { id: "pages", label: "Pages" },
  { id: "contact", label: "Contact & Socials" },
  { id: "banners", label: "Banners" },
  { id: "widgets", label: "Widgets" },
];

export default function SellerWebsitePage() {
  const shopQ = useSellerShop();
  const brandingQ = useSellerBranding();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: Tab =
    tabParam === "pages" ||
    tabParam === "contact" ||
    tabParam === "banners" ||
    tabParam === "widgets" ||
    tabParam === "branding"
      ? tabParam
      : "branding";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    if (
      tabParam === "pages" ||
      tabParam === "contact" ||
      tabParam === "banners" ||
      tabParam === "widgets" ||
      tabParam === "branding"
    ) {
      setTab(tabParam);
    }
  }, [tabParam]);

  const [logoBuilder, setLogoBuilder] = useState<LogoBuilderValue>({
    iconId: "store",
    color: "#1a5f4a",
    fontPairId: "modern",
  });
  const [primaryColor, setPrimaryColor] = useState("#1a5f4a");
  const [accentColor, setAccentColor] = useState("");

  const [termsText, setTermsText] = useState("");
  const [privacyText, setPrivacyText] = useState("");
  const [faq, setFaq] = useState<FaqItem[]>([{ question: "", answer: "" }]);

  const [address, setAddress] = useState("");
  const [location, setLocation] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [social, setSocial] = useState<SocialLinks>({});
  const [watermarkDefaultOn, setWatermarkDefaultOn] = useState<boolean | null>(
    null
  );
  const [about, setAbout] = useState("");
  const [tickerEnabled, setTickerEnabled] = useState(false);
  const [tickerText, setTickerText] = useState("");
  const [tickerSpeed, setTickerSpeed] = useState(12);
  const [tickerBg, setTickerBg] = useState("#111111");
  const [tickerColor, setTickerColor] = useState("#ffffff");
  const [whatsappUrl, setWhatsappUrl] = useState("");
  const [chatbotHtml, setChatbotHtml] = useState("");
  const [contactFormEnabled, setContactFormEnabled] = useState(true);

  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const shop = shopQ.data as SellerShop | undefined;
    if (!shop) return;
    setTermsText(shop.termsText ?? "");
    setPrivacyText(shop.privacyText ?? "");
    setFaq(
      shop.faqContent?.length
        ? shop.faqContent
        : [{ question: "", answer: "" }]
    );
    setAddress(shop.address ?? "");
    setLocation(shop.location ?? "");
    setCountryCode(shop.countryCode ?? "");
    setStateCode(shop.stateCode ?? "");
    setPhone(shop.phone ?? shop.contactPhone ?? "");
    setEmail(shop.email ?? shop.contactEmail ?? "");
    setSocial(shop.socialLinks ?? {});
    setWatermarkDefaultOn(shop.watermarkDefaultOn ?? null);
    setContactFormEnabled(shop.contactFormEnabled !== false);
    const theme = parseThemeSettings(shop.themeSettings);
    setAbout(theme.shopDescription ?? shop.description ?? "");
    setTickerEnabled(!!theme.tickerEnabled);
    setTickerText(theme.tickerText ?? "");
    setTickerSpeed(theme.tickerSpeed ?? 12);
    setTickerBg(theme.tickerBg ?? "#111111");
    setTickerColor(theme.tickerColor ?? "#ffffff");
    setWhatsappUrl(theme.whatsappUrl ?? "");
    setChatbotHtml(theme.chatbotHtml ?? "");
  }, [shopQ.data]);

  useEffect(() => {
    if (brandingQ.data) {
      setPrimaryColor(brandingQ.data.primaryColor || "#1a5f4a");
      setAccentColor(brandingQ.data.accentColor || "");
      const lb = brandingQ.data.logoBuilder;
      if (lb?.iconId && lb.color && lb.fontPairId) {
        setLogoBuilder({
          iconId: lb.iconId,
          color: lb.color,
          fontPairId: lb.fontPairId,
        });
      }
    }
  }, [brandingQ.data]);

  const shopName = shopQ.data?.name ?? brandingQ.data?.shopName ?? "Your shop";
  const contrast = checkBrandContrast(primaryColor);

  async function savePages(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const faqContent = faq.filter((f) => f.question.trim() && f.answer.trim());
      await apiFetch("/api/seller/shop", {
        method: "PATCH",
        body: JSON.stringify({
          termsText: termsText || null,
          privacyText: privacyText || null,
          faqContent: faqContent.length ? faqContent : null,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "shop"] });
      setMsg("Legal pages saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveContact(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      await apiFetch("/api/seller/shop", {
        method: "PATCH",
        body: JSON.stringify({
          address: address || null,
          location: location || null,
          countryCode: countryCode || null,
          stateCode: stateCode || null,
          phone: phone || null,
          email: email || null,
          socialLinks: social,
          watermarkDefaultOn,
          contactFormEnabled,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "shop"] });
      setMsg("Contact & preferences saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function saveColors(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    try {
      const primary = parseHexColor(primaryColor);
      if (!primary) throw new Error("Invalid primary color");
      await apiFetch("/api/seller/branding", {
        method: "PATCH",
        body: JSON.stringify({
          primaryColor: primary,
          accentColor: parseHexColor(accentColor),
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "branding"] });
      setMsg("Brand colors saved");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if ((shopQ.isLoading && !shopQ.data) || (brandingQ.isLoading && !brandingQ.data)) {
    return <SkeletonLines count={6} />;
  }

  if (shopQ.error && !shopQ.data) {
    return (
      <QueryErrorState
        error={shopQ.error}
        onRetry={() => {
          void shopQ.refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Website"
        description={
          <>
            Set up your shop&apos;s identity, legal pages, and contact details —
            everything buyers see on your storefront.
            {shopQ.data?.slug ? (
              <>
                {" "}
                Storefront:{" "}
                <TextLink href={`/shops/${shopQ.data.slug}`}>
                  /shops/{shopQ.data.slug}
                </TextLink>
              </>
            ) : null}
          </>
        }
        icon={Globe}
      />

      <nav className="flex flex-wrap gap-2 border-b border-border pb-2">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setMsg(null);
              setErr(null);
            }}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-accent/15 text-accent"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {msg && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>
      )}
      {err && <p className="text-sm text-danger">{err}</p>}

      {tab === "branding" && (
        <div className="space-y-token-8">
          <section className="space-y-token-4">
            <h2 className="font-display text-lg">Logo builder</h2>
            <p className="text-sm text-muted-foreground">
              Pick an icon, color, and font — or upload your own logo on the{" "}
              <TextLink href="/seller/branding">Branding</TextLink>{" "}
              page.
            </p>
            <LogoBuilder
              shopName={shopName}
              value={logoBuilder}
              onChange={setLogoBuilder}
              onGenerated={() => {
                void qc.invalidateQueries({ queryKey: ["seller", "branding"] });
                setMsg("Logo saved to your shop");
              }}
            />
          </section>

          <section className="grid gap-token-6 lg:grid-cols-2">
            <Card className="overflow-hidden rounded-2xl">
              <CardHeader className="bg-muted/30">
                <p className="text-sm font-semibold text-foreground">
                  Brand colors
                </p>
              </CardHeader>
              <CardBody>
                <form onSubmit={saveColors} className="space-y-token-4">
                  <Label>
                    <span>Primary (header & CTAs)</span>
                    <Input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-10 w-full cursor-pointer"
                    />
                  </Label>
                  <Label>
                    <span>Accent (optional)</span>
                    <Input
                      type="color"
                      value={accentColor || "#000000"}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-10 w-full cursor-pointer"
                    />
                  </Label>
                  {!contrast.ok && contrast.warning && (
                    <p className="text-xs text-amber-800 dark:text-amber-200">
                      {contrast.warning}
                    </p>
                  )}
                  <Button type="submit" variant="primary" disabled={busy}>
                    Save colors
                  </Button>
                </form>
              </CardBody>
            </Card>
            <BrandPreview
              shopName={shopName}
              theme={{
                logoUrl: brandingQ.data?.logoUrl,
                logoRectUrl: brandingQ.data?.logoRectUrl,
                primaryColor: parseHexColor(primaryColor),
                accentColor:
                  parseHexColor(accentColor) || parseHexColor(primaryColor),
              }}
            />
          </section>
        </div>
      )}

      {tab === "pages" && (
        <form onSubmit={savePages} className="max-w-2xl space-y-token-6">
          <Label>
            <span>Terms of service</span>
            <Textarea
              rows={8}
              value={termsText}
              onChange={(e) => setTermsText(e.target.value)}
              placeholder="Your shop's terms…"
            />
          </Label>
          <Label>
            <span>Privacy policy</span>
            <Textarea
              rows={8}
              value={privacyText}
              onChange={(e) => setPrivacyText(e.target.value)}
              placeholder="How you handle customer data…"
            />
          </Label>
          <div className="space-y-token-3">
            <p className="text-sm font-medium">FAQ</p>
            {faq.map((item, i) => (
              <div
                key={i}
                className="space-y-token-2 rounded-lg border border-border p-token-3"
              >
                <Input
                  placeholder="Question"
                  value={item.question}
                  onChange={(e) => {
                    const next = [...faq];
                    next[i] = { ...item, question: e.target.value };
                    setFaq(next);
                  }}
                />
                <Textarea
                  rows={2}
                  placeholder="Answer"
                  value={item.answer}
                  onChange={(e) => {
                    const next = [...faq];
                    next[i] = { ...item, answer: e.target.value };
                    setFaq(next);
                  }}
                />
                {faq.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFaq(faq.filter((_, j) => j !== i))}
                  >
                    Remove
                  </Button>
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setFaq([...faq, { question: "", answer: "" }])
              }
            >
              Add FAQ item
            </Button>
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            Save pages
          </Button>
        </form>
      )}

      {tab === "contact" && (
        <form onSubmit={saveContact} className="max-w-2xl space-y-6">
          <CountryStateSelect
            countryCode={countryCode}
            stateCode={stateCode}
            onChange={(v) => {
              setCountryCode(v.countryCode);
              setStateCode(v.stateCode);
              setLocation(v.label);
            }}
          />
          <Label>
            <span>Street address</span>
            <Textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </Label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label>
              <span>Phone</span>
              <InputWithIcon
                icon={<Phone />}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Label>
            <Label>
              <span>Email</span>
              <InputWithIcon
                icon={<Mail />}
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Label>
          </div>
          <Label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={contactFormEnabled}
              onChange={(e) => setContactFormEnabled(e.target.checked)}
              className="h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className="text-sm">
              Accept messages from the public contact form
            </span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Requires a valid shop email above. Without an email, the form
            returns an error instead of forwarding to platform support.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {(
              [
                "instagram",
                "twitter",
                "facebook",
                "tiktok",
                "whatsapp",
                "youtube",
              ] as const
            ).map((key) => (
              <Label key={key}>
                <span className="capitalize">{key}</span>
                <InputWithIcon
                  icon={<Link2 />}
                  value={social[key] ?? ""}
                  onChange={(e) =>
                    setSocial({ ...social, [key]: e.target.value })
                  }
                  placeholder="URL or handle"
                />
              </Label>
            ))}
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-4">
            <p className="text-sm font-semibold text-foreground">
              Product image watermarking
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Platform default:{" "}
              {shopQ.data?.watermarkPlatformDefault ? "On" : "Off"}. Override
              for your shop below.
            </p>
            <Label className="mt-3 flex items-center gap-2">
              <input
                type="checkbox"
                checked={watermarkDefaultOn ?? false}
                onChange={(e) => setWatermarkDefaultOn(e.target.checked)}
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              <span className="text-sm">
                Watermark new product images by default
              </span>
            </Label>
            <label className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={watermarkDefaultOn === null}
                onChange={(e) =>
                  setWatermarkDefaultOn(e.target.checked ? null : false)
                }
                className="h-4 w-4 accent-[var(--color-accent)]"
              />
              Use platform default
            </label>
          </div>
          <Button type="submit" variant="primary" disabled={busy}>
            Save contact & preferences
          </Button>
        </form>
      )}

      {tab === "banners" && (
        <div className="space-y-token-8">
          <BannerManager
            brandColor={primaryColor}
            shopName={shopName}
          />

          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="bg-muted/30">
              <p className="text-sm font-semibold text-foreground">
                Storefront sections
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Toggle Promo Products and New Arrivals on your live shop page.
                Both are off by default.
              </p>
            </CardHeader>
            <CardBody>
              <StorefrontSectionToggles />
            </CardBody>
          </Card>
        </div>
      )}

      {tab === "widgets" && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg(null);
            setErr(null);
            try {
              await apiFetch("/api/seller/shop", {
                method: "PATCH",
                body: JSON.stringify({
                  description: about || null,
                  tickerEnabled,
                  tickerText: tickerText || null,
                  tickerSpeed,
                  tickerBg,
                  tickerColor,
                  whatsappUrl: whatsappUrl || null,
                  chatbotHtml: chatbotHtml || null,
                }),
              });
              await qc.invalidateQueries({ queryKey: ["seller", "shop"] });
              setMsg("Widgets saved");
            } catch (e) {
              setErr(e instanceof Error ? e.message : "Save failed");
            } finally {
              setBusy(false);
            }
          }}
          className="max-w-xl space-y-token-5"
        >
          <Label>
            <span>About us (footer)</span>
            <Textarea
              rows={4}
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="A short paragraph under your logo."
            />
          </Label>
          <label className="flex items-center gap-token-2 text-sm">
            <input
              type="checkbox"
              checked={tickerEnabled}
              onChange={(e) => setTickerEnabled(e.target.checked)}
            />
            Show announcement ticker
          </label>
          <Label>
            <span>Ticker text</span>
            <Input
              value={tickerText}
              onChange={(e) => setTickerText(e.target.value)}
            />
          </Label>
          <Label>
            <span>Ticker speed (seconds per loop)</span>
            <Input
              type="number"
              min={4}
              max={30}
              value={tickerSpeed}
              onChange={(e) => setTickerSpeed(Number(e.target.value) || 12)}
            />
          </Label>
          <div className="grid grid-cols-2 gap-token-3">
            <Label>
              <span>Ticker background</span>
              <Input
                type="color"
                value={tickerBg}
                onChange={(e) => setTickerBg(e.target.value)}
              />
            </Label>
            <Label>
              <span>Ticker text color</span>
              <Input
                type="color"
                value={tickerColor}
                onChange={(e) => setTickerColor(e.target.value)}
              />
            </Label>
          </div>
          <Label>
            <span>WhatsApp (wa.me or number)</span>
            <InputWithIcon
              icon={<MessageCircle />}
              value={whatsappUrl}
              onChange={(e) => setWhatsappUrl(e.target.value)}
            />
          </Label>
          <Label>
            <span>Custom chatbot embed (Smartsupp, etc.)</span>
            <Textarea
              rows={6}
              className="font-mono text-xs"
              value={chatbotHtml}
              onChange={(e) => setChatbotHtml(e.target.value)}
            />
          </Label>
          <Button type="submit" variant="primary" disabled={busy}>
            Save widgets
          </Button>
        </form>
      )}
    </div>
  );
}

function StorefrontSectionToggles() {
  const brandingQ = useSellerBranding();
  const qc = useQueryClient();
  const [promo, setPromo] = useState(false);
  const [arrivals, setArrivals] = useState(false);
  const [days, setDays] = useState(30);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const b = brandingQ.data as
      | {
          promoProductsEnabled?: boolean;
          newArrivalsEnabled?: boolean;
          newArrivalsDays?: number;
        }
      | undefined;
    if (!b) return;
    setPromo(!!b.promoProductsEnabled);
    setArrivals(!!b.newArrivalsEnabled);
    setDays(b.newArrivalsDays ?? 30);
  }, [brandingQ.data]);

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      await apiFetch("/api/seller/branding", {
        method: "PATCH",
        body: JSON.stringify({
          promoProductsEnabled: promo,
          newArrivalsEnabled: arrivals,
          newArrivalsDays: days,
        }),
      });
      await qc.invalidateQueries({ queryKey: ["seller", "branding"] });
      setMsg("Storefront sections saved");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md space-y-token-4">
      <label className="flex items-center gap-token-2 text-sm">
        <input
          type="checkbox"
          checked={promo}
          onChange={(e) => setPromo(e.target.checked)}
        />
        Show Promo Products (items with compare-at price)
      </label>
      <label className="flex items-center gap-token-2 text-sm">
        <input
          type="checkbox"
          checked={arrivals}
          onChange={(e) => setArrivals(e.target.checked)}
        />
        Show New Arrivals
      </label>
      {arrivals && (
        <Label>
          <span>New arrivals window (days)</span>
          <Input
            type="number"
            min={1}
            max={365}
            value={days}
            onChange={(e) => setDays(Number(e.target.value) || 30)}
          />
        </Label>
      )}
      {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
      <Button type="button" variant="primary" disabled={busy} onClick={() => void save()}>
        Save section settings
      </Button>
    </div>
  );
}
