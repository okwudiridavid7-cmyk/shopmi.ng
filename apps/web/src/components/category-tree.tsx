"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import type { CategoryPublic } from "@vendors/shared-types";

export type CategoryTreeProps = {
  categories: CategoryPublic[];
  selectedSlug: string;
  onSelect: (slug: string) => void;
  className?: string;
};

function hasChildren(node: CategoryPublic): boolean {
  return (node.children?.length ?? 0) > 0;
}

function collectAncestorSlugs(
  nodes: CategoryPublic[],
  targetSlug: string,
  trail: string[] = []
): string[] | null {
  for (const node of nodes) {
    if (node.slug === targetSlug) return trail;
    if (hasChildren(node)) {
      const found = collectAncestorSlugs(node.children!, targetSlug, [
        ...trail,
        node.slug,
      ]);
      if (found) return found;
    }
  }
  return null;
}

function CategoryNode({
  node,
  depth,
  selectedSlug,
  expanded,
  onToggle,
  onSelect,
}: {
  node: CategoryPublic;
  depth: number;
  selectedSlug: string;
  expanded: Set<string>;
  onToggle: (slug: string) => void;
  onSelect: (slug: string) => void;
}) {
  const kids = node.children ?? [];
  const open = expanded.has(node.slug);
  const selected = selectedSlug === node.slug;

  return (
    <li>
      <div
        className="flex items-center gap-token-1"
        style={{ paddingLeft: depth * 12 }}
      >
        {kids.length > 0 ? (
          <button
            type="button"
            aria-expanded={open}
            aria-label={open ? `Collapse ${node.name}` : `Expand ${node.name}`}
            onClick={() => onToggle(node.slug)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {open ? (
              <ChevronDown className="h-5 w-5" aria-hidden />
            ) : (
              <ChevronRight className="h-5 w-5" aria-hidden />
            )}
          </button>
        ) : (
          <span className="inline-block h-8 w-8 shrink-0" aria-hidden />
        )}
        <button
          type="button"
          onClick={() => onSelect(node.slug)}
          className={`min-w-0 flex-1 rounded-sm px-token-2 py-token-1 text-left text-sm transition ${
            selected
              ? "bg-accent/15 font-medium text-accent"
              : "text-foreground hover:bg-muted"
          }`}
        >
          <span className="line-clamp-2">{node.name}</span>
        </button>
      </div>
      {kids.length > 0 && open && (
        <ul className="mt-0.5 space-y-0.5">
          {kids.map((child) => (
            <CategoryNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedSlug={selectedSlug}
              expanded={expanded}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/** Expand/collapse category taxonomy for marketplace filters. */
export function CategoryTree({
  categories,
  selectedSlug,
  onSelect,
  className = "",
}: CategoryTreeProps) {
  const ancestorSlugs = useMemo(
    () =>
      selectedSlug
        ? collectAncestorSlugs(categories, selectedSlug) ?? []
        : [],
    [categories, selectedSlug]
  );

  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(ancestorSlugs)
  );

  // Keep ancestors of the current selection open when selection changes.
  const expandedMerged = useMemo(() => {
    const next = new Set(expanded);
    for (const slug of ancestorSlugs) next.add(slug);
    return next;
  }, [expanded, ancestorSlugs]);

  function toggle(slug: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  return (
    <div className={`space-y-token-2 ${className}`}>
      <button
        type="button"
        onClick={() => onSelect("")}
        className={`w-full rounded-sm px-token-2 py-token-1 text-left text-sm transition ${
          !selectedSlug
            ? "bg-accent/15 font-medium text-accent"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
      >
        All categories
      </button>
      <ul className="space-y-0.5">
        {categories.map((node) => (
          <CategoryNode
            key={node.id}
            node={node}
            depth={0}
            selectedSlug={selectedSlug}
            expanded={expandedMerged}
            onToggle={toggle}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </div>
  );
}
