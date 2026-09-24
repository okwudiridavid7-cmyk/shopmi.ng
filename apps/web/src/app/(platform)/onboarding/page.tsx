"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandPublic, CategoryPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { slugifyShopName } from "@/lib/slugify";
import { markWalkthroughPending } from "@/components/walkthrough";
import { CategoryPicker } from "@/components/category-picker";
import { CountryStateSelect } from "@/components/country-state-select";

type Step = 1 | 2 | 3 | 4;

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

function RadioCards({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly { value: string; title: string; description: string }[];
}) {
  return (
    <div className="space-y-2" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex cursor-pointer gap-3 rounded-lg border px-4 py-3 transition ${
              selected
                ? "border-accent bg-accent/10 ring-1 ring-accent"
                : "border-border bg-card hover:border-foreground/30"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={selected}
              onChange={() => onChange(opt.value)}
              className="mt-1 accent-[hsl(var(--accent))]"
            />
            <span className="min-w-0">
              <span className="block text-sm font-medium text-foreground">
                {opt.title}
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {opt.description}
              </span>
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [categories, setCategories] = useState<CategoryPublic[]>([]);
  const [brands, setBrands] = useState<BrandPublic[]>([]);
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
  });
  const [shop, setShop] = useState({
    shopName: "",
    slug: "",
    location: "",
    countryCode: "",
    stateCode: "",
  });
  const [logo, setLogo] = useState({
    initials: "",
    color: "#1f6b4a",
    url: "",
  });
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
      apiFetch<{ brands: BrandPublic[] }>("/api/catalog/brands"),
      apiFetch<{ presets: { id: string; color: string; label: string }[] }>(
        "/api/logo/presets"
      ).catch(() => ({ presets: [] })),
      apiFetch<{ shopBaseDomain: string }>("/api/tenants/config").catch(() => ({
        shopBaseDomain:
          process.env.NEXT_PUBLIC_SHOP_BASE_DOMAIN ?? "localhost:3000",
      })),
    ]).then(([c, b, l, cfg]) => {
      setCategories(c.categories);
      setBrands(b.brands);
      setLogoPresets(l.presets);
      setShopBaseDomain(cfg.shopBaseDomain);
    });

    apiFetch<{ user: { email: string } }>("/api/auth/me")
      .then((res) => {
        setAlreadyAuthed(true);
        setAccount((a) => ({ ...a, email: res.user.email }));
        setStep(2);
      })
      .catch(() => {
        setAlreadyAuthed(false);
      });
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
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
          countryCode: shop.countryCode || undefined,
          stateCode: shop.stateCode || undefined,
          logoUrl: logo.url || undefined,
          answers,
          firstProduct: {
            title: product.title,
            description: product.description,
            price: Number(product.price),
            compareAtPrice: product.compareAtPrice
              ? Number(product.compareAtPrice)
              : undefined,
            stockQty: Number(product.stockQty),
            categoryId: product.categoryId || undefined,
            brandName: product.brandName || undefined,
            location: shop.location || undefined,
            countryCode: shop.countryCode || undefined,
            stateCode: shop.stateCode || undefined,
            images,
            status: "active",
          },
        }),
      });
      markWalkthroughPending();
      router.push(
        res.product
          ? `/shops/${res.tenant.slug}/products/${res.product.id}`
          : `/seller`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onboarding failed");
    } finally {
      setBusy(false);
    }
  }

  const totalSteps = 4;

  return (
    <div className="mx-auto max-w-xl space-y-token-6">
      <div>
        <p className="text-sm uppercase tracking-[0.2em] text-muted-foreground">
          Seller onboarding · Step {step}/{totalSteps}
        </p>
        <h1 className="font-display text-3xl">Open your shop</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create your seller account, answer a few questions, then list your
          first product — all in one flow.
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-token-4">
          <h2 className="font-display text-xl">Create your seller account</h2>
          <label className="block space-y-1 text-sm">
            <span>Email</span>
            <input
              type="email"
              value={account.email}
              onChange={(e) =>
                setAccount((a) => ({ ...a, email: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              required
              autoComplete="email"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Password</span>
            <input
              type="password"
              value={account.password}
              onChange={(e) =>
                setAccount((a) => ({ ...a, password: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              minLength={8}
              required
              autoComplete="new-password"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Phone (optional)</span>
            <input
              type="tel"
              value={account.phone}
              onChange={(e) =>
                setAccount((a) => ({ ...a, phone: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!account.email || account.password.length < 8) {
                setError("Enter a valid email and password (8+ characters)");
                return;
              }
              setError(null);
              setStep(2);
            }}
            className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
          >
            Continue
          </button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-accent underline">
              Log in
            </Link>{" "}
            then return here.
          </p>
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-token-4">
          <h2 className="font-display text-xl">About your business</h2>
          {alreadyAuthed && (
            <p className="rounded-md border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
              Signed in as {account.email}. We’ll attach the shop to this
              account.
            </p>
          )}
          <label className="block space-y-1 text-sm">
            <span>What will you mainly sell?</span>
            <input
              value={answers.categoryFocus}
              onChange={(e) =>
                setAnswers((a) => ({ ...a, categoryFocus: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              placeholder="e.g. Fashion, Electronics"
            />
          </label>
          <div className="space-y-2">
            <p className="text-sm font-medium">Selling experience</p>
            <RadioCards
              name="sellingExperience"
              value={answers.sellingExperience}
              onChange={(v) =>
                setAnswers((a) => ({ ...a, sellingExperience: v }))
              }
              options={EXPERIENCE_OPTIONS}
            />
          </div>
          <div className="space-y-2">
            <p className="text-sm font-medium">How will you fulfill orders?</p>
            <RadioCards
              name="fulfillmentMethod"
              value={answers.fulfillmentMethod}
              onChange={(v) =>
                setAnswers((a) => ({ ...a, fulfillmentMethod: v }))
              }
              options={FULFILLMENT_OPTIONS}
            />
          </div>
          <div className="flex gap-2">
            {!alreadyAuthed && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-md border border-border px-4 py-2 text-sm"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (
                  !answers.sellingExperience ||
                  !answers.fulfillmentMethod
                ) {
                  setError("Choose experience and fulfillment options");
                  return;
                }
                setError(null);
                setStep(3);
              }}
              className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground"
            >
              Continue
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="space-y-token-4">
          <h2 className="font-display text-xl">Shop details</h2>
          <label className="block space-y-1 text-sm">
            <span>Shop name</span>
            <input
              value={shop.shopName}
              onChange={(e) => {
                const shopName = e.target.value;
                const nextSlug = slugEditedRef.current
                  ? shop.slug
                  : slugifyShopName(shopName);
                setShop((s) => ({ ...s, shopName, slug: nextSlug }));
                if (!slugEditedRef.current) checkSlug(nextSlug);
              }}
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              required
              placeholder="Dee's Spot"
            />
          </label>
          <div className="space-y-1 text-sm">
            <span className="block">Shop address</span>
            <div className="flex overflow-hidden rounded-md border border-border bg-card">
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
                className="min-w-0 flex-1 bg-transparent px-3 py-2 outline-none"
                placeholder="dees-spot"
                required
                aria-label="Shop slug"
              />
              <span className="flex shrink-0 items-center border-l border-border bg-muted/40 px-3 text-muted-foreground">
                .{shopBaseDomain}
              </span>
            </div>
            {shop.slug.length >= 2 && slugStatus.available === true && (
              <p className="text-xs text-emerald-700 dark:text-emerald-400">
                Available — {shop.slug}.{shopBaseDomain}
              </p>
            )}
            {slugStatus.available === false && (
              <p className="text-xs text-red-700 dark:text-red-400">
                {slugStatus.reason ?? "Not available"}
              </p>
            )}
          </div>
          <div className="space-y-2 text-sm">
            <span className="block font-medium">Location</span>
            <CountryStateSelect
              idPrefix="onboarding-geo"
              countryCode={shop.countryCode}
              stateCode={shop.stateCode}
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
          <div className="space-y-2">
            <p className="text-sm font-medium">Shop logo (optional)</p>
            <div className="flex flex-wrap gap-2">
              {logoPresets.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setLogo((l) => ({ ...l, color: p.color }))}
                  className="h-8 w-8 rounded-md border border-border"
                  style={{ backgroundColor: p.color }}
                  aria-label={p.label}
                  title={p.label}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <label className="block space-y-1 text-sm">
                <span>Initials</span>
                <input
                  value={logo.initials}
                  maxLength={3}
                  onChange={(e) =>
                    setLogo((l) => ({
                      ...l,
                      initials: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder={shop.shopName.slice(0, 2).toUpperCase() || "SH"}
                  className="w-24 rounded-md border border-border bg-card px-3 py-2"
                />
              </label>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const initials =
                      logo.initials ||
                      shop.shopName.slice(0, 2).toUpperCase() ||
                      "V";
                    const res = await apiFetch<{ url: string }>(
                      "/api/logo/generate",
                      {
                        method: "POST",
                        body: JSON.stringify({
                          initials,
                          color: logo.color,
                        }),
                      }
                    );
                    setLogo((l) => ({ ...l, initials, url: res.url }));
                  } catch (err) {
                    setError(
                      err instanceof Error ? err.message : "Logo failed"
                    );
                  }
                }}
                className="rounded-md border border-border px-3 py-2 text-sm"
              >
                Generate logo
              </button>
            </div>
            {logo.url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo.url}
                alt="Logo preview"
                className="h-16 w-16 rounded-md border border-border"
              />
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => {
                if (!shop.shopName || !shop.slug) return;
                if (slugStatus.available === false) {
                  setError("Choose an available shop address");
                  return;
                }
                setError(null);
                setStep(4);
              }}
              disabled={
                !shop.shopName ||
                !shop.slug ||
                slugStatus.available === false
              }
              className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-50"
            >
              Continue
            </button>
          </div>
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {step === 4 && (
        <form onSubmit={submit} className="space-y-token-4">
          <h2 className="font-display text-xl">First product</h2>
          <p className="text-sm text-muted-foreground">
            Submitting creates your account (if needed), shop, and this product,
            then signs you in.
          </p>
          <label className="block space-y-1 text-sm">
            <span>Title</span>
            <input
              value={product.title}
              onChange={(e) =>
                setProduct((p) => ({ ...p, title: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              required
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Description</span>
            <textarea
              value={product.description}
              onChange={(e) =>
                setProduct((p) => ({ ...p, description: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              rows={4}
              required
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1 text-sm">
              <span>Price (NGN)</span>
              <input
                type="number"
                min={1}
                value={product.price}
                onChange={(e) =>
                  setProduct((p) => ({ ...p, price: e.target.value }))
                }
                className="w-full rounded-md border border-border bg-card px-3 py-2"
                required
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span>Stock</span>
              <input
                type="number"
                min={0}
                value={product.stockQty}
                onChange={(e) =>
                  setProduct((p) => ({ ...p, stockQty: e.target.value }))
                }
                className="w-full rounded-md border border-border bg-card px-3 py-2"
              />
            </label>
          </div>
          <div className="space-y-1 text-sm">
            <span>Category</span>
            <CategoryPicker
              categories={categories}
              value={product.categoryId}
              onChange={(id) =>
                setProduct((p) => ({ ...p, categoryId: id }))
              }
              placeholder="Optional"
            />
          </div>
          <label className="block space-y-1 text-sm">
            <span>Brand (free text)</span>
            <input
              value={product.brandName}
              onChange={(e) =>
                setProduct((p) => ({ ...p, brandName: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              placeholder="Acme"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Compare-at price (optional)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              value={product.compareAtPrice}
              onChange={(e) =>
                setProduct((p) => ({ ...p, compareAtPrice: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              placeholder="Former price"
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Image URLs (comma-separated stub)</span>
            <input
              value={product.images}
              onChange={(e) =>
                setProduct((p) => ({ ...p, images: e.target.value }))
              }
              className="w-full rounded-md border border-border bg-card px-3 py-2"
              placeholder="https://…"
            />
          </label>
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="rounded-md border border-border px-4 py-2 text-sm"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create account, shop & product"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
