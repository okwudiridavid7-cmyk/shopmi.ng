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

/** Subdomains and paths a shop must never claim: platform routes, infrastructure, brand-confusable names. */
const RESERVED_SLUGS = new Set([
  // platform routes
  "admin", "api", "app", "seller", "sellers", "buyer", "buyers", "login", "logout", "signup",
  "register", "onboarding", "cart", "checkout", "support", "help", "about", "privacy", "terms",
  "cookies", "shops", "shop", "store", "stores", "explore", "pricing", "contact", "faq", "invite",
  "verify-email", "forgot-password", "reset-password", "account", "dashboard", "settings", "hello",
  "orders", "billing", "pay", "payment", "payments", "invoice", "invoices", "callback", "webhook",
  "webhooks", "oauth", "auth", "sso", "legal", "blog", "news", "careers", "jobs", "press", "status",
  // infrastructure
  "www", "www1", "www2", "mail", "email", "smtp", "imap", "pop", "pop3", "mx", "ns", "ns1", "ns2",
  "dns", "ftp", "sftp", "ssh", "vpn", "cdn", "media", "static", "assets", "img", "images", "files",
  "uploads", "download", "downloads", "dev", "staging", "stage", "test", "testing", "demo", "beta",
  "preview", "sandbox", "internal", "localhost", "origin", "edge", "proxy", "gateway", "worker",
  "redis", "db", "database", "metrics", "monitor", "health", "cpanel", "webmail", "autodiscover",
  "autoconfig", "_acme-challenge", "acme", "ssl", "secure", "security",
  // brand and trust
  "shopmi", "shopming", "shopmi-ng", "official", "team", "staff", "root", "system", "sysadmin",
  "administrator", "moderator", "mod", "superadmin", "paystack", "verify", "verified", "verification",
  "abuse", "postmaster", "hostmaster", "webmaster", "noreply", "no-reply",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase());
}
