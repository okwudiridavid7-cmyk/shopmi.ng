import type { LucideIcon } from "lucide-react";
import {
  BadgeCheck,
  Bell,
  ClipboardCheck,
  CreditCard,
  Earth,
  Globe,
  Heart,
  LayoutTemplate,
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
  Wallet,
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
  /** Hide from staff (Plan / Domain / Team writes). */
  ownerOnly?: boolean;
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
      {
        id: "notifications-inbox",
        href: "/notifications",
        label: "Notifications",
        icon: Bell,
        keywords: ["updates", "orders", "alerts"],
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
        id: "themes",
        href: "/seller/themes",
        label: "Themes",
        icon: LayoutTemplate,
        keywords: ["template", "layout", "design", "look", "store theme"],
      },
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
        id: "domain",
        href: "/seller/domain",
        label: "Domain",
        icon: Earth,
        keywords: ["custom domain", "buy domain", "com.ng", "dns", "url"],
        ownerOnly: true,
      },
      {
        id: "campaigns",
        href: "/seller/campaigns",
        label: "Campaigns",
        icon: Megaphone,
      },
      {
        id: "notifications",
        href: "/seller/notifications",
        label: "Notifications",
        icon: Bell,
        keywords: ["whatsapp", "alerts", "order alerts"],
      },
    ],
  },
  {
    id: "business",
    label: "Business",
    items: [
      {
        id: "setup",
        href: "/seller/setup",
        label: "Business profile",
        icon: ClipboardCheck,
        keywords: ["onboarding", "setup", "experience", "fulfillment"],
      },
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
        ownerOnly: true,
      },
      {
        id: "earnings",
        href: "/seller/earnings",
        label: "Earnings",
        icon: Wallet,
        keywords: ["payouts", "ledger", "bank", "balance"],
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
        id: "orders",
        href: "/admin/orders",
        label: "Orders",
        icon: ShoppingBag,
        keywords: ["flagged", "refund", "mismatch", "oversold"],
      },
      {
        id: "payouts",
        href: "/admin/payouts",
        label: "Payouts",
        icon: Wallet,
        keywords: ["ledger", "balances", "bank transfer", "settlement"],
      },
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
        id: "appearance",
        href: "/admin/appearance",
        label: "Appearance",
        icon: Palette,
        keywords: ["colours", "colors", "palette", "theme", "brand"],
      },
      {
        id: "plans",
        href: "/admin/plans",
        label: "Plans",
        icon: CreditCard,
        keywords: ["pricing", "subscriptions"],
      },
      {
        id: "domains",
        href: "/admin/domains",
        label: "Domains",
        icon: Earth,
        keywords: ["registrar", "com.ng", "domain prices"],
      },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    items: [
      { id: "announcements", href: "/admin/announcements", label: "Announcements", icon: Megaphone, keywords: ["notifications", "platform"] },
      { id: "notifications-inbox", href: "/notifications", label: "Notification inbox", icon: Bell, keywords: ["updates", "orders", "alerts"] },
      { id: "email-broadcast", href: "/admin/email", label: "Email users", icon: Mail, keywords: ["broadcast", "campaign"] },
    ],
  },
];

/** @deprecated Prefer navGroupsForMode - flat list for command palette / legacy. */
export const BUYER_NAV: NavItem[] = BUYER_NAV_GROUPS.flatMap((g) => g.items);
export const SELLER_NAV: NavItem[] = SELLER_NAV_GROUPS.flatMap((g) => g.items);
export const ADMIN_NAV: NavItem[] = ADMIN_NAV_GROUPS.flatMap((g) => g.items);

export type SellerViewerRole = "owner" | "manager" | "staff";

/** Nav items staff should not see (plan/domain writes live behind owner/manager gates). */
const STAFF_HIDDEN_SELLER_IDS = new Set(["plan", "domain"]);

export function navGroupsForMode(
  mode: DashboardMode,
  opts?: { viewerRole?: SellerViewerRole | null }
): NavGroup[] {
  if (mode === "buyer") return BUYER_NAV_GROUPS;
  if (mode === "admin") return ADMIN_NAV_GROUPS;

  const role = opts?.viewerRole;
  if (role === "staff") {
    return SELLER_NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => !STAFF_HIDDEN_SELLER_IDS.has(item.id)),
    })).filter((g) => g.items.length > 0);
  }
  return SELLER_NAV_GROUPS;
}

export function navForMode(
  mode: DashboardMode,
  opts?: { viewerRole?: SellerViewerRole | null }
): NavItem[] {
  return navGroupsForMode(mode, opts).flatMap((g) => g.items);
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
