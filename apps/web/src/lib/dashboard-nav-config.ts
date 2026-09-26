import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  CreditCard,
  Globe,
  Heart,
  LayoutDashboard,
  Megaphone,
  Package,
  Palette,
  Settings,
  Shield,
  ShoppingBag,
  Store,
  User,
  Users,
  Mail,
  Wrench,
} from "lucide-react";

export type DashboardMode = "buyer" | "seller" | "admin";

export type NavItem = {
  id: string;
  href: string;
  label: string;
  icon: LucideIcon;
  keywords?: string[];
  children?: Omit<NavItem, "children" | "icon">[];
};

export type NavGroup = {
  id: string;
  label: string;
  items: NavItem[];
};

export const BUYER_NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    items: [
      {
        id: "overview",
        href: "/buyer",
        label: "Overview",
        icon: LayoutDashboard,
        keywords: ["home", "dashboard"],
      },
      {
        id: "orders",
        href: "/buyer/orders",
        label: "Orders",
        icon: ShoppingBag,
        keywords: ["purchases", "history"],
      },
      {
        id: "favorites",
        href: "/buyer/favorites",
        label: "Favorites",
        icon: Heart,
        keywords: ["saved", "wishlist"],
      },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      {
        id: "account",
        href: "/buyer/account",
        label: "Account",
        icon: User,
        keywords: ["profile", "settings"],
      },
    ],
  },
];

export const SELLER_NAV_GROUPS: NavGroup[] = [
  {
    id: "main",
    label: "Main",
    items: [
      {
        id: "overview",
        href: "/seller",
        label: "Overview",
        icon: LayoutDashboard,
      },
      {
        id: "products",
        href: "/seller/products",
        label: "Products",
        icon: Package,
      },
      {
        id: "orders",
        href: "/seller/orders",
        label: "Orders",
        icon: ShoppingBag,
      },
    ],
  },
  {
    id: "storefront",
    label: "Storefront",
    items: [
      {
        id: "website",
        href: "/seller/website",
        label: "Website",
        icon: Globe,
        children: [
          {
            id: "website-branding",
            href: "/seller/website?tab=branding",
            label: "Branding",
            keywords: ["logo", "colors"],
          },
          {
            id: "website-pages",
            href: "/seller/website?tab=pages",
            label: "Pages",
            keywords: ["terms", "privacy", "faq"],
          },
          {
            id: "website-contact",
            href: "/seller/website?tab=contact",
            label: "Contact & Socials",
            keywords: ["email", "phone", "social"],
          },
          {
            id: "website-banners",
            href: "/seller/website?tab=banners",
            label: "Banners",
            keywords: ["carousel", "hero"],
          },
        ],
      },
      {
        id: "branding",
        href: "/seller/branding",
        label: "Branding",
        icon: Palette,
      },
      {
        id: "campaigns",
        href: "/seller/campaigns",
        label: "Campaigns",
        icon: Megaphone,
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      {
        id: "verification",
        href: "/seller/verification",
        label: "Verification",
        icon: BadgeCheck,
      },
      {
        id: "plan",
        href: "/seller/plan",
        label: "Plan",
        icon: CreditCard,
      },
      {
        id: "settings",
        href: "/seller/settings",
        label: "Settings",
        icon: Settings,
      },
    ],
  },
];

export const ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "overview",
        href: "/admin",
        label: "Overview",
        icon: LayoutDashboard,
      },
    ],
  },
  {
    id: "marketplace",
    label: "Marketplace",
    items: [
      {
        id: "shops",
        href: "/admin/tenants",
        label: "Shops",
        icon: Store,
        keywords: ["tenants", "sellers"],
      },
      {
        id: "verification",
        href: "/admin/verification",
        label: "Verification",
        icon: Shield,
        keywords: ["verify", "badge"],
      },
      {
        id: "users",
        href: "/admin/users",
        label: "Users",
        icon: Users,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        id: "contact-inquiries",
        href: "/admin/contact-inquiries",
        label: "Contact",
        icon: Mail,
        keywords: ["inquiries", "dsar", "support", "messages"],
      },
      {
        id: "settings",
        href: "/admin/settings",
        label: "Settings",
        icon: Wrench,
        keywords: ["platform", "features"],
      },
      {
        id: "plans",
        href: "/admin/plans",
        label: "Plans",
        icon: CreditCard,
        keywords: ["pricing", "subscriptions"],
      },
    ],
  },
];

/** @deprecated Prefer navGroupsForMode — flat list for command palette / legacy. */
export const BUYER_NAV: NavItem[] = BUYER_NAV_GROUPS.flatMap((g) => g.items);
export const SELLER_NAV: NavItem[] = SELLER_NAV_GROUPS.flatMap((g) => g.items);
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export function navGroupsForMode(mode: DashboardMode): NavGroup[] {
  if (mode === "buyer") return BUYER_NAV_GROUPS;
  if (mode === "seller") return SELLER_NAV_GROUPS;
  return ADMIN_NAV_GROUPS;
}

export function navForMode(mode: DashboardMode): NavItem[] {
  return navGroupsForMode(mode).flatMap((g) => g.items);
}

export function flattenNavItems(items: NavItem[]): {
  id: string;
  href: string;
  label: string;
  parentLabel?: string;
  icon?: LucideIcon;
  keywords?: string[];
}[] {
  const out: {
    id: string;
    href: string;
    label: string;
    parentLabel?: string;
    icon?: LucideIcon;
    keywords?: string[];
  }[] = [];
  for (const item of items) {
    out.push({
      id: item.id,
      href: item.href,
      label: item.label,
      icon: item.icon,
      keywords: item.keywords,
    });
    for (const child of item.children ?? []) {
      out.push({
        id: child.id,
        href: child.href,
        label: child.label,
        parentLabel: item.label,
        icon: item.icon,
        keywords: child.keywords,
      });
    }
  }
  return out;
}

export function isNavActive(
  pathname: string,
  search: string,
  href: string
): boolean {
  const [path, query] = href.split("?");
  if (query) {
    return pathname === path && search.includes(query);
  }
  if (path === "/buyer" || path === "/seller" || path === "/admin") {
    return pathname === path;
  }
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function isNavParentActive(
  pathname: string,
  search: string,
  item: NavItem
): boolean {
  if (isNavActive(pathname, search, item.href)) return true;
  return (item.children ?? []).some((c) =>
    isNavActive(pathname, search, c.href)
  );
}
