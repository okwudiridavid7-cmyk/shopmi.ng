# Vendors — Multitenant E-Commerce Platform

Phases 0–3: foundation, marketplace MVP, trust/conversion, AI & seller tooling.

## Production

Live deploy (GitHub → Render → Cloudflare `shopmi.ng`): see **[DEPLOY.md](./DEPLOY.md)** and [`render.yaml`](./render.yaml).

| Layer | Choice |
|---|---|
| Monorepo | pnpm workspaces + Turborepo |
| Web | Next.js 14 (App Router), TypeScript, Tailwind, next-themes |
| API | Node.js + Express, TypeScript |
| DB | MySQL 8 + **Prisma** |
| Queue | BullMQ + Redis (AI description jobs) |
| Auth | Email/password (argon2id), Google OAuth2, JWT access + refresh in httpOnly cookies |
| Payments | Paystack (platform collects full amount; webhook HMAC verified) |
| Email | Resend (HTML order confirmation) |
| AI | OpenAI (optional; template fallback without key) |
| Images | Local upload stub + sharp enhance/watermark/logo (`apps/api/uploads`) — S3 later |

### Why Prisma

Prisma gives typed queries, first-class MySQL migrations, and a clear schema file that matches the spec’s shared-schema / `tenant_id` model.

## Repo layout

```
apps/web              Next.js marketplace + dashboards
apps/api              Express API + Prisma + BullMQ worker
packages/shared-types Shared TypeScript types
```

## Prerequisites

- Node 20+ (22 OK)
- pnpm 9 (`corepack enable && corepack prepare pnpm@9.15.0 --activate`)
- Docker (for MySQL + Redis)

## Quick start

```bash
# 1. Env
cp .env.example .env
# Edit JWT secrets, SUPER_ADMIN_*, Google OAuth, Paystack, Resend, OPENAI_API_KEY
ln -sf ../../.env apps/api/.env   # Prisma loads .env from apps/api

cp apps/web/.env.example apps/web/.env.local

# 2. Dependencies
pnpm install

# 3. Infra
docker compose up -d

# 4. Database (from repo root)
pnpm db:push
pnpm db:seed

# 5. Dev servers (API + web)
pnpm dev

# 6. AI worker (separate process — required for AI descriptions)
pnpm worker
```

- Web: http://localhost:3000  
- API health: http://localhost:4000/health  

## Phase 1 — how to exercise the MVP

1. **Seller:** sign up → `/onboarding` (questions → shop → logo → first product)  
2. **Marketplace:** `/` filters by category / brand / price / location  
3. **Buyer:** open product → add to cart → `/cart?shop=slug` → Paystack checkout  
4. **Webhook:** set Paystack webhook URL to `http://localhost:4000/api/paystack/webhook` (use a tunnel like ngrok for real webhooks; callback verify also marks paid in local/test)  
5. **Invoice + email:** after `paid`, download PDF from buyer dashboard; confirmation email via Resend  
6. **Dashboards:** `/seller` (products, orders, sales), `/buyer` (orders, favorites)

### Paystack

Set in `.env`:

```
PAYSTACK_SECRET_KEY=sk_test_...
PAYSTACK_PUBLIC_KEY=pk_test_...
```

Platform collects the full charge (no seller subaccounts in Phase 1). Callback URL used at initialize: `{WEB_URL}/checkout/callback`.

### Resend

```
RESEND_API_KEY=re_...
EMAIL_FROM="Vendors <onboarding@resend.dev>"
```

Without `RESEND_API_KEY`, orders still complete; email is skipped with a server warning.

### Super admin

```
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=...
pnpm db:seed
```

`platform_settings` (including `commission_percent`) is editable via `/api/platform-settings` — secrets stay in `.env`.

### Google OAuth

Authorized redirect URI: `http://localhost:4000/api/auth/google/callback`

- Subtle — should read as "polished," not "flashy AI demo"

## Wave 3.5 — Auth UX + dashboard overviews

| Area | What changed |
|---|---|
| Auth guard | Protected dashboards redirect to `/login?returnTo=…` (no raw API error text) |
| Transitions | Session expired / sign-out / welcome-back moments (~1.2s, respects reduced motion) |
| Overviews | Greeting card + live clock, stats grid, quick actions, recharts insights |

## Wave 3 — Design system overhaul

Visual/UX pass — no new features or schema.

| Area | What changed |
|---|---|
| Dashboard nav | Vertical sidebar (buyer/seller/admin), collapsible + mobile drawer, Website sub-menu |
| Command palette | **⌘K / Ctrl+K** — fuzzy search dashboard nav (`cmdk`) |
| Cards | Unified `ProductCard`, new `ShopCard`, refreshed `StatCard` |
| Verified badge | Green circular checkmark inline with names |
| Theme | Light/Dark/System moved to **account dropdown** (removed from navbar) |
| Motion | Page enter + hover micro-interactions; respects `prefers-reduced-motion` |

Seller **Website** sub-routes use query tabs: `/seller/website?tab=branding|pages|contact|banners`.

## Wave 2 — AI descriptions, logo builder, watermarking, website builder

| Feature | How |
|---|---|
| AI product descriptions | Seller **Products** → **Generate description** (Claude via BullMQ; `pnpm worker`) |
| Logo builder | Seller **Website** → Branding tab — icon + color + font → square + horizontal PNG |
| Image watermarking | Automatic on upload (sharp + BullMQ); toggle per product without re-upload |
| Website builder | Seller **Website** — Branding, Pages (terms/privacy/FAQ), Contact & Socials, Banners (stub) |

```
ANTHROPIC_API_KEY=...          # optional; without it, worker uses a template description
ANTHROPIC_MODEL=claude-sonnet-4-20250514
REDIS_URL=redis://localhost:6379
pnpm worker                    # required for AI + watermark jobs
```

- **`ai_features_enabled`** — when off, the Generate description button is hidden (not just disabled).
- **`watermark_default_on`** — platform default; sellers can override under **Website → Contact & Socials**.

## Phase 3 — AI & seller tooling (legacy label)

See **Wave 2** above for current AI/image tooling. Analytics remains on `/seller`.

## Wave 1 — Subdomain routing (Vercel + local)

### Production (Vercel wildcard)

Wildcard subdomains (`*.yourdomain.com`) need Vercel-managed DNS for SSL:

1. In the Vercel project, add your **apex domain** (e.g. `yourdomain.com`).
2. Add a **wildcard domain**: `*.yourdomain.com`.
3. At your registrar, set the domain’s **nameservers** to:
   - `ns1.vercel-dns.com`
   - `ns2.vercel-dns.com`  
   A plain CNAME for `*` is **not** enough for wildcard SSL on Vercel — nameserver delegation is required.
4. Set env vars to your production base:
   ```
   SHOP_BASE_DOMAIN=yourdomain.com
   NEXT_PUBLIC_SHOP_BASE_DOMAIN=yourdomain.com
   WEB_URL=https://yourdomain.com
   ```
5. Next.js middleware calls `GET /api/shops/resolve-host` (same tenant resolver as UI-5) and rewrites `shop.yourdomain.com/` → `/shops/shop/…` with the shop layout (no platform nav/footer).

### Local development (`lvh.me`)

[`lvh.me`](https://lvh.me) resolves to `127.0.0.1`, so you can use shop subdomains without editing `/etc/hosts`:

```
# Optional local overrides
SHOP_BASE_DOMAIN=lvh.me:3000
NEXT_PUBLIC_SHOP_BASE_DOMAIN=lvh.me:3000
WEB_URL=http://lvh.me:3000
```

Then open e.g. `http://your-shop-slug.lvh.me:3000/` after creating a shop. Platform UI stays on `http://localhost:3000` or `http://lvh.me:3000`.

### Middleware: apex vs shop subdomain

`apps/web/src/middleware.ts` decides **before** any rewrite:

| Host | Behavior |
|---|---|
| **Apex platform** (`localhost`, `127.0.0.1`, `lvh.me`, `WEB_URL` hostname, `SHOP_BASE_DOMAIN` hostname, and `www.` variants) | `NextResponse.next()` — normal App Router (`/login`, `/signup`, marketplace, dashboards) |
| **Shop subdomain** (`{slug}.lvh.me`, `{slug}.yourdomain.com`, seller custom domain) | Resolve tenant via `/api/shops/resolve-host`, rewrite `/` → `/shops/{slug}`, block platform-only paths (`/login`, `/signup`, `/seller`, …) with redirect to the shop home |
| **Unknown host** | Pass through (Next.js 404) — never rewrite with an empty/guessed slug |

If `/login` 404s on the apex domain, check env: `NEXT_PUBLIC_SHOP_BASE_DOMAIN` / `NEXT_PUBLIC_WEB_URL` must match the host you’re browsing (e.g. set both to `lvh.me:3000` when using `lvh.me`, not `localhost:3000`). A mismatch can make the middleware treat the apex as a shop host and rewrite `/login` → `/shops/{slug}/login` (no such route → 404).

### Shop vs platform layouts

- `(platform)` — marketplace, auth, dashboards, About/Support/legal (platform)
- `(shop)/shops/[slug]` — `ShopNav` + `ShopFooter` only; Terms / Privacy / FAQ / Contact are seller-templated pages

## Phase 4 — Scale & ecosystem

| Feature | How |
|---|---|
| Custom domain | `/seller/domain` — store domain + CNAME instructions |
| Team roles | `/seller/team` — invite manager/staff |
| WhatsApp order alerts | `/seller/notifications` (+ `WHATSAPP_*` env) |
| Plans & trial | Seeded Free/Starter/Pro; 3-day trial; product limits |
| Static pages | `/about`, `/support`, `/privacy`, `/terms` |
| Admin console | `/admin` overview, settings, shops, plans, verification |

```
SHOP_BASE_DOMAIN=lvh.me:3000
NEXT_PUBLIC_SHOP_BASE_DOMAIN=lvh.me:3000
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
```

Onboarding auto-slugs shop names (`Dee's Spot` → `dees-spot`) with live availability checks.

## Phase UI-1 — Design system + app shell

Reusable UI under `apps/web/src/components/ui/` (Button, Input, Card, Modal, Badge, Dropdown, Toast) — spacing/radius/shadow via tokens only.

Auth-aware shells: `components/shell/` (`PlatformShell`, `ShopShell` / `ShopNav`, `SiteHeader`, `PlatformFooter`, `ShopFooter`, `TrustBadge`). Session from `/api/auth/me` updates the nav live on login/logout.

## State management (web)

| Layer | Tool | Where |
|---|---|---|
| Server/API data | **TanStack Query** | In-memory cache via `QueryClient` (`AppProviders`) |
| Client UI state | **Zustand** | `apps/web/src/stores/ui.ts` |
| Auth | httpOnly cookies | API — not in the client store |
| Theme | `next-themes` | `vendors-theme` key |

Hooks live under `apps/web/src/hooks/` (`use-catalog`, `use-buyer`, `use-seller`). Query keys in `apps/web/src/lib/query-keys.ts`.

## Tenant isolation

**Never trust a client-supplied tenant id.**

| Route type | Resolver |
|---|---|
| Seller routes | `resolveTenantFromMembership` → `tenantWhere` |
| Public shop / cart / checkout | `resolveTenantFromSlug` → `tenantWhere` |
| Custom domain host | `resolveTenantFromHost` via `/api/shops/resolve-host` |
| Marketplace catalog | Active products only (platform-wide) |

## Config split

- **`.env`:** JWT, Google, Paystack, Resend, OpenAI, WhatsApp, `DATABASE_URL`, Redis, `SHOP_BASE_DOMAIN`  
- **`platform_settings`:** `app_name`, `ai_features_enabled`, `watermark_default_on`, `commission_percent`, etc.

## Acceptance

### Phase 0
- Email/password + Google auth; tenants scoped; platform settings; theme toggle

### Phase 1
- Seller onboarding lists a product  
- Marketplace filters work  
- Buyer pays via Paystack → order `paid`  
- Invoice PDF + Resend confirmation  
- Seller/buyer dashboards  

### Phase 2
- Unverified shop warning + verified badge after admin approval  
- Seller popup campaigns (`on_visit`) on storefront  
- Product reviews (paid buyers only)  
- OG share image + copy link  
- Signup walkthrough + shop swipe animation  

### Phase 3
- AI description jobs via BullMQ + Redis (`pnpm worker`)  
- Enhance + watermark gated by `ai_features_enabled`  
- Onboarding logo presets / generate  
- Seller analytics on `/seller`  

### Phase 4
- Custom domain linking (CNAME instructions; SSL stub)  
- Multi-admin team invite (owner/manager/staff)  
- WhatsApp paid-order notifications (or log-skip without keys)  
- Plans + 3-day trial + product limit gating  
- Static About / Support / Privacy / Terms  

Phase 5 (mobile) is not included.
