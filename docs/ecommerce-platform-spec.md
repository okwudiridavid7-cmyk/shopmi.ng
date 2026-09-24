# Multitenant E-Commerce Platform — Technical Spec & Build Roadmap

Working name: **[PLATFORM_NAME]** (set in `.env`, see §3)

This document turns the original feature wishlist into a sequenced, engineering-ready spec. Feed Cursor **one phase, one feature at a time** — not the whole document at once. Each phase includes acceptance criteria so you can tell when a slice is actually done, not just "looks like it works."

---

## 1. Locked Architecture Decisions

These decisions affect nearly everything downstream, so they're made once, here, instead of being left for Cursor to guess mid-build.

| Decision | Choice | Why |
|---|---|---|
| Database | **MySQL 8** (via PlanetScale, RDS, or self-hosted) | Orders, inventory, payments, and multi-tenant relations are inherently relational. MongoDB adds schema flexibility you don't need and loses transactional guarantees you do need (e.g. stock decrement + order creation must be atomic). |
| Multi-tenancy model | **Shared database, shared schema, `tenant_id` (shop_id) on every row** | Simplest to operate at your stage, cheapest to scale, easiest for Cursor to reason about consistently. Schema-per-tenant or DB-per-tenant only makes sense at hundreds+ of large tenants — revisit later if a shop needs dedicated isolation. |
| Backend framework | **Node.js + Express**, TypeScript | Confirmed per your spec. TypeScript is non-negotiable for a codebase this size — untyped Express + AI-generated code is a bug factory. |
| Frontend | **Next.js 14+ (App Router)**, TypeScript, Tailwind CSS | Confirmed. App Router gives you server components for the marketplace (fast, SEO-friendly) and client components for interactive dashboards. |
| Mobile | **React Native + Expo** | Shares types/logic with the Next.js codebase where possible, single JS ecosystem, fastest path to both app stores. |
| Auth | **Custom JWT (access + refresh token) + Google OAuth**, sessions in httpOnly cookies for web, secure storage for mobile | No third-party auth vendor lock-in; Google sign-up handled via OAuth2 directly. |
| File/image storage | **S3-compatible object storage** (AWS S3 / Cloudflare R2) + CDN in front | Product photos, logos, watermarking output all go here — never on the app server's disk. |
| Payments | **Paystack**, via webhooks + signature verification, not client-side trust | Confirmed. Split payments/subaccounts feature in Paystack maps well to "credited to seller's account." |
| Background jobs | **Queue (BullMQ + Redis)** | Needed for: AI description generation, image watermarking, order emails, WhatsApp notifications — none of these should block the request/response cycle. |
| Hosting | Separate concerns: Next.js on Vercel (or similar), Express API + workers on a container platform (Railway/Render/ECS), MySQL managed, Redis managed | Keeps the storefront fast globally (edge-cached) while the API stays close to the DB. |

**Open decision you still need to make:** subdomain routing (`shopname.yourplatform.com`) requires wildcard DNS + wildcard SSL. Confirm your DNS provider supports this before Phase 1 — it's foundational, not a later add-on.

---

## 2. Data Model Sketch (core tables)

This is not exhaustive DDL — it's enough for Cursor to generate a consistent schema without inventing conflicting shapes per feature.

```
tenants (shops)
  id, owner_user_id, name, slug (subdomain), custom_domain,
  status (pending_verification | active | suspended),
  verified_badge (bool), theme_settings (json: colors, logo_url),
  trial_ends_at, plan_id, created_at

users
  id, email, password_hash (nullable if oauth-only), google_id (nullable),
  role (buyer | seller | tenant_admin | super_admin), phone,
  whatsapp_number (nullable), created_at

tenant_admins (join table — multirole admin per shop)
  id, tenant_id, user_id, role (owner | manager | staff), permissions (json)

products
  id, tenant_id, title, description, ai_generated_description (bool),
  price, currency, stock_qty, category_id, brand,
  images (json array of S3 urls), watermark_enabled (bool),
  status (draft | active | archived), created_at

categories, brands
  standard lookup tables, tenant-agnostic (platform-wide taxonomy)

orders
  id, tenant_id, buyer_id, status, subtotal, total, currency,
  paystack_reference, invoice_url, created_at

order_items
  id, order_id, product_id, qty, unit_price

carts, cart_items
  session or user-scoped, tenant-scoped (cart is per-shop, not cross-shop)

reviews
  id, product_id, buyer_id, rating, comment, created_at

campaigns
  id, tenant_id, type (popup), content (json), active (bool),
  trigger_rule (json: e.g. "on_visit", "on_exit_intent"), created_at

verification_requests
  id, tenant_id, status, submitted_docs (json), reviewed_by, reviewed_at

plans
  id, name, price, product_limit (nullable), feature_flags (json), trial_days

platform_settings (super admin controlled, singleton-ish table)
  id, key, value  -- e.g. "verification_required", "ai_features_enabled",
                      "watermark_default_on", "app_name", etc. (the .env-adjacent,
                      admin-editable settings — see §3 for the split between the two)
```

**Key rule for Cursor to follow everywhere:** every query on `products`, `orders`, `carts`, `campaigns` etc. must filter by `tenant_id`, and this filter should come from a shared middleware/helper — never re-implemented per route. This is your single biggest security surface (tenant data leakage), so it deserves a shared, tested utility, not per-feature judgment calls.

---

## 3. Config: `.env` vs Admin-Editable Settings

Your item 17 asked for "app name, keys, global details in `.env` so it can be changed sitewide from a click." Worth splitting these, because they're not the same thing:

- **`.env` (requires redeploy, not click-editable):** API keys/secrets — Paystack secret key, JWT signing secret, S3 credentials, Google OAuth client secret, database URL, Redis URL. These should never be editable from an admin UI; that would be a secrets-management anti-pattern.
- **`platform_settings` table (super admin editable, no redeploy):** app name, logo, support email, feature toggles (verification required, AI features on/off, watermark default), theme defaults, trial length, commission %. This is what actually gives you the "change sitewide from a click" behavior safely.

---

## 4. Security Non-Negotiables

Called out separately because they're easy to skip when moving fast with AI-assisted coding, and they're exactly what "very secure" depends on:

- Tenant isolation enforced at the query layer (see §2), not just the UI layer
- Paystack webhook signature verification on every payment callback — never trust a client-side "payment succeeded" call
- Rate limiting on auth endpoints, campaign popups, and AI generation endpoints (cost + abuse control)
- Input validation (zod or similar) on every API route, shared between frontend and backend where possible
- File upload validation: type, size, and re-encoding of images server-side (never trust uploaded file content blindly, and re-encoding also strips embedded scripts from malformed image files)
- RBAC checks for `tenant_admins` roles enforced server-side, not just hidden in the UI
- Passwords: bcrypt/argon2, never custom hashing
- Content Security Policy headers, HTTPS-only cookies, CSRF protection on state-changing routes

---

## 5. Design Direction (so it doesn't "look like AI")

- Treat ventofurniture.com, gopandy.com, and nomask.ai as **references for pattern inspiration only** — study their card layouts, filter sidebar UX, and premium spacing/typography choices, but don't scrape or reproduce their actual markup/CSS. That's both a shortcut to inconsistent code and a copyright/trademark risk for a commercial product you're taking to app stores.
- Nomask.ai's premium feel likely comes from: generous whitespace, restrained color palette, high-quality large imagery, subtle motion — not the green hue specifically. Swap the accent color, keep the spacing/typography discipline.
- Build a proper design token system from day one (see `frontend-design` skill if using Cursor/Claude together) — colors, spacing, radii, shadows as variables, not hardcoded per component. This is also what makes the VS Code-style "multiple shades per light/dark mode" feature (item on theming) tractable — you're swapping token sets, not rewriting components.

---

## 6. Phased Build Order

Building all 27 original items simultaneously is how projects stall. Each phase below is something you can hand to Cursor as a self-contained task with clear "done" criteria.

### Phase 0 — Foundation (build once, get right)
- Repo structure (monorepo recommended: `apps/web`, `apps/api`, `apps/mobile`, `packages/shared-types`)
- Auth: email/password + Google OAuth, JWT refresh flow
- Tenant model + tenant-scoped query middleware
- `platform_settings` table + super admin read/write for it
- Base design token system + light/dark mode switch (system/light/dark)
- **Done when:** a user can sign up, a tenant record can be created and scoped, and a super admin can flip one setting live without redeploying.

### Phase 1 — Core Marketplace (MVP)
- Homepage marketplace grid + sidebar filters (category, price, brand, location) — Jumia/Gopandy pattern
- Seller onboarding: account creation → guided questions → first product creation in one flow
- Product CRUD, categories, brands
- Cart, checkout, Paystack payment + webhook handling, order creation
- Buyer invoice generation (PDF, emailed + downloadable)
- Basic seller dashboard: products, orders, sales total
- Basic buyer dashboard: order history, favorites
- Transactional emails (order confirmation, receipt) with a real template, not plain text
- **Done when:** a seller can list a product and a buyer can complete a real Paystack purchase end-to-end, with an invoice and confirmation email arriving.

### Phase 2 — Trust & Conversion Features
- Verified badge + unverified warning banner; verification request flow; super admin toggle to require/skip verification before first sale
- Signup tooltip walkthrough (spotlight/blur pattern)
- Shop-loading swipe animation
- Campaigns: popup builder + trigger rules (on visit), tenant-scoped
- Reviews on products
- Shareable product links with custom OG/screenshot preview (Bybit-style link previews)
- **Done when:** an unverified seller's storefront visibly warns buyers, and a seller can create a popup campaign that fires for new visitors.

### Phase 3 — AI & Seller Tooling
- AI product description generation (queued job, not blocking the create-product request)
- Image enhancement + optional watermark, toggleable from super admin
- Logo builder in onboarding (simple generator/picker, not a full design tool at first)
- Analytics dashboard: sales over time, top products, traffic (start simple — total revenue, order count, conversion rate — expand later)
- **Done when:** a seller can generate a description and a watermarked image for a product without leaving the create-product flow, and toggling the feature off in super admin actually hides it.

### Phase 4 — Scale & Ecosystem
- Custom domain linking (subdomain → CNAME, SSL provisioning)
- Multi-admin roles per shop (tenant_admins with owner/manager/staff permissions)
- WhatsApp order notifications (via WhatsApp Business API, opt-in per seller)
- Pricing plans + trial enforcement (product-limit or feature-limit gating, 3-day trial)
- Static pages: Support, About, Privacy Policy, Terms
- **Done when:** a seller can link `shop.theirdomain.com`, add a staff admin with limited permissions, and get a WhatsApp ping on a real sale.

### Phase 5 — Mobile
- React Native (Expo) app reusing shared types/API client from `packages/shared-types`
- Buyer-first mobile experience initially (browsing, cart, checkout, orders); seller mobile dashboard can follow
- **Done when:** core buyer flow (browse → cart → Paystack checkout → order confirmation) works on iOS/Android and passes store review.

---

## 7. How to Actually Use This With Cursor

1. Set up Phase 0 as its own Cursor session/task — don't let it touch Phase 1 features yet.
2. For each feature within a phase, give Cursor: the relevant table(s) from §2, the security rules from §4 that apply, and explicit acceptance criteria (adapt from the "Done when" lines above into something testable).
3. After each feature, review for the tenant-isolation rule specifically (§2) — this is the one thing worth manually checking every time, since it's invisible when broken until it's a real data leak.
4. Keep a running `CURSOR_CONTEXT.md` (or similar) in the repo summarizing decisions made in §1 so future sessions don't drift — e.g. re-decide MySQL vs Mongo, or reinvent the tenant middleware differently in a new file.

---

## 8. Still Open — Decide Before Phase 0

- Wildcard DNS/SSL provider for subdomains-per-shop
- Paystack: subaccounts/split-payment setup for seller payouts (affects schema in §2)
- Commission model: flat platform fee, % per sale, or plan-based only?
- WhatsApp Business API provider (Meta directly vs a wrapper like Twilio) — affects Phase 4 cost and setup complexity
