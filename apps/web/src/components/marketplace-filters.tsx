"use client";

import { useId, useMemo, useState } from "react";
import { ChevronDown, MapPin, Search, Tag } from "lucide-react";
import type { BrandPublic, CategoryPublic, ShopCategoryPublic } from "@vendors/shared-types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Select } from "@/components/ui/select";
import { RadioCardGroup } from "@/components/ui/radio-card";
import { CountryStateSelect } from "@/components/country-state-select";
import { CategoryTree } from "@/components/category-tree";
import type { MarketplaceFilters } from "@/stores/ui";

const PRICE_PRESETS: {
  id: string;
  label: string;
  min: string;
  max: string;
}[] = [
  { id: "any", label: "Any", min: "", max: "" },
  { id: "u5", label: "Under 5k", min: "", max: "5000" },
  { id: "5-10", label: "5–10k", min: "5000", max: "10000" },
  { id: "10-20", label: "10–20k", min: "10000", max: "20000" },
  { id: "20-50", label: "20–50k", min: "20000", max: "50000" },
  { id: "50p", label: "50k+", min: "50000", max: "" },
];

function matchingPreset(minPrice: string, maxPrice: string): string {
  const hit = PRICE_PRESETS.find(
    (p) => p.min === minPrice && p.max === maxPrice
  );
  return hit?.id ?? "custom";
}

function findCategoryName(nodes: CategoryPublic[], slug: string): string | null {
  for (const node of nodes) {
    if (node.slug === slug) return node.name;
    const hit = node.children?.length ? findCategoryName(node.children, slug) : null;
    if (hit) return hit;
  }
  return null;
}

function priceSummary(min: string, max: string): string {
  if (!min && !max) return "";
  const preset = PRICE_PRESETS.find((p) => p.min === min && p.max === max);
  if (preset) return preset.label;
  const fmt = (v: string) => `₦${Number(v).toLocaleString("en-NG")}`;
  if (min && max) return `${fmt(min)} to ${fmt(max)}`;
  return min ? `From ${fmt(min)}` : `Up to ${fmt(max)}`;
}

/** Collapsible filter group; starts closed unless it holds an active filter. */
function FilterSection({
  title,
  summary,
  children,
}: {
  title: string;
  summary?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(Boolean(summary));
  const bodyId = useId();
  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-token-2 py-token-3 text-left"
      >
        <span className="text-sm font-medium text-foreground">{title}</span>
        {summary ? (
          <span className="ml-auto min-w-0 truncate text-xs text-accent-strong dark:text-accent-on-dark">
            {summary}
          </span>
        ) : null}
        <ChevronDown
          aria-hidden
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${
            summary ? "" : "ml-auto"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <div id={bodyId} className="space-y-token-2 pb-token-4">
          {children}
        </div>
      ) : null}
    </div>
  );
}

export type FilterPanelProps = {
  filters: MarketplaceFilters;
  setFilter: <K extends keyof MarketplaceFilters>(
    key: K,
    value: MarketplaceFilters[K]
  ) => void;
  clearFilters: () => void;
  categories: CategoryPublic[];
  /** Seller shop categories - shown on shop storefront filters. */
  shopCategories?: ShopCategoryPublic[];
  brands: BrandPublic[];
  locations: string[];
  /** Hide the search field when hero search is used (marketplace). */
  hideSearch?: boolean;
  /** Hide platform taxonomy category (shop pages use shopCategories). */
  hidePlatformCategory?: boolean;
  className?: string;
};

/** Shared filter controls - marketplace sidebar + shop-scoped filters. */
export function FilterPanel({
  filters,
  setFilter,
  clearFilters,
  categories,
  shopCategories,
  brands,
  locations,
  hideSearch,
  hidePlatformCategory,
  className = "",
}: FilterPanelProps) {
  const [brandQuery, setBrandQuery] = useState("");
  const presetId = matchingPreset(filters.minPrice, filters.maxPrice);

  const visibleBrands = useMemo(() => {
    const q = brandQuery.trim().toLowerCase();
    if (!q) return brands;
    return brands.filter((b) => b.name.toLowerCase().includes(q));
  }, [brands, brandQuery]);

  function applyPreset(id: string) {
    const preset = PRICE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    setFilter("minPrice", preset.min);
    setFilter("maxPrice", preset.max);
  }

  function toggleBrand(name: string) {
    // Single-select via checkbox UI: selecting another brand replaces.
    if (filters.brand === name) {
      setFilter("brand", "");
    } else {
      setFilter("brand", name);
    }
  }

  const shopCategoryName =
    shopCategories?.find((c) => c.slug === filters.shopCategory)?.name ?? "";
  const categoryName = filters.category
    ? findCategoryName(categories, filters.category) ?? filters.category
    : "";
  const hasActive = Boolean(
    filters.q ||
      filters.shopCategory ||
      filters.category ||
      filters.minPrice ||
      filters.maxPrice ||
      filters.brand ||
      filters.location ||
      filters.stateCode
  );

  return (
    <div className={className}>
      {!hideSearch && (
        <Label className="pb-token-3">
          <span>Search</span>
          <InputWithIcon
            icon={<Search />}
            value={filters.q}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Search products"
          />
        </Label>
      )}

      {shopCategories && shopCategories.length > 0 && (
        <FilterSection title="Shop category" summary={shopCategoryName}>
          <Select
            icon={<Tag />}
            value={filters.shopCategory}
            onChange={(e) => setFilter("shopCategory", e.target.value)}
            aria-label="Shop category"
          >
            <option value="">All</option>
            {shopCategories.map((c) => (
              <option key={c.id} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </FilterSection>
      )}

      {!hidePlatformCategory && (
        <FilterSection title="Category" summary={categoryName}>
          <CategoryTree
            categories={categories}
            selectedSlug={filters.category}
            onSelect={(slug) => setFilter("category", slug)}
          />
        </FilterSection>
      )}

      <FilterSection
        title="Price"
        summary={priceSummary(filters.minPrice, filters.maxPrice)}
      >
        <RadioCardGroup
          name="price-preset"
          value={presetId === "custom" ? "" : presetId}
          onChange={(id) => applyPreset(id)}
          layout="vertical"
          options={PRICE_PRESETS.map((p) => ({
            value: p.id,
            title: p.label,
          }))}
        />
        <div className="grid grid-cols-2 gap-token-2 pt-token-1">
          <Label>
            <span className="text-xs text-muted-foreground">Min</span>
            <Input
              type="number"
              min={0}
              value={filters.minPrice}
              onChange={(e) => setFilter("minPrice", e.target.value)}
              placeholder="0"
            />
          </Label>
          <Label>
            <span className="text-xs text-muted-foreground">Max</span>
            <Input
              type="number"
              min={0}
              value={filters.maxPrice}
              onChange={(e) => setFilter("maxPrice", e.target.value)}
              placeholder="Any"
            />
          </Label>
        </div>
      </FilterSection>

      <FilterSection title="Brand" summary={filters.brand}>
        <InputWithIcon
          icon={<Search />}
          value={brandQuery}
          onChange={(e) => setBrandQuery(e.target.value)}
          placeholder="Search brands"
          aria-label="Filter brand list"
        />
        <ul className="max-h-48 space-y-token-1 overflow-y-auto pr-1">
          {visibleBrands.length === 0 ? (
            <li className="text-xs text-muted-foreground">No brands match</li>
          ) : (
            visibleBrands.map((b) => (
              <li key={b.id}>
                <label className="flex cursor-pointer items-center gap-token-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.brand === b.name}
                    onChange={() => toggleBrand(b.name)}
                    className="accent-[var(--color-accent)]"
                  />
                  <span className="truncate">{b.name}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      </FilterSection>

      <FilterSection title="Location" summary={filters.location}>
        <CountryStateSelect
          idPrefix="filter-geo"
          countryCode={filters.countryCode}
          stateCode={filters.stateCode}
          onChange={(v) => {
            setFilter("countryCode", v.countryCode);
            setFilter("stateCode", v.stateCode);
            setFilter("location", v.label);
          }}
        />
        {locations.length > 0 && (
          <Label>
            <span className="text-xs text-muted-foreground">Or pick listed</span>
            <Select
              icon={<MapPin />}
              value={filters.location}
              onChange={(e) => setFilter("location", e.target.value)}
            >
              <option value="">All listed</option>
              {locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </Select>
          </Label>
        )}
      </FilterSection>

      {hasActive ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="mt-token-3"
          onClick={clearFilters}
        >
          Clear filters
        </Button>
      ) : null}
    </div>
  );
}

/** Desktop filter column: stays in view while the page scrolls and scrolls on its own. */
export function FilterSidebar({ children }: { children: React.ReactNode }) {
  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 flex max-h-[calc(100vh-7rem)] flex-col rounded-lg border border-border bg-card shadow-sm">
        <h2 className="shrink-0 border-b border-border px-token-4 py-token-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Filters
        </h2>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-token-4 py-token-1">
          {children}
        </div>
      </div>
    </aside>
  );
}

/** Mobile slide-over for filters. */
export function FilterDrawer({
  open,
  onClose,
  children,
  desktop = false,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  /** Also available at lg+, for pages without a filter sidebar. */
  desktop?: boolean;
}) {
  if (!open) return null;
  return (
    <div className={desktop ? "fixed inset-0 z-50" : "fixed inset-0 z-40 lg:hidden"}>
      <button
        type="button"
        className="absolute inset-0 bg-foreground/40"
        aria-label="Close filters"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-label="Filters"
        className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-border bg-card shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border px-token-4 py-token-3">
          <p className="text-sm font-medium">Filters</p>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-token-4">{children}</div>
      </div>
    </div>
  );
}
