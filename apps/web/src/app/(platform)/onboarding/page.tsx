"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CategoryPublic } from "@vendors/shared-types";
import {
  Briefcase,
  ImagePlus,
  Mail,
  Lock,
  Phone,
  Sparkles,
  Store,
  Upload,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { slugifyShopName } from "@/lib/slugify";
import { markWalkthroughPending } from "@/components/walkthrough";
import { CategoryPicker } from "@/components/category-picker";
import { CountryStateSelect } from "@/components/country-state-select";
import { OnboardingCongrats } from "@/components/onboarding-congrats";
import { MultiStepShell } from "@/components/ui/multistep-form";
import { PasswordStrengthField } from "@/components/ui/password-strength";
import { RadioCardGroup } from "@/components/ui/radio-card";
import { PillChoice } from "@/components/ui/pill-choice";
import { SettingsCard } from "@/components/ui/settings-card";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";

const EXPERIENCE_OPTIONS = [
  {
    value: "first_time",
    title: "First time selling",
    description: "Just getting started — we’ll keep things simple.",
  },
  {
    value: "some",
    title: "Some experience",
    description: "You’ve sold before online or offline.",
  },
  {
    value: "pro",
    title: "Professional seller",
    description: "You run sales regularly and know your numbers.",
  },
] as const;

const FULFILLMENT_OPTIONS = [
  {
    value: "self_ship",
    title: "I ship myself",
    description: "You pack and send orders to buyers.",
  },
  {
    value: "pickup",
    title: "Buyer pickup",
    description: "Customers collect from your location.",
  },
  {
    value: "courier",
    title: "Courier partner",
    description: "A delivery partner handles shipping.",
  },
] as const;

const ORDER_VOLUME = [
  { value: "0-50", label: "0 - 50" },
  { value: "51-100", label: "51 - 100" },
  { value: "101-1000", label: "101 - 1000" },
  { value: "1001+", label: "1001+" },
] as const;

const CURRENCIES = [
  { value: "NGN", label: "Naira" },
  { value: "KES", label: "KES" },
  { value: "USD", label: "USD" },
  { value: "GBP", label: "GBP" },
  { value: "CAD", label: "CAD" },
  { value: "OTHER", label: "Others" },
] as const;

const STAFF_COUNT = [
  { value: "none", label: "None" },
  { value: "1-3", label: "1 - 3" },
  { value: "4-5", label: "4 - 5" },
  { value: "6-10", label: "6 - 10" },
  { value: "11+", label: "11+" },
] as const;

const STORE_COUNT = [
  { value: "none", label: "None" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4+", label: "4+" },
] as const;

/**
 * Seamless seller onboarding: account → business → shop → optional product.
 * Progress rail shrinks when first product is skipped.
 */
export default function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [congrats, setCongrats] = useState(false);
  const [createdSlug, setCreatedSlug] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryPublic[]>([]);
  const [alreadyAuthed, setAlreadyAuthed] = useState(false);
  const [shopBaseDomain, setShopBaseDomain] = useState("localhost:3000");
  const [slugStatus, setSlugStatus] = useState<{
    available: boolean | null;
    reason: string | null;
  }>({ available: null, reason: null });
  const slugEditedRef = useRef(false);
  const slugCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [account, setAccount] = useState({
    email: "",
    password: "",
    phone: "",
  });
  const [answers, setAnswers] = useState({
    categoryFocus: "",
    sellingExperience: "",
    fulfillmentMethod: "",
    weeklyOrders: "",
    currencies: ["NGN"] as string[],
    staffCount: "",
    physicalStores: "",
  });
  const [shop, setShop] = useState({
    shopName: "",
    slug: "",
    location: "",
    countryCode: "NG",
    stateCode: "",
  });
  const [logoTab, setLogoTab] = useState<"upload" | "generate">("upload");
  const [logo, setLogo] = useState({
    initials: "",
    color: "#ff822e",
    url: "",
  });
  const [logoBusy, setLogoBusy] = useState(false);
  const [logoPresets, setLogoPresets] = useState<
    { id: string; color: string; label: string }[]
  >([]);
  const [product, setProduct] = useState({
    title: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stockQty: "5",
    categoryId: "",
    brandName: "",
    images: "",
  });
  const [includeProduct, setIncludeProduct] = useState(false);

  const allSteps = useMemo(() => {
    const base = [
      { id: "account", label: "Account" },
      { id: "business", label: "Business" },
      { id: "shop", label: "Shop" },
    ];
    if (includeProduct) base.push({ id: "product", label: "Product" });
    return alreadyAuthed ? base.filter((s) => s.id !== "account") : base;
  }, [alreadyAuthed, includeProduct]);

  const stepIds = useMemo(() => {
    const ids = ["account", "business", "shop"] as string[];
    if (includeProduct) ids.push("product");
    return alreadyAuthed ? ids.filter((id) => id !== "account") : ids;
  }, [alreadyAuthed, includeProduct]);

  const currentStepId = stepIds[Math.min(step, stepIds.length - 1)] ?? "shop";
  const shellStepIndex = Math.min(step, allSteps.length - 1);

  function checkSlug(slug: string) {
    if (slugCheckTimer.current) clearTimeout(slugCheckTimer.current);
    if (slug.length < 2) {
      setSlugStatus({ available: null, reason: null });
      return;
    }
    slugCheckTimer.current = setTimeout(() => {
      apiFetch<{ available: boolean; reason: string | null }>(
        `/api/tenants/slug-available?slug=${encodeURIComponent(slug)}`
      )
        .then((res) =>
          setSlugStatus({ available: res.available, reason: res.reason })
        )
        .catch(() =>
          setSlugStatus({ available: null, reason: "Could not check" })
        );
    }, 350);
  }

  useEffect(() => {
    Promise.all([
      apiFetch<{ categories: CategoryPublic[] }>(
        "/api/catalog/categories?tree=1"
      ),
      apiFetch<{ presets: { id: string; color: string; label: string }[] }>(
        "/api/logo/presets"
      ).catch(() => ({ presets: [] })),
      apiFetch<{ shopBaseDomain: string }>("/api/tenants/config").catch(() => ({
        shopBaseDomain:
          process.env.NEXT_PUBLIC_SHOP_BASE_DOMAIN ?? "localhost:3000",
      })),
    ]).then(([c, l, cfg]) => {
      setCategories(c.categories);
      setLogoPresets(l.presets);
      setShopBaseDomain(cfg.shopBaseDomain);
    });

    apiFetch<{ user: { email: string } }>("/api/auth/me")
      .then((res) => {
        setAlreadyAuthed(true);
        setAccount((a) => ({ ...a, email: res.user.email }));
        setStep(0);
      })
      .catch(() => setAlreadyAuthed(false));
  }, []);

  async function uploadLogo(file: File) {
    setLogoBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await apiFetch<{ url: string }>("/api/logo/upload", {
        method: "POST",
        body,
      });
      setLogo((l) => ({ ...l, url: res.url }));
      setLogoTab("upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLogoBusy(false);
    }
  }

  async function generateLogo() {
    setLogoBusy(true);
    setError(null);
    try {
      const initials =
        logo.initials || shop.shopName.slice(0, 2).toUpperCase() || "SH";
      const res = await apiFetch<{ url: string }>("/api/logo/generate", {
        method: "POST",
        body: JSON.stringify({ initials, color: logo.color }),
      });
      setLogo((l) => ({ ...l, initials, url: res.url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo failed");
    } finally {
      setLogoBusy(false);
    }
  }

  async function finish(withProduct: boolean) {
    setBusy(true);
    setError(null);
    try {
      const images = product.images
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await apiFetch<{
        tenant: { slug: string };
        product: { id: string } | null;
      }>("/api/onboarding", {
        method: "POST",
        body: JSON.stringify({
          ...(alreadyAuthed
            ? {}
            : {
                account: {
                  email: account.email,
                  password: account.password,
                  phone: account.phone || undefined,
                },
              }),
          shopName: shop.shopName,
          slug: shop.slug,
          location: shop.location || undefined,
          countryCode: "NG",
          stateCode: shop.stateCode || undefined,
          logoUrl: logo.url || undefined,
          answers,
          ...(withProduct && product.title.trim()
            ? {
                firstProduct: {
                  title: product.title,
                  description: product.description || product.title,
                  price: Number(product.price),
                  compareAtPrice: product.compareAtPrice
                    ? Number(product.compareAtPrice)
                    : undefined,
                  stockQty: Number(product.stockQty) || 1,
                  categoryId: product.categoryId || undefined,
                  brandName: product.brandName || undefined,
                  location: shop.location || undefined,
                  countryCode: "NG",
                  stateCode: shop.stateCode || undefined,
                  images,
                  status: "active",
                },
              }
            : {}),
        }),
      });
      markWalkthroughPending();
      setCreatedSlug(res.tenant.slug);
      setDone(true);
      setCongrats(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setBusy(false);
    }
  }

  function validateAndContinue() {
    setError(null);
    const id = currentStepId;

    if (id === "account") {
      if (!account.email || account.password.length < 8) {
        setError("Enter a valid email and password (8+ characters)");
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (id === "business") {
      if (
        !answers.sellingExperience ||
        !answers.fulfillmentMethod ||
        !answers.weeklyOrders ||
        answers.currencies.length === 0 ||
        !answers.staffCount ||
        !answers.physicalStores
      ) {
        setError("Answer all business profile questions");
        return;
      }
      setStep((s) => s + 1);
      return;
    }
    if (id === "shop") {
      if (!shop.shopName.trim() || shop.slug.length < 2) {
        setError("Enter a shop name and available address");
        return;
      }
      if (!shop.stateCode) {
        setError("Select your state / region");
        return;
      }
      if (slugStatus.available === false) {
        setError(slugStatus.reason ?? "Shop address not available");
        return;
      }
      if (includeProduct) {
        setStep((s) => s + 1);
        return;
      }
      void finish(false);
      return;
    }
    if (id === "product") {
      if (!product.title.trim() || !product.price) {
        setError(
          "Add a title and price, or go back and open shop without a product"
        );
        return;
      }
      void finish(true);
    }
  }

  const titles: Record<string, string> = {
    account: "Create your seller account",
    business: "About your business",
    shop: "Shop details",
    product: "First product",
  };
  const subtitles: Record<string, string> = {
    account: "One account for your shop dashboard and checkout.",
    business: "A few preferences so we can tailor your workspace.",
    shop: "Name, URL, and logo — favicon can wait until you’re in Branding.",
    product: "List something now, or skip and add products from your dashboard.",
  };

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-10 sm:py-14 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <OnboardingCongrats
        open={congrats}
        shopName={shop.shopName}
        shopSlug={createdSlug ?? undefined}
      />

      <MultiStepShell
        steps={allSteps}
        currentStep={shellStepIndex}
        onStepClick={(i) => setStep(i)}
        title={titles[currentStepId]}
        subtitle={subtitles[currentStepId]}
        onContinue={validateAndContinue}
        onBack={
          step > 0 ? () => setStep((s) => Math.max(0, s - 1)) : undefined
        }
        continueLabel={
          currentStepId === "shop" && !includeProduct
            ? "Open shop"
            : currentStepId === "product"
              ? "Create shop & product"
              : undefined
        }
        continueDisabled={busy || logoBusy || congrats}
        continueBusy={busy}
        complete={done && !congrats}
        completeTitle="Shop ready"
        completeSubtitle={shop.shopName || "Taking you to your dashboard…"}
        hideFooter={done || congrats}
      >
        {error ? (
          <p className="rounded-xl border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        {currentStepId === "account" && (
          <SettingsCard
            title="Account"
            description="Email and a strong password to secure your shop."
          >
            <Label>
              <span>Email</span>
              <InputWithIcon
                icon={<Mail />}
                type="email"
                placeholder="john@example.com"
                value={account.email}
                onChange={(e) =>
                  setAccount((a) => ({ ...a, email: e.target.value }))
                }
                className="h-12"
                autoComplete="email"
                required
              />
            </Label>
            <PasswordStrengthField
              value={account.password}
              onChange={(v) => setAccount((a) => ({ ...a, password: v }))}
              minLength={8}
              required
              label="New password"
            />
            <Label>
              <span>Phone (optional)</span>
              <InputWithIcon
                icon={<Phone />}
                type="tel"
                value={account.phone}
                onChange={(e) =>
                  setAccount((a) => ({ ...a, phone: e.target.value }))
                }
                className="h-12"
              />
            </Label>
            <p className="text-sm text-muted-foreground">
              Already have an account? <TextLink href="/login">Log in</TextLink>{" "}
              then return here.
            </p>
          </SettingsCard>
        )}

        {currentStepId === "business" && (
          <SettingsCard
            title="Business profile"
            description="Help us understand your scale and how you operate."
          >
            {alreadyAuthed && (
              <p className="rounded-xl border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                Signed in as {account.email}. We’ll attach the shop to this
                account.
              </p>
            )}
            <Label>
              <span>What will you mainly sell?</span>
              <InputWithIcon
                icon={<Briefcase />}
                value={answers.categoryFocus}
                onChange={(e) =>
                  setAnswers((a) => ({ ...a, categoryFocus: e.target.value }))
                }
                className="h-12"
                placeholder="e.g. Fashion, Electronics"
              />
            </Label>
            <div className="space-y-2">
              <p className="text-sm font-medium">Selling experience</p>
              <RadioCardGroup
                name="sellingExperience"
                value={answers.sellingExperience}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, sellingExperience: v }))
                }
                options={EXPERIENCE_OPTIONS}
                layout="row"
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">How will you fulfill orders?</p>
              <RadioCardGroup
                name="fulfillmentMethod"
                value={answers.fulfillmentMethod}
                onChange={(v) =>
                  setAnswers((a) => ({ ...a, fulfillmentMethod: v }))
                }
                options={FULFILLMENT_OPTIONS}
                layout="row"
              />
            </div>
            <PillChoice
              label="How many orders do you get weekly?"
              required
              options={ORDER_VOLUME}
              value={answers.weeklyOrders}
              onChange={(v) =>
                setAnswers((a) => ({ ...a, weeklyOrders: v }))
              }
            />
            <PillChoice
              label="What currencies do you receive payment in? (Select all that apply)"
              required
              multi
              options={CURRENCIES}
              value={answers.currencies}
              onChange={(v) => setAnswers((a) => ({ ...a, currencies: v }))}
            />
            <PillChoice
              label="How many staff do you have?"
              required
              options={STAFF_COUNT}
              value={answers.staffCount}
              onChange={(v) => setAnswers((a) => ({ ...a, staffCount: v }))}
            />
            <PillChoice
              label="How many physical stores do you have?"
              required
              options={STORE_COUNT}
              value={answers.physicalStores}
              onChange={(v) =>
                setAnswers((a) => ({ ...a, physicalStores: v }))
              }
            />
          </SettingsCard>
        )}

        {currentStepId === "shop" && (
          <SettingsCard
            title="Shop details"
            description="Your storefront name, address, and logo."
          >
            <Label>
              <span>Shop name</span>
              <InputWithIcon
                icon={<Store />}
                value={shop.shopName}
                onChange={(e) => {
                  const shopName = e.target.value;
                  const nextSlug = slugEditedRef.current
                    ? shop.slug
                    : slugifyShopName(shopName);
                  setShop((s) => ({ ...s, shopName, slug: nextSlug }));
                  if (!slugEditedRef.current) checkSlug(nextSlug);
                }}
                className="h-12"
                placeholder="Dee's Spot"
                required
              />
            </Label>

            <div className="space-y-1.5 text-sm">
              <span className="font-medium">Shop address</span>
              <div className="flex h-12 overflow-hidden rounded-lg border border-border bg-card">
                <input
                  value={shop.slug}
                  onChange={(e) => {
                    slugEditedRef.current = true;
                    const slug = e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9-]/g, "");
                    setShop((s) => ({ ...s, slug }));
                    checkSlug(slug);
                  }}
                  className="min-w-0 flex-1 bg-transparent px-3.5 text-sm outline-none"
                  placeholder="dees-spot"
                  required
                  aria-label="Shop slug"
                />
                <span className="flex shrink-0 items-center border-l border-border bg-muted/40 px-3 text-xs text-muted-foreground sm:text-sm">
                  .{shopBaseDomain}
                </span>
              </div>
              {shop.slug.length >= 2 && slugStatus.available === true && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Available — {shop.slug}.{shopBaseDomain}
                </p>
              )}
              {slugStatus.available === false && (
                <p className="text-xs text-danger">
                  {slugStatus.reason ?? "Not available"}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Location</p>
              <CountryStateSelect
                idPrefix="onboarding-geo"
                nigeriaOnly
                countryCode={shop.countryCode}
                stateCode={shop.stateCode}
                required
                onChange={(v) =>
                  setShop((s) => ({
                    ...s,
                    countryCode: v.countryCode,
                    stateCode: v.stateCode,
                    location: v.label,
                  }))
                }
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium">Shop logo (optional)</p>
              <div className="flex gap-1 rounded-xl bg-muted p-1">
                {(
                  [
                    { id: "upload", label: "Upload", icon: Upload },
                    { id: "generate", label: "Generate", icon: Sparkles },
                  ] as const
                ).map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setLogoTab(tab.id)}
                      className={cn(
                        "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition",
                        logoTab === tab.id
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {logoTab === "upload" ? (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-8 text-center transition hover:border-accent/40 hover:bg-accent/5">
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">
                    {logoBusy ? "Uploading…" : "Drop or click to upload"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    PNG or JPG · max 2MB. Favicon comes later in Branding.
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={logoBusy}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void uploadLogo(file);
                    }}
                  />
                </label>
              ) : (
                <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                  <div className="flex flex-wrap gap-2">
                    {logoPresets.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          setLogo((l) => ({ ...l, color: p.color }))
                        }
                        className={cn(
                          "h-8 w-8 rounded-lg border-2",
                          logo.color === p.color
                            ? "border-foreground"
                            : "border-transparent"
                        )}
                        style={{ backgroundColor: p.color }}
                        aria-label={p.label}
                        title={p.label}
                      />
                    ))}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <Label className="w-28">
                      <span>Initials</span>
                      <Input
                        value={logo.initials}
                        maxLength={3}
                        onChange={(e) =>
                          setLogo((l) => ({
                            ...l,
                            initials: e.target.value.toUpperCase(),
                          }))
                        }
                        placeholder={
                          shop.shopName.slice(0, 2).toUpperCase() || "SH"
                        }
                        className="h-11"
                      />
                    </Label>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={logoBusy}
                      onClick={() => void generateLogo()}
                    >
                      {logoBusy ? "Generating…" : "Generate"}
                    </Button>
                  </div>
                </div>
              )}

              {logo.url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logo.url}
                  alt="Logo preview"
                  className="h-16 w-16 rounded-xl border border-border object-cover"
                />
              ) : null}
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/20 p-3">
              <input
                type="checkbox"
                className="mt-1 accent-[var(--color-accent)]"
                checked={includeProduct}
                onChange={(e) => {
                  setIncludeProduct(e.target.checked);
                }}
              />
              <span className="text-sm">
                <span className="font-medium text-foreground">
                  Also add my first product
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Optional — untick to finish onboarding sooner and catalogue
                  later.
                </span>
              </span>
            </label>
          </SettingsCard>
        )}

        {currentStepId === "product" && (
          <SettingsCard
            title="First product"
            description="Optional starter listing — you can edit it anytime."
          >
            <Label>
              <span>Title</span>
              <Input
                value={product.title}
                onChange={(e) =>
                  setProduct((p) => ({ ...p, title: e.target.value }))
                }
                className="h-12"
                placeholder="Product name"
              />
            </Label>
            <Label>
              <span>Description</span>
              <Textarea
                rows={3}
                value={product.description}
                onChange={(e) =>
                  setProduct((p) => ({ ...p, description: e.target.value }))
                }
                placeholder="What makes it special?"
              />
            </Label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Label>
                <span>Price</span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={product.price}
                  onChange={(e) =>
                    setProduct((p) => ({ ...p, price: e.target.value }))
                  }
                  className="h-12"
                />
              </Label>
              <Label>
                <span>Stock</span>
                <Input
                  type="number"
                  min={0}
                  value={product.stockQty}
                  onChange={(e) =>
                    setProduct((p) => ({ ...p, stockQty: e.target.value }))
                  }
                  className="h-12"
                />
              </Label>
            </div>
            <CategoryPicker
              categories={categories}
              value={product.categoryId}
              onChange={(id) =>
                setProduct((p) => ({ ...p, categoryId: id }))
              }
            />
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => void finish(false)}
            >
              Skip product — open shop now
            </Button>
          </SettingsCard>
        )}
      </MultiStepShell>
    </div>
  );
}
