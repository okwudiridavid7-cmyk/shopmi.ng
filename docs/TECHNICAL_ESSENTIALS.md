# Shopmi.ng — Processes & Technical Essentials

Last updated: 2026-09-25

## Stack

| Layer | Tech |
|---|---|
| Monorepo | pnpm workspaces + Turbo |
| Web | Next.js 14 (App Router), React 18, Tailwind, TanStack Query |
| API | Express + Prisma + PostgreSQL |
| Jobs | BullMQ worker + Redis |
| Auth | JWT cookies + optional Google OAuth |
| Deploy | Render Blueprint (`render.yaml`) + Neon Postgres + Cloudflare DNS |

Packages: `apps/web`, `apps/api`, `packages/shared-types`.

## Local development

1. Start infra: `docker compose up -d`  
   - Postgres on **5433** (avoids conflict with other local DBs on 5432)  
   - Redis on **6379**
2. Env: copy `.env.example` → `.env` (root). `DATABASE_URL` / `DIRECT_URL` must use port **5433** locally.
3. Schema + seed:
   ```bash
   pnpm --filter @vendors/api exec prisma db push
   pnpm --filter @vendors/api exec tsx prisma/seed.ts
   ALLOW_DEMO_SEED=true pnpm --filter @vendors/api exec tsx prisma/seed-demo.ts
   ```
4. Dev servers: `pnpm dev` → web `http://localhost:3000`, API `http://localhost:4000`.

## Production deploy (summary)

1. Neon: pooled URL → `DATABASE_URL`, direct → `DIRECT_URL` on `shopmi-api` + `shopmi-worker`.
2. Render Blueprint: `shopmi-web`, `shopmi-api`, `shopmi-worker`, `shopmi-redis`.
3. Build commands install pnpm via npm (`npm install -g pnpm@9.15.0 && … --prod=false`) — Corepack keyid issues on older Node.
4. After API is live: `prisma db push` (+ optional seed) in API shell.
5. DNS: Cloudflare CNAMEs to Render hosts; `NEXT_PUBLIC_API_URL` / `API_URL` = `https://api.shopmi.ng`.
6. Secrets: JWT, Resend, Paystack, Turnstile, Google callback must match production URLs.

Full checklist: [DEPLOY.md](../DEPLOY.md).

## Auth & roles

- Roles: `buyer`, `seller`, `tenant_admin`, `super_admin`.
- Dashboard shells use `AuthGuard` with mode-specific roles (`DashboardShell`).
- API admin routes: `requireRoles("super_admin")`.
- Cookies: access + refresh; `COOKIE_DOMAIN=.shopmi.ng` in prod.

## Dashboards (UI)

| Mode | Route prefix | Layout |
|---|---|---|
| Admin | `/admin` | `DashboardShell mode="admin"` |
| Seller | `/seller` | `DashboardShell mode="seller"` |
| Buyer | `/buyer` | `DashboardShell mode="buyer"` |

- Shared chrome: fixed full-height sidebar + scrollable main (`dashboard-shell` / `dashboard-sidebar`).
- Nav config: [`dashboard-nav-config.ts`](../apps/web/src/lib/dashboard-nav-config.ts) — grouped categories per mode.
- Overview heroes/metrics: `AdminHero` / `AdminHeroMetric` / `AdminMetricCard` (presentation-only; reused on seller/buyer).
- Theme: light/dark via `next-themes` (`vendors-theme`); tokens in `apps/web/src/app/globals.css`.
- Command palette: ⌘K / Ctrl+K.

### Seller sidebar branding

- Shop logo from `useSellerBranding` (expanded).
- Collapsed: favicon (`/favicon.png`).
- Footer: “Powered by” Shopmi.ng mark, then collapse control.

## Data fetching

- TanStack Query hooks in `apps/web/src/hooks/*`.
- Keys in `apps/web/src/lib/query-keys.ts`.
- Admin overview: `useAdminOverview(period)` → `GET /api/admin/overview?period=`.
- Seller: `useSellerAnalytics`, `useSellerPlan`, `useSellerStats`, …
- Buyer: `useBuyerOrders`, `useBuyerFavorites`, …

Do **not** invent KPI numbers in UI — omit sparklines/trends when no real series exists.

## Design tokens & fonts

- CSS variables: `--color-*`, `--shell-*` (light + `.dark`).
- Font: **Montserrat** site-wide (`--font-sans` / `--font-display` both Montserrat). Headings use `font-semibold` / `font-bold`.
- Brand orange: `#ff822e`.

## Important constraints

- Prefer presentation changes over API/schema changes unless required.
- Do not rename `/admin/tenants` routes to “shops” in URLs.
- Contact forms require Turnstile keys in production (fail-closed).
- Worker must share DB + Redis + JWT + mail env with API.

## Useful commands

```bash
pnpm --filter @vendors/web exec tsc --noEmit
pnpm --filter @vendors/api exec tsc --noEmit
pnpm --filter @vendors/web test
pnpm --filter @vendors/web build
```
