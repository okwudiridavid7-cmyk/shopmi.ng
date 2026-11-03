"use client";

import { FormEvent, useState } from "react";
import { Tag } from "lucide-react";
import type { ShopCategoryPublic } from "@vendors/shared-types";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { apiFetch } from "@/lib/api";
import { useInvalidateSeller, useSellerShopCategories } from "@/hooks/use-seller";

/** CRUD for seller shop categories (products sidebar / website). */
export function ShopCategoriesManager() {
  const { data: categories = [], isLoading, refetch } = useSellerShopCategories();
  const invalidate = useInvalidateSeller();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  async function create(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await apiFetch<{ category: ShopCategoryPublic }>(
        "/api/seller/shop-categories",
        { method: "POST", body: JSON.stringify({ name: trimmed }) }
      );
      setName("");
      await invalidate();
      await refetch();
      toast({ title: "Category added", tone: "success" });
    } catch (err) {
      toast({
        title: "Couldn't add category",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setBusy(true);
    try {
      await apiFetch(`/api/seller/shop-categories/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: trimmed }),
      });
      setEditingId(null);
      await invalidate();
      await refetch();
      toast({ title: "Category updated", tone: "success" });
    } catch (err) {
      toast({
        title: "Couldn't update",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!window.confirm("Delete this shop category?")) return;
    setBusy(true);
    try {
      await apiFetch(`/api/seller/shop-categories/${id}`, { method: "DELETE" });
      await invalidate();
      await refetch();
      toast({ title: "Category deleted", tone: "success" });
    } catch (err) {
      toast({
        title: "Couldn't delete",
        description: err instanceof Error ? err.message : undefined,
        tone: "danger",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-muted-foreground" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Shop categories
        </h2>
      </div>
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Group products for your storefront filters.
        </p>
      ) : (
        <ul className="space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="rounded-lg border border-border px-2.5 py-2">
              {editingId === c.id ? (
                <div className="space-y-2">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="h-8 text-sm"
                    autoFocus
                  />
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="primary"
                      disabled={busy}
                      onClick={() => void saveEdit(c.id)}
                    >
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {c.name}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      /{c.slug}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="text-[11px] font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-[11px] font-medium text-muted-foreground hover:text-danger"
                      onClick={() => void remove(c.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={create} className="space-y-2">
        <Label>
          <span className="sr-only">New category</span>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Dresses"
            className="h-8 text-sm"
            maxLength={80}
          />
        </Label>
        <Button
          type="submit"
          size="sm"
          variant="outline"
          className="w-full"
          disabled={busy || !name.trim()}
        >
          Add category
        </Button>
      </form>
    </div>
  );
}
