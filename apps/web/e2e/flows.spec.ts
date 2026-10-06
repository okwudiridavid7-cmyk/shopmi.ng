import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { authState, ctx } from "./helpers";

const API = process.env.E2E_API ?? "http://localhost:4000";
const PAYSTACK = /^https:\/\/checkout\.paystack\.com\//;
const SAMPLE_IMAGE = path.join(__dirname, "../public/themes/pop.jpg");

/** Stops the browser at Paystack's door: we only need to know the redirect happened. */
async function stubPaystack(page: Page) {
  await page.route(PAYSTACK, (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: "<p>paystack test checkout</p>" })
  );
}

test.describe("seller", () => {
  test.use({ storageState: authState("seller") });

  test("creates a product with an uploaded image", async ({ page }) => {
    const title = `E2E Upload ${Date.now()}`;
    await page.goto("/seller/products");
    await page.getByRole("button", { name: "Add product" }).first().click();

    await page.getByLabel("Title", { exact: true }).fill(title);
    await page.getByLabel("Description", { exact: true }).fill("Hand-stitched canvas tote with an inside pocket.");
    await page.getByLabel("Price", { exact: true }).fill("4500");
    await page.getByLabel("Stock", { exact: true }).fill("7");

    const upload = page.waitForResponse(
      (r) => r.url().includes("/api/seller/uploads") && r.request().method() === "POST"
    );
    await page.getByLabel("Images", { exact: true }).setInputFiles(SAMPLE_IMAGE);
    expect((await upload).ok()).toBe(true);
    await expect(page.locator("form img").first()).toBeVisible();

    await page.getByRole("button", { name: "Create" }).click();
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 15_000 });
  });

  test("AI and image tools follow the feature flags", async ({ page }) => {
    const res = await page.request.get(`${API}/api/seller/tools/features`);
    expect(res.ok()).toBe(true);
    const features = (await res.json()) as { aiFeaturesEnabled?: boolean; imageEnhanceEnabled?: boolean };

    await page.goto("/seller/products");
    await page.getByRole("button", { name: "Add product" }).first().click();
    await page.getByLabel("Title", { exact: true }).fill("Feature flag check");

    const generate = page.getByRole("button", { name: "Generate description" });
    if (features.aiFeaturesEnabled) await expect(generate).toBeVisible();
    else await expect(generate).toHaveCount(0);

    await page.getByLabel("Images", { exact: true }).setInputFiles(SAMPLE_IMAGE);
    await expect(page.locator("form img").first()).toBeVisible({ timeout: 15_000 });
    const enhance = page.getByRole("button", { name: "Enhance" });
    if (features.imageEnhanceEnabled) await expect(enhance.first()).toBeVisible();
    else await expect(enhance).toHaveCount(0);
  });

  test("logo builder saves a logo to the shop", async ({ page }) => {
    await page.goto("/seller/website?tab=branding");
    await page.getByRole("button", { name: "Save logo to shop" }).click();
    await expect(page.getByText("Generated assets")).toBeVisible({ timeout: 30_000 });

    const imgs = page.locator('img[src*="/logos/"]');
    await expect(imgs.first()).toBeVisible();
    const branding = await page.request.get(`${API}/api/seller/branding`);
    expect(branding.ok()).toBe(true);
    const body = (await branding.json()) as { branding: { logoUrl?: string | null } };
    expect(body.branding.logoUrl).toContain("/logos/");
  });

  test("plan payment opens Paystack", async ({ page }) => {
    test.skip(!ctx().paystackTestMode, "Paystack secret key is not a test key");
    await stubPaystack(page);
    await page.goto("/seller/plan");
    await page.getByRole("button", { name: /^Pay ₦/ }).first().click();
    await page.waitForURL(PAYSTACK, { timeout: 20_000 });
  });

  test("domain purchase opens Paystack", async ({ page }) => {
    test.skip(!ctx().paystackTestMode, "Paystack secret key is not a test key");
    const store = await page.request.get(`${API}/api/seller/domain/store`);
    expect(store.ok()).toBe(true);
    const info = (await store.json()) as { available: boolean; planAllowed: boolean; tlds: unknown[] };
    test.skip(!info.available || !info.planAllowed || info.tlds.length === 0, "Domain store not configured");

    await stubPaystack(page);
    await page.goto("/seller/domain/buy");
    await page.getByLabel("Domain name").fill(`shopmie2e${Date.now().toString(36)}`);
    await page.getByLabel("Domain name").press("Enter");
    await page.getByRole("button", { name: "Select" }).first().click({ timeout: 20_000 });

    await page.getByLabel("Phone", { exact: true }).fill("+2348030000000");
    await page.getByLabel("Street address", { exact: true }).fill("12 Admiralty Way");
    await page.getByPlaceholder("e.g. Lagos", { exact: true }).fill("Lagos");
    const state = page.locator("#domain-owner-state");
    await expect(state.locator("option").nth(1)).toBeAttached({ timeout: 10_000 });
    await state.selectOption({ index: 1 });

    await page.getByRole("button", { name: /^Pay ₦/ }).click();
    await page.waitForURL(PAYSTACK, { timeout: 20_000 });
  });
});

test.describe("buyer", () => {
  test.use({ storageState: authState("buyer") });

  test("adds to cart and checks out through Paystack", async ({ page }) => {
    test.skip(!ctx().paystackTestMode, "Paystack secret key is not a test key");
    const { productPath, shopSlug } = ctx();
    await stubPaystack(page);

    await page.goto(productPath);
    await page.getByRole("button", { name: "Add to Cart" }).click();
    await expect(page.getByText("Added to cart").first()).toBeVisible({ timeout: 15_000 });

    await page.goto(`/cart?shop=${shopSlug}`);
    await expect(page.getByText("E2E Tote").first()).toBeVisible({ timeout: 15_000 });
    await page.getByRole("button", { name: "Checkout with Paystack" }).first().click();
    await page.waitForURL(PAYSTACK, { timeout: 20_000 });
  });
});
