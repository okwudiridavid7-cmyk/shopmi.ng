/** "Dee's Spot" → "dees-spot" */
export function slugifyShopName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 63);
}

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "www",
  "app",
  "seller",
  "buyer",
  "login",
  "signup",
  "onboarding",
  "cart",
  "checkout",
  "support",
  "about",
  "privacy",
  "terms",
  "shops",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
