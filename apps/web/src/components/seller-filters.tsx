"use client";

import { Package, Search, Tag, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { InputWithIcon } from "@/components/ui/input-with-icon";
import { Select } from "@/components/ui/select";
import { FilterDrawer } from "@/components/marketplace-filters";

export type SellerProductFilters = {
  status: "" | "draft" | "active" | "archived";
  categoryId: string;
  stock: "" | "in_stock" | "low" | "out";
  q: string;
};

export type SellerOrderFilters = {
  status: string;
  from: string;
  to: string;
};

export const emptyProductFilters: SellerProductFilters = {
  status: "",
  categoryId: "",
  stock: "",
  q: "",
};

export const emptyOrderFilters: SellerOrderFilters = {
  status: "",
  from: "",
  to: "",
};

type CategoryOpt = { id: string; name: string; children?: CategoryOpt[] };

function flattenCategories(
  nodes: CategoryOpt[],
  depth = 0
): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = [];
  for (const n of nodes) {
    const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";
    out.push({ id: n.id, name: `${prefix}${n.name}` });
    if (n.children?.length) {
      out.push(...flattenCategories(n.children, depth + 1));
    }
  }
  return out;
}

export function SellerProductFilterPanel({
  filters,
  setFilter,
  clearFilters,
  categories,
}: {
  filters: SellerProductFilters;
  setFilter: <K extends keyof SellerProductFilters>(
    key: K,
    value: SellerProductFilters[K]
  ) => void;
  clearFilters: () => void;
  categories: CategoryOpt[];
}) {
  const flat = flattenCategories(categories);
  return (
    <div className="space-y-4">
      <Label>
        <span>Search</span>
        <InputWithIcon
          icon={<Search />}
          value={filters.q}
          onChange={(e) => setFilter("q", e.target.value)}
          placeholder="Title or brand"
        />
      </Label>
      <Label>
        <span>Status</span>
        <Select
          icon={<Package />}
          value={filters.status}
          onChange={(e) =>
            setFilter("status", e.target.value as SellerProductFilters["status"])
          }
        >
          <option value="">All</option>
          <option value="active">Active</option>
          <option value="draft">Draft</option>
          <option value="archived">Archived</option>
        </Select>
      </Label>
      <Label>
        <span>Category</span>
        <Select
          icon={<Tag />}
          value={filters.categoryId}
          onChange={(e) => setFilter("categoryId", e.target.value)}
        >
          <option value="">All</option>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </Label>
      <Label>
        <span>Stock</span>
        <Select
          icon={<Warehouse />}
          value={filters.stock}
          onChange={(e) =>
            setFilter("stock", e.target.value as SellerProductFilters["stock"])
          }
        >
          <option value="">All</option>
          <option value="in_stock">In stock (5+)</option>
          <option value="low">Low (1–4)</option>
          <option value="out">Out of stock</option>
        </Select>
      </Label>
      <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );
}

export function SellerOrderFilterPanel({
  filters,
  setFilter,
  clearFilters,
}: {
  filters: SellerOrderFilters;
  setFilter: <K extends keyof SellerOrderFilters>(
    key: K,
    value: SellerOrderFilters[K]
  ) => void;
  clearFilters: () => void;
}) {
  return (
    <div className="space-y-4">
      <Label>
        <span>Status</span>
        <Select
          icon={<Package />}
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">All</option>
          <option value="pending_payment">Pending payment</option>
          <option value="paid">Paid</option>
          <option value="fulfilled">Fulfilled</option>
          <option value="cancelled">Cancelled</option>
          <option value="failed">Failed</option>
        </Select>
      </Label>
      <Label>
        <span>From date</span>
        <Input
          type="date"
          value={filters.from}
          onChange={(e) => setFilter("from", e.target.value)}
        />
      </Label>
      <Label>
        <span>To date</span>
        <Input
          type="date"
          value={filters.to}
          onChange={(e) => setFilter("to", e.target.value)}
        />
      </Label>
      <Button type="button" variant="ghost" size="sm" onClick={clearFilters}>
        Clear filters
      </Button>
    </div>
  );
}

/** Shared mobile drawer wrapper — re-export for seller pages. */
export { FilterDrawer };
