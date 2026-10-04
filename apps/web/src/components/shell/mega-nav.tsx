"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { usePlatformBranding } from "@/hooks/use-branding";
import { useCategoryTree } from "@/hooks/use-catalog";
import { useCookieConsent } from "@/components/cookie-consent";
import {
  BadgeIcon,
  BagIcon,
  BoxIcon,
  BuildingIcon,
  CardIcon,
  CookieIcon,
  DashboardIcon,
  DocumentIcon,
  HeadsetIcon,
  HeartIcon,
  MailIcon,
  MegaphoneIcon,
  NAV_ICON_TONES,
  PaletteIcon,
  ReceiptIcon,
  SearchIcon,
  StorefrontIcon,
  TagIcon,
  type NavIcon,
} from "@/components/shell/nav-icons";
import { cn } from "@/lib/utils";

type MenuLink = {
  title: string;
  subtitle?: string;
  href?: string;
  icon?: NavIcon;
  onSelect?: () => void;
};

type MenuColumn = {
  heading: string;
  links: MenuLink[];
  footer?: MenuLink;
};

type Menu = {
  id: string;
  label: string;
  primary: MenuColumn;
  middle: MenuColumn & { columns?: 1 | 2 };
  side: MenuColumn;
};

const CLOSE_DELAY_MS = 140;

function authed(href: string, signedIn: boolean) {
  return signedIn ? href : `/login?next=${encodeURIComponent(href)}`;
}

export function MegaNav({ className }: { className?: string }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const billingEnabled = usePlatformBranding().data?.billingEnabled !== false;
  const categories = useCategoryTree().data;
  const { openPreferences } = useCookieConsent();

  const [openId, setOpenId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelClose = useCallback(() => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
  }, []);

  const scheduleClose = useCallback(() => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenId(null), CLOSE_DELAY_MS);
  }, [cancelClose]);

  const close = useCallback(() => {
    cancelClose();
    setOpenId(null);
  }, [cancelClose]);

  useEffect(() => close(), [pathname, close]);
  useEffect(() => cancelClose, [cancelClose]);

  useEffect(() => {
    if (!openId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [openId, close]);

  const menus = useMemo<Menu[]>(() => {
    const signedIn = Boolean(user);
    const topCategories = (categories ?? [])
      .filter((c) => !c.parentId)
      .slice(0, 8)
      .map<MenuLink>((c) => ({
        title: c.name,
        subtitle:
          c.children && c.children.length > 0
            ? c.children
                .slice(0, 3)
                .map((child) => child.name)
                .join(", ")
            : undefined,
        href: `/explore?category=${encodeURIComponent(c.slug)}`,
      }));

    return [
      {
        id: "shop",
        label: "Shop",
        primary: {
          heading: "Marketplace",
          links: [
            {
              title: "Explore marketplace",
              subtitle: "Products from independent shops",
              href: "/explore",
              icon: BagIcon,
            },
            {
              title: "Why shop here",
              subtitle: "Verified sellers, secure checkout",
              href: "/buyers",
              icon: BadgeIcon,
            },
            {
              title: "Favorites",
              subtitle: "Everything you’ve saved",
              href: authed("/buyer/favorites", signedIn),
              icon: HeartIcon,
            },
            {
              title: "Your orders",
              subtitle: "Track and manage purchases",
              href: authed("/buyer/orders", signedIn),
              icon: BoxIcon,
            },
          ],
        },
        middle: {
          heading: "Categories",
          columns: 2,
          links:
            topCategories.length > 0
              ? topCategories
              : [{ title: "All products", subtitle: "Browse the full marketplace", href: "/explore" }],
          footer: { title: "View all categories", href: "/explore" },
        },
        side: {
          heading: "Help",
          links: [
            { title: "FAQs", href: "/faq" },
            { title: "Support", href: "/support" },
            { title: "Contact us", href: "/contact" },
          ],
        },
      },
      {
        id: "sell",
        label: "For sellers",
        primary: {
          heading: "Create your shop",
          links: [
            {
              title: "Why sell on Shopmi.ng",
              subtitle: "A branded storefront in minutes",
              href: "/sellers",
              icon: StorefrontIcon,
            },
            ...(billingEnabled
              ? [
                  {
                    title: "Pricing",
                    subtitle: "Plans that grow with your shop",
                    href: "/pricing",
                    icon: TagIcon,
                  },
                ]
              : []),
            {
              title: "Seller dashboard",
              subtitle: "Products, orders and payouts",
              href: authed("/seller", signedIn),
              icon: DashboardIcon,
            },
          ],
        },
        middle: {
          heading: "Features",
          columns: 2,
          links: [
            {
              title: "Branded storefront",
              subtitle: "Your logo, colours and link",
              href: "/sellers#features",
              icon: PaletteIcon,
            },
            {
              title: "Secure payments",
              subtitle: "Paid straight to your bank",
              href: "/sellers#features",
              icon: CardIcon,
            },
            {
              title: "Orders & invoices",
              subtitle: "Track every order",
              href: "/sellers#features",
              icon: ReceiptIcon,
            },
            {
              title: "Promo pop-ups",
              subtitle: "Show offers to shoppers",
              href: "/sellers#features",
              icon: MegaphoneIcon,
            },
            {
              title: "Verified badge",
              subtitle: "Build trust with buyers",
              href: "/sellers#features",
              icon: BadgeIcon,
            },
            {
              title: "Marketplace listing",
              subtitle: "Reach more shoppers",
              href: "/sellers#features",
              icon: SearchIcon,
            },
          ],
        },
        side: {
          heading: "Resources",
          links: [
            { title: "Open your shop", href: "/onboarding" },
            { title: "Seller FAQs", href: "/faq" },
            { title: "Seller support", href: "/support" },
            { title: "Talk to us", href: "/contact" },
          ],
        },
      },
      {
        id: "company",
        label: "Company",
        primary: {
          heading: "Company",
          links: [
            {
              title: "About us",
              subtitle: "Why we built Shopmi",
              href: "/#about",
              icon: BuildingIcon,
            },
            {
              title: "Contact",
              subtitle: "Questions, partnerships, press",
              href: "/contact",
              icon: MailIcon,
            },
            {
              title: "Support",
              subtitle: "Help with orders and shops",
              href: "/support",
              icon: HeadsetIcon,
            },
          ],
        },
        middle: {
          heading: "Legal",
          columns: 1,
          links: [
            {
              title: "Privacy Policy",
              subtitle: "How we handle your data",
              href: "/privacy",
              icon: DocumentIcon,
            },
            {
              title: "Terms of Service",
              subtitle: "The rules for using Shopmi",
              href: "/terms",
              icon: DocumentIcon,
            },
            {
              title: "Cookie Policy",
              subtitle: "What we store and why",
              href: "/cookies",
              icon: CookieIcon,
            },
          ],
        },
        side: {
          heading: "More",
          links: [
            { title: "FAQs", href: "/faq" },
            { title: "Cookie settings", onSelect: openPreferences },
          ],
        },
      },
    ];
  }, [user, categories, billingEnabled, openPreferences]);

  const active = menus.find((m) => m.id === openId) ?? null;

  const triggerClass =
    "inline-flex items-center gap-1 rounded-md px-3 py-2 text-[15px] font-medium text-foreground transition hover:text-accent-strong dark:hover:text-accent-on-dark";

  return (
    <div
      ref={rootRef}
      className={cn("items-center", className)}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") scheduleClose();
      }}
      onPointerEnter={cancelClose}
    >
      <nav aria-label="Main" className="flex items-center gap-1">
        {menus.map((m, i) => (
          <MenuTrigger
            key={m.id}
            menu={m}
            open={openId === m.id}
            className={triggerClass}
            onHover={() => {
              cancelClose();
              setOpenId(m.id);
            }}
            onToggle={() => setOpenId((cur) => (cur === m.id ? null : m.id))}
            after={
              i === 1 && billingEnabled ? (
                <Link
                  href="/pricing"
                  className={triggerClass}
                  onPointerEnter={(e) => {
                    if (e.pointerType === "mouse") close();
                  }}
                >
                  Pricing
                </Link>
              ) : null
            }
          />
        ))}
      </nav>

      <AnimatePresence>
        {active ? (
          <div
            key="mega-panel-wrap"
            className="absolute left-1/2 top-full z-50 w-[min(64rem,calc(100vw-2rem))] -translate-x-1/2 pt-2"
          >
            <motion.div
              key="mega-panel"
              id="mega-nav-panel"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_24px_60px_-20px_rgba(0,0,0,0.3)]"
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.12 }}
                  className="grid grid-cols-[17rem_minmax(0,1fr)_13rem]"
                >
                  <PrimaryColumn column={active.primary} onNavigate={close} />
                  <MiddleColumn column={active.middle} onNavigate={close} />
                  <SideColumn column={active.side} onNavigate={close} />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function MenuTrigger({
  menu,
  open,
  className,
  onHover,
  onToggle,
  after,
}: {
  menu: Menu;
  open: boolean;
  className: string;
  onHover: () => void;
  onToggle: () => void;
  after?: React.ReactNode;
}) {
  return (
    <>
      <button
        type="button"
        className={cn(className, open && "text-accent-strong dark:text-accent-on-dark")}
        aria-expanded={open}
        aria-controls={open ? "mega-nav-panel" : undefined}
        onPointerEnter={(e) => {
          if (e.pointerType === "mouse") onHover();
        }}
        onClick={onToggle}
      >
        {menu.label}
        <ChevronDown
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {after}
    </>
  );
}

function ColumnHeading({ children, onDark }: { children: string; onDark?: boolean }) {
  return (
    <p
      className={cn(
        "mb-4 text-[11px] font-semibold uppercase tracking-[0.16em]",
        onDark ? "text-zinc-400" : "text-muted-foreground"
      )}
    >
      {children}
    </p>
  );
}

function IconDisc({ icon: Icon, index }: { icon: NavIcon; index: number }) {
  return (
    <span
      className={cn(
        "flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[#1c1c1f]",
        NAV_ICON_TONES[index % NAV_ICON_TONES.length]
      )}
    >
      <Icon className="h-[22px] w-[22px]" />
    </span>
  );
}

function ItemShell({
  link,
  onNavigate,
  className,
  children,
}: {
  link: MenuLink;
  onNavigate: () => void;
  className: string;
  children: React.ReactNode;
}) {
  if (link.href) {
    return (
      <Link href={link.href} className={className} onClick={onNavigate}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cn(className, "w-full text-left")}
      onClick={() => {
        onNavigate();
        link.onSelect?.();
      }}
    >
      {children}
    </button>
  );
}

function PrimaryColumn({ column, onNavigate }: { column: MenuColumn; onNavigate: () => void }) {
  return (
    <div className="bg-[#0f1115] p-6 text-white">
      <ColumnHeading onDark>{column.heading}</ColumnHeading>
      <ul className="space-y-1">
        {column.links.map((l, i) => (
          <li key={l.title}>
            <ItemShell
              link={l}
              onNavigate={onNavigate}
              className="group -mx-3 flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.07]"
            >
              {l.icon ? <IconDisc icon={l.icon} index={i} /> : null}
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-snug">{l.title}</span>
                {l.subtitle ? (
                  <span className="mt-0.5 block text-[13px] leading-snug text-zinc-400">
                    {l.subtitle}
                  </span>
                ) : null}
              </span>
            </ItemShell>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MiddleColumn({
  column,
  onNavigate,
}: {
  column: MenuColumn & { columns?: 1 | 2 };
  onNavigate: () => void;
}) {
  return (
    <div className="flex flex-col bg-card p-6">
      <ColumnHeading>{column.heading}</ColumnHeading>
      <ul
        className={cn(
          "grid gap-x-6 gap-y-1",
          column.columns === 2 ? "grid-cols-2" : "grid-cols-1"
        )}
      >
        {column.links.map((l, i) => (
          <li key={l.title}>
            <ItemShell
              link={l}
              onNavigate={onNavigate}
              className={cn(
                "-mx-3 flex gap-3.5 rounded-xl px-3 py-2.5 transition hover:bg-muted",
                l.icon ? "items-center" : "items-start"
              )}
            >
              {l.icon ? <IconDisc icon={l.icon} index={i} /> : null}
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold leading-snug text-foreground">
                  {l.title}
                </span>
                {l.subtitle ? (
                  <span className="mt-0.5 block truncate text-[13px] leading-snug text-muted-foreground">
                    {l.subtitle}
                  </span>
                ) : null}
              </span>
            </ItemShell>
          </li>
        ))}
      </ul>
      {column.footer?.href ? (
        <Link
          href={column.footer.href}
          onClick={onNavigate}
          className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-semibold text-accent-strong transition hover:gap-2.5 dark:text-accent-on-dark"
        >
          {column.footer.title}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

function SideColumn({ column, onNavigate }: { column: MenuColumn; onNavigate: () => void }) {
  return (
    <div className="border-l border-border bg-muted p-6">
      <ColumnHeading>{column.heading}</ColumnHeading>
      <ul className="space-y-1">
        {column.links.map((l) => (
          <li key={l.title}>
            <ItemShell
              link={l}
              onNavigate={onNavigate}
              className="-mx-2 block rounded-lg px-2 py-2 text-[15px] font-medium text-foreground transition hover:bg-card"
            >
              {l.title}
            </ItemShell>
          </li>
        ))}
      </ul>
    </div>
  );
}
