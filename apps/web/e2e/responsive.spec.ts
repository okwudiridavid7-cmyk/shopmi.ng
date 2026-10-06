import { expect, test, type Browser } from "@playwright/test";
import { authState, ctx, horizontalOverflow, overflowCulprits } from "./helpers";

const VIEWPORTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1280, height: 800 },
];

type Who = "anon" | "seller" | "buyer" | "admin";

function pages(): { path: string; who: Who }[] {
  const c = ctx();
  const shops = c.shopSlugs.slice(0, 4).map((s) => ({ path: `/shops/${s}`, who: "anon" as Who }));
  return [
    { path: "/", who: "anon" },
    { path: "/explore", who: "anon" },
    { path: "/pricing", who: "anon" },
    { path: "/sellers", who: "anon" },
    { path: "/login", who: "anon" },
    { path: "/signup", who: "anon" },
    ...shops,
    { path: c.productPath, who: "anon" },
    { path: "/cart", who: "buyer" },
    { path: "/buyer", who: "buyer" },
    { path: "/buyer/orders", who: "buyer" },
    { path: "/seller", who: "seller" },
    { path: "/seller/products", who: "seller" },
    { path: "/seller/orders", who: "seller" },
    { path: "/seller/plan", who: "seller" },
    { path: "/seller/settings", who: "seller" },
    { path: "/seller/branding", who: "seller" },
    { path: "/seller/domain", who: "seller" },
    { path: "/seller/team", who: "seller" },
    { path: "/admin", who: "admin" },
    { path: "/admin/payouts", who: "admin" },
    { path: "/admin/tenants", who: "admin" },
  ];
}

async function open(browser: Browser, who: Who, width: number, height: number) {
  return browser.newContext({
    viewport: { width, height },
    storageState: who === "anon" ? undefined : authState(who),
  });
}

for (const vp of VIEWPORTS) {
  test.describe(`no horizontal overflow at ${vp.width}px`, () => {
    for (const p of pages()) {
      test(`${p.path} (${p.who})`, async ({ browser }) => {
        test.skip(p.who === "admin" && !ctx().admin, "no super admin in this database");
        const context = await open(browser, p.who, vp.width, vp.height);
        const page = await context.newPage();
        const res = await page.goto(p.path, { waitUntil: "networkidle" });
        expect(res?.status() ?? 0).toBeLessThan(500);
        await page.waitForTimeout(400);
        const overflow = await horizontalOverflow(page);
        const culprits = overflow > 1 ? await overflowCulprits(page) : [];
        await context.close();
        expect(overflow, `overflow ${overflow}px: ${culprits.join(" | ")}`).toBeLessThanOrEqual(1);
      });
    }
  });
}
