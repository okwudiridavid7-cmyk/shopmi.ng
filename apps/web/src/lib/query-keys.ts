export const queryKeys = {
  catalog: {
    categories: ["catalog", "categories"] as const,
    brands: ["catalog", "brands"] as const,
    locations: ["catalog", "locations"] as const,
    products: (qs: string) => ["catalog", "products", qs] as const,
  },
  buyer: {
    orders: ["buyer", "orders"] as const,
    order: (id: string) => ["buyer", "orders", id] as const,
    favorites: ["buyer", "favorites"] as const,
    me: ["buyer", "me"] as const,
  },
  cart: {
    summary: ["cart", "summary"] as const,
    shop: (slug: string) => ["cart", "shop", slug] as const,
  },
  seller: {
    products: ["seller", "products"] as const,
    orders: ["seller", "orders"] as const,
    stats: ["seller", "stats"] as const,
    analytics: ["seller", "analytics"] as const,
    features: ["seller", "features"] as const,
    dashboard: ["seller", "dashboard"] as const,
  },
  admin: {
    overview: (period: string) => ["admin", "overview", period] as const,
    tenants: (qs: string) => ["admin", "tenants", qs] as const,
    tenant: (id: string) => ["admin", "tenants", id] as const,
    users: (qs: string) => ["admin", "users", qs] as const,
    verification: (status: string) =>
      ["admin", "verification", status] as const,
    settings: ["admin", "settings"] as const,
    plans: ["admin", "plans"] as const,
    contactInquiries: (qs: string) =>
      ["admin", "contact-inquiries", qs] as const,
  },
};
