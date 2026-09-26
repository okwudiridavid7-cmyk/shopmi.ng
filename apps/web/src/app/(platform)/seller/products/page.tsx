"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Package, Tag } from "lucide-react";
import type { ProductImageAsset, ProductPublic } from "@vendors/shared-types";
import { PageHeader } from "@/components/dashboard/page-header";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { TextLink } from "@/components/ui/text-link";
import { CountryStateSelect } from "@/components/country-state-select";
import { CategoryPicker } from "@/components/category-picker";
import {
  emptyProductFilters,
  FilterDrawer,
  SellerProductFilterPanel,
  type SellerProductFilters,
} from "@/components/seller-filters";
import {
  apiFetch,
  formatMoney,
  productImageUrl,
} from "@/lib/api";
import { generateProductDescription, pollWatermarkJob } from "@/lib/ai-jobs";
import {
  productDisplayUrl,
  uploadSellerFile,
  useInvalidateSeller,
  useSellerCatalogOptions,
  useSellerProducts,
} from "@/hooks/use-seller";
import { useUiStore } from "@/stores/ui";

function statusClass(status: string) {
  if (status === "active")
    return "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300";
  if (status === "draft")
    return "bg-amber-500/15 text-amber-900 dark:text-amber-200";
  return "bg-muted text-muted-foreground";
}

function matchesStock(qty: number, stock: SellerProductFilters["stock"]) {
  if (!stock) return true;
  if (stock === "out") return qty <= 0;
  if (stock === "low") return qty >= 1 && qty <= 4;
  if (stock === "in_stock") return qty >= 5;
  return true;
}

export default function SellerProductsPage() {
  const { data: products = [], isLoading, error } = useSellerProducts();
  const catalog = useSellerCatalogOptions();
  const invalidate = useInvalidateSeller();
  const showForm = useUiStore((s) => s.sellerProductFormOpen);
  const setShowForm = useUiStore((s) => s.setSellerProductFormOpen);
  const [editing, setEditing] = useState<ProductPublic | null>(null);
  const [filters, setFilters] = useState<SellerProductFilters>(emptyProductFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const features = catalog.data?.features;
  const categories = catalog.data?.categories ?? [];
  const shopCategories = catalog.data?.shopCategories ?? [];

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return products.filter((p) => {
      if (filters.status && p.status !== filters.status) return false;
      if (filters.categoryId && p.categoryId !== filters.categoryId) return false;
      if (!matchesStock(p.stockQty, filters.stock)) return false;
      if (q) {
        const hay = `${p.title} ${p.brandName ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [products, filters]);

  function setFilter<K extends keyof SellerProductFilters>(
    key: K,
    value: SellerProductFilters[K]
  ) {
    setFilters((f) => ({ ...f, [key]: value }));
  }

  const [busy, setBusy] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [watermarkBusy, setWatermarkBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    price: "",
    compareAtPrice: "",
    stockQty: "1",
    categoryId: "",
    shopCategoryId: "",
    brandName: "",
    location: "",
    countryCode: "",
    stateCode: "",
    imageAssets: [] as ProductImageAsset[],
    status: "active" as "draft" | "active" | "archived",
    watermarkEnabled: false,
    aiGeneratedDescription: false,
  });

  useEffect(() => {
    if (features) {
      setForm((prev) => ({
        ...prev,
        watermarkEnabled: features.watermarkDefaultOn,
      }));
    }
  }, [features]);

  function openCreate() {
    setEditing(null);
    setForm({
      title: "",
      description: "",
      price: "",
      compareAtPrice: "",
      stockQty: "1",
      categoryId: "",
      shopCategoryId: "",
      brandName: "",
      location: "",
      countryCode: "",
      stateCode: "",
      imageAssets: [],
      status: "active",
      watermarkEnabled: features?.watermarkDefaultOn ?? false,
      aiGeneratedDescription: false,
    });
    setFormError(null);
    setShowForm(true);
  }

  function productToImageAssets(p: ProductPublic): ProductImageAsset[] {
    if (p.imageAssets?.length) return p.imageAssets;
    return (p.images ?? []).map((url) => ({
      original: url,
      watermarked: null,
    }));
  }

  function openEdit(p: ProductPublic) {
    setEditing(p);
    setForm({
      title: p.title,
      description: p.description,
      price: String(p.price),
      compareAtPrice: p.compareAtPrice != null ? String(p.compareAtPrice) : "",
      stockQty: String(p.stockQty),
      categoryId: p.categoryId ?? "",
      shopCategoryId: p.shopCategoryId ?? "",
      brandName: p.brandName ?? "",
      location: p.location ?? "",
      countryCode: p.countryCode ?? "",
      stateCode: p.stateCode ?? "",
      imageAssets: productToImageAssets(p),
      status: p.status,
      watermarkEnabled: p.watermarkEnabled,
      aiGeneratedDescription: p.aiGeneratedDescription,
    });
    setFormError(null);
    setShowForm(true);
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setWatermarkBusy(true);
    setFormError(null);
    try {
      const res = await uploadSellerFile(file);
      const original = res.originalUrl ?? res.url;
      let watermarked: string | null = null;
      if (res.watermarkJobId) {
        watermarked = await pollWatermarkJob(res.watermarkJobId);
      }
      setForm((f) => ({
        ...f,
        imageAssets: [
          ...f.imageAssets,
          { original, watermarked },
        ].slice(0, 10),
      }));
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setWatermarkBusy(false);
    }
  }

  async function onGenerateDescription() {
    if (!form.title.trim()) {
      setFormError("Enter a product title first");
      return;
    }
    setAiGenerating(true);
    setFormError(null);
    try {
      const text = await generateProductDescription({
        title: form.title,
        categoryId: form.categoryId || undefined,
        shopCategoryId: form.shopCategoryId || undefined,
        brandName: form.brandName || undefined,
        location: form.location || undefined,
        price: form.price ? Number(form.price) : undefined,
        productId: editing?.id,
      });
      setForm((f) => ({
        ...f,
        description: text,
        aiGeneratedDescription: true,
      }));
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : "Description generation failed"
      );
    } finally {
      setAiGenerating(false);
    }
  }

  function removeImage(index: number) {
    setForm((f) => ({
      ...f,
      imageAssets: f.imageAssets.filter((_, i) => i !== index),
    }));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    try {
      const payload = {
        title: form.title,
        description: form.description || " ",
        price: Number(form.price),
        compareAtPrice: form.compareAtPrice
          ? Number(form.compareAtPrice)
          : null,
        stockQty: Number(form.stockQty),
        categoryId: form.categoryId || null,
        shopCategoryId: form.shopCategoryId || null,
        brandName: form.brandName || null,
        location: form.location || null,
        countryCode: form.countryCode || null,
        stateCode: form.stateCode || null,
        images: form.imageAssets.map((a) => ({
          original: a.original,
          watermarked: a.watermarked,
        })),
        status: form.status,
        watermarkEnabled: form.watermarkEnabled,
        aiGeneratedDescription: form.aiGeneratedDescription,
      };
      if (editing) {
        await apiFetch(`/api/seller/products/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
      } else {
        await apiFetch("/api/seller/products", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }
      setShowForm(false);
      setEditing(null);
      await invalidate();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function archive(p: ProductPublic) {
    await apiFetch(`/api/seller/products/${p.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "archived" }),
    });
    await invalidate();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Products"
        description="Manage catalog, stock, and listing status."
        icon={Package}
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
            >
              Filters
            </Button>
            <Button variant="primary" onClick={openCreate}>
              Add product
            </Button>
          </>
        }
      />

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <SellerProductFilterPanel
          filters={filters}
          setFilter={setFilter}
          clearFilters={() => setFilters(emptyProductFilters)}
          categories={categories}
        />
      </FilterDrawer>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="hidden rounded-2xl border border-border bg-card p-4 lg:block">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Filters
          </h2>
          <SellerProductFilterPanel
            filters={filters}
            setFilter={setFilter}
            clearFilters={() => setFilters(emptyProductFilters)}
            categories={categories}
          />
        </aside>

        <div className="min-w-0 space-y-6">
      {showForm && (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              {editing ? "Edit product" : "New product"}
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={save} className="grid max-w-xl gap-4">
              <Label>
                <span>Title</span>
                <Input
                  required
                  value={form.title}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, title: e.target.value }))
                  }
                />
              </Label>
              <Label>
                <span>Description</span>
                <Textarea
                  required
                  rows={4}
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      description: e.target.value,
                      aiGeneratedDescription: false,
                    }))
                  }
                />
              </Label>
              {features?.aiFeaturesEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={aiGenerating || !form.title.trim()}
                  onClick={() => void onGenerateDescription()}
                >
                  {aiGenerating ? "Generating description…" : "Generate description"}
                </Button>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  <span>Price</span>
                  <Input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, price: e.target.value }))
                    }
                  />
                </Label>
                <Label>
                  <span>Compare-at price</span>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.compareAtPrice}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, compareAtPrice: e.target.value }))
                    }
                    placeholder="Optional strikethrough"
                  />
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Label>
                  <span>Stock</span>
                  <Input
                    required
                    type="number"
                    min="0"
                    value={form.stockQty}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, stockQty: e.target.value }))
                    }
                  />
                </Label>
                <Label>
                  <span>Brand (free text)</span>
                  <Input
                    value={form.brandName}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, brandName: e.target.value }))
                    }
                    placeholder="e.g. Acme"
                  />
                </Label>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Platform category</p>
                  <CategoryPicker
                    categories={categories}
                    value={form.categoryId}
                    onChange={(id) =>
                      setForm((f) => ({ ...f, categoryId: id }))
                    }
                    placeholder="Optional"
                  />
                </div>
                <Label>
                  <span>Shop category</span>
                  <Select
                    icon={<Tag />}
                    value={form.shopCategoryId}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        shopCategoryId: e.target.value,
                      }))
                    }
                  >
                    <option value="">—</option>
                    {shopCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Label>
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Location</p>
                <CountryStateSelect
                  idPrefix="product-geo"
                  countryCode={form.countryCode}
                  stateCode={form.stateCode}
                  onChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      countryCode: v.countryCode,
                      stateCode: v.stateCode,
                      location: v.label,
                    }))
                  }
                />
              </div>
              <Label>
                <span>Status</span>
                <Select
                  icon={<Package />}
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      status: e.target.value as typeof form.status,
                    }))
                  }
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </Select>
              </Label>
              <Label>
                <span>Images</span>
                <Input
                  type="file"
                  accept="image/*"
                  disabled={watermarkBusy}
                  onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
                />
              </Label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.watermarkEnabled}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      watermarkEnabled: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 accent-[var(--color-accent)]"
                />
                <span>
                  Show watermarked images on storefront
                  {watermarkBusy && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (processing watermark…)
                    </span>
                  )}
                </span>
              </label>
              {form.imageAssets.length > 0 && (
                <ul className="flex flex-wrap gap-2">
                  {form.imageAssets.map((asset, i) => {
                    const url = productDisplayUrl(asset, form.watermarkEnabled);
                    return (
                      <li
                        key={`${asset.original}-${i}`}
                        className="relative h-16 w-16 overflow-hidden rounded-md bg-muted"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          className="absolute right-0 top-0 bg-black/60 px-1 text-xs text-white"
                          onClick={() => removeImage(i)}
                          aria-label="Remove image"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {formError && (
                <p className="text-sm text-red-700 dark:text-red-400">
                  {formError}
                </p>
              )}
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} variant="primary">
                  {busy ? "Saving…" : editing ? "Update" : "Create"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {error ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void invalidate();
          }}
        />
      ) : isLoading ? (
        <SkeletonLines count={4} />
      ) : products.length === 0 ? (
        <EmptyState
          kind="products"
          actionLabel="Add product"
          onAction={openCreate}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          kind="empty_filtered"
          title="No products match these filters"
          description="Adjust status, category, or stock — or clear filters to see everything."
          actionLabel="Clear filters"
          onAction={() => setFilters(emptyProductFilters)}
          icon={Package}
        />
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Price</th>
                <th className="px-4 py-3 font-medium">Stock</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((p) => {
                const img = productImageUrl(p.images);
                return (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={img}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <span className="font-medium text-foreground">
                          {p.title}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatMoney(p.price, p.currency)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {p.stockQty}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-sm px-2 py-0.5 text-xs capitalize ${statusClass(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEdit(p)}
                        >
                          Edit
                        </Button>
                        {p.status !== "archived" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => void archive(p)}
                          >
                            Archive
                          </Button>
                        )}
                        {p.tenant?.slug && (
                          <TextLink
                            href={`/shops/${p.tenant.slug}/products/${p.id}`}
                            className="self-center text-xs"
                          >
                            View
                          </TextLink>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
