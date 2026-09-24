import type { Category } from "@prisma/client";
import type { CategoryPublic } from "@vendors/shared-types";
import { prisma } from "../db/prisma";
import { toCategoryPublic } from "./serialize";

export function buildCategoryTree(flat: Category[]): CategoryPublic[] {
  const byId = new Map<string, CategoryPublic>();
  for (const c of flat) {
    byId.set(c.id, { ...toCategoryPublic(c), children: [] });
  }
  const roots: CategoryPublic[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children!.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortRec = (nodes: CategoryPublic[]) => {
    nodes.sort(
      (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
    );
    for (const n of nodes) {
      if (n.children?.length) sortRec(n.children);
      else delete n.children;
    }
  };
  sortRec(roots);
  return roots;
}

/** Collect this category id plus all descendant ids (for marketplace filter). */
export async function categoryIdsIncludingDescendants(
  slugOrId: string
): Promise<string[] | null> {
  const root = await prisma.category.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
  });
  if (!root) return null;

  const all = await prisma.category.findMany({
    select: { id: true, parentId: true },
  });
  const childrenByParent = new Map<string, string[]>();
  for (const c of all) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parentId, list);
  }

  const ids: string[] = [];
  const stack = [root.id];
  while (stack.length) {
    const id = stack.pop()!;
    ids.push(id);
    const kids = childrenByParent.get(id);
    if (kids) stack.push(...kids);
  }
  return ids;
}

export async function categoryBreadcrumb(
  slugOrId: string
): Promise<CategoryPublic[]> {
  const cat = await prisma.category.findFirst({
    where: { OR: [{ slug: slugOrId }, { id: slugOrId }] },
  });
  if (!cat) return [];

  const chain: Category[] = [cat];
  let parentId = cat.parentId;
  while (parentId) {
    const parent = await prisma.category.findUnique({ where: { id: parentId } });
    if (!parent) break;
    chain.unshift(parent);
    parentId = parent.parentId;
  }
  return chain.map(toCategoryPublic);
}
