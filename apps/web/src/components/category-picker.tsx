"use client";

import { useMemo } from "react";
import { ChevronRight } from "lucide-react";
import type { CategoryPublic } from "@vendors/shared-types";

export type CategoryPickerProps = {
  categories: CategoryPublic[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
  /** Placeholder for empty selection. */
  placeholder?: string;
};

function findPath(
  nodes: CategoryPublic[],
  id: string,
  trail: CategoryPublic[] = []
): CategoryPublic[] | null {
  for (const node of nodes) {
    const next = [...trail, node];
    if (node.id === id) return next;
    if (node.children?.length) {
      const found = findPath(node.children, id, next);
      if (found) return found;
    }
  }
  return null;
}

function childrenAtDepth(
  roots: CategoryPublic[],
  path: CategoryPublic[],
  depth: number
): CategoryPublic[] {
  if (depth === 0) return roots;
  const parent = path[depth - 1];
  return parent?.children ?? [];
}

/**
 * Nested multi-level category picker (cascading selects + breadcrumb).
 * Not a flat list of every category.
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  className = "",
  placeholder = "Select category",
}: CategoryPickerProps) {
  const path = useMemo(
    () => (value ? findPath(categories, value) ?? [] : []),
    [categories, value]
  );

  /** One select per level that has options; plus next level when a parent is chosen. */
  const levels: CategoryPublic[][] = useMemo(() => {
    const result: CategoryPublic[][] = [];
    let depth = 0;
    while (true) {
      const opts = childrenAtDepth(categories, path, depth);
      if (opts.length === 0) break;
      result.push(opts);
      const selectedAtDepth = path[depth];
      if (!selectedAtDepth) break;
      depth += 1;
      if (depth > 8) break;
    }
    return result;
  }, [categories, path]);

  function selectAtDepth(depth: number, id: string) {
    if (!id) {
      if (depth === 0) {
        onChange("");
        return;
      }
      const parent = path[depth - 1];
      if (parent) onChange(parent.id);
      return;
    }
    onChange(id);
  }

  return (
    <div className={`space-y-token-2 ${className}`}>
      {path.length > 0 && (
        <nav
          aria-label="Selected category"
          className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
        >
          {path.map((node, i) => (
            <span key={node.id} className="inline-flex items-center gap-1">
              {i > 0 && (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              <button
                type="button"
                onClick={() => onChange(node.id)}
                className={
                  i === path.length - 1
                    ? "font-medium text-foreground"
                    : "hover:text-foreground hover:underline"
                }
              >
                {node.name}
              </button>
            </span>
          ))}
        </nav>
      )}

      <div className="space-y-token-2">
        {levels.map((opts, depth) => {
          const selectedId = path[depth]?.id ?? "";
          return (
            <select
              key={`level-${depth}`}
              value={selectedId}
              onChange={(e) => selectAtDepth(depth, e.target.value)}
              className="w-full rounded-md border border-border bg-card px-token-3 py-token-2 text-sm text-foreground"
              aria-label={
                depth === 0 ? "Top-level category" : `Subcategory level ${depth + 1}`
              }
            >
              <option value="">
                {depth === 0 ? placeholder : "Any subcategory"}
              </option>
              {opts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          );
        })}
        {levels.length === 0 && (
          <select
            disabled
            className="w-full rounded-md border border-border bg-muted px-token-3 py-token-2 text-sm text-muted-foreground"
            aria-label="Category"
          >
            <option>No categories available</option>
          </select>
        )}
      </div>
    </div>
  );
}
