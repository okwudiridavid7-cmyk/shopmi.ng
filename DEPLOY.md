# Production deploy — shopmi.ng (GitHub → Render → Cloudflare)

Target stack:

| Piece | Service |
|---|---|
| Git | [github.com/okwudiridavid7-cmyk/shopmi.ng](https://github.com/okwudiridavid7-cmyk/shopmi.ng) |
| Web | Render `shopmi-web` → `https://shopmi.ng` |
| API | Render `shopmi-api` → `https://api.shopmi.ng` |
| Worker | Render `shopmi-worker` (background) |
| Redis | Render Redis / Key Value |
| Postgres | **Neon** (or any Postgres) — set `DATABASE_URL` + `DIRECT_URL` |
| DNS / TLS | Cloudflare on `shopmi.ng` |

Blueprint file: [`render.yaml`](./render.yaml)

---

## 0. Before you click Deploy

1. Run the test suites locally (see section 8) and make sure they pass. Keep `SHOP_CONTACT_CONFIRM_REQUIRED=false` until the confirm UX is fixed, and keep the worker always on.
2. Provision **PostgreSQL** (Neon recommended). In Neon, copy:
   - **Pooled** connection string → `DATABASE_URL`
   - **Direct** (non-pooler) connection string → `DIRECT_URL`  
   Rotate any password that was shared in chat before using it in production.
3. Have accounts ready: Render, Cloudflare (domain already linked), Resend, Paystack, Cloudflare Turnstile, optional Google OAuth.

---

## 1. GitHub

Repo: `https://github.com/okwudiridavid7-cmyk/shopmi.ng.git`

If this machine already pushed `main`, skip to Render. Otherwise:

```bash
cd /path/to/vendors
git remote -v   # should show origin → that repo
git push -u origin main
```

In GitHub → Settings → Collaborators: ensure the Render GitHub App can access the repo.

---

## 2. Render

### Option A — Blueprint (recommended)

1. Render Dashboard → **New** → **Blueprint**
2. Connect the `shopmi.ng` GitHub repo
3. Select branch `main`, confirm `render.yaml`
4. Fill every `sync: false` env var (see table below)
5. Create resources: `shopmi-web`, `shopmi-api`, `shopmi-worker`, Redis

### Option B — Manual services

Create three Node services + one Redis, same build/start commands as in `render.yaml`.

### After first successful API build

Open **shopmi-api** → Shell (or one-off job) and run schema + seed:

```bash
cd /opt/render/project/src   # or the service root Render shows
npm install -g pnpm@9.15.0
pnpm --filter @vendors/api exec prisma db push
pnpm --filter @vendors/api exec tsx prisma/seed.ts
```

### Schema changes on later deploys

`shopmi-api` runs this as its **Pre-Deploy Command**:

```bash
pnpm --filter @vendors/api run db:release
```

It does three things in order, and the deploy stops if any of them fails:

1. `prisma db push --skip-generate` brings the schema up to date. It does not pass `--accept-data-loss`, so a change that would drop data fails the deploy instead of running.
2. `prisma/sync-plans.ts` writes the plan catalogue (prices, limits, AI quotas, WhatsApp and domain flags).
3. `prisma/data-migrations.ts` runs idempotent data fixes. It is safe to run on every deploy.

Blueprint sync does not always update an existing service. Open **shopmi-api → Settings → Build & Deploy → Pre-Deploy Command** and make sure it is exactly the line above. If it still says `prisma db push --skip-generate`, plans and data fixes will not run.

### If deploys still fail with Corepack `keyid` or npm 404 `@vendors/…`

Existing Blueprint services often keep the **old** build command. For each of `shopmi-web`, `shopmi-api`, `shopmi-worker`:

1. Settings → Environment → set `NODE_VERSION` = `20.19.0`
2. Settings → Build & Deploy → paste the **single-line** `buildCommand` from [`render.yaml`](./render.yaml) (must include `&&` and `--prod=false` so Tailwind/TypeScript install under `NODE_ENV=production`)
3. Manual Deploy → Deploy latest commit

Use a strong `SUPER_ADMIN_PASSWORD` in env before seeding.

### Custom domains on Render

| Service | Custom domain |
|---|---|
| `shopmi-web` | `shopmi.ng`, `www.shopmi.ng`, `*.shopmi.ng` (if Render plan supports wildcard) |
| `shopmi-api` | `api.shopmi.ng` |

Render will show target hostnames (e.g. `shopmi-web.onrender.com`). You will CNAME to those in Cloudflare.

If Render’s plan does **not** allow `*.shopmi.ng`, put the wildcard only in Cloudflare with the same CNAME target as apex/www (Cloudflare orange-cloud proxies TLS).

---

## 3. Cloudflare DNS

Assuming the domain is already on Cloudflare:

| Type | Name | Target | Proxy |
|---|---|---|---|
| CNAME | `@` (or A/AAAA ALIAS if required) | `shopmi-web.onrender.com` | Proxied |
| CNAME | `www` | `shopmi-web.onrender.com` | Proxied |
| CNAME | `api` | `shopmi-api.onrender.com` | Proxied |
| CNAME | `*` | `shopmi-web.onrender.com` | Proxied (shop subdomains) |

**SSL/TLS** mode: **Full (strict)** once Render certificates exist.

**Important for beauty of rate limits:** Cloudflare should be the only public entry. Do not publish the raw `*.onrender.com` API if you can avoid it, or lock down with Cloudflare Access / firewall. The API uses `trust proxy` and keys rate limits on `X-Forwarded-For` — only Cloudflare (or Render) must be able to set that header.

Optional Cloudflare:
- Turnstile widget for contact (keys also go in Render env)
- Cache Rules: bypass cache for `/api/*` and authenticated HTML; cache static `_next/static`

---

## 4. Environment variables (production)

### Web (`shopmi-web`)

| Key | Example |
|---|---|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_NAME` | `Shopmi.ng` |
| `NEXT_PUBLIC_API_URL` | `https://api.shopmi.ng` |
| `NEXT_PUBLIC_WEB_URL` | `https://shopmi.ng` |
| `NEXT_PUBLIC_SHOP_BASE_DOMAIN` | `shopmi.ng` |
| `NEXT_PUBLIC_MEDIA_URL` | `https://media.shopmi.ng` (added to the CSP so product images load) |

Rebuild web after changing any `NEXT_PUBLIC_*` value.

### API + worker (shared secrets)

| Key | Example / notes |
|---|---|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | Neon **pooled** Postgres URL |
| `DIRECT_URL` | Neon **direct** (non-pooler) URL — required for `prisma db push` |
| `REDIS_URL` | From Render Redis (`rediss://…`) |
| `API_URL` | `https://api.shopmi.ng` |
| `WEB_URL` | `https://shopmi.ng` |
| `SHOP_BASE_DOMAIN` | `shopmi.ng` |
| `COOKIE_DOMAIN` | `.shopmi.ng` (leading dot) |
| `ALLOWED_ORIGINS` | `https://shopmi.ng,https://www.shopmi.ng` |
| `JWT_ACCESS_SECRET` | long random |
| `JWT_REFRESH_SECRET` | long random |
| `RESEND_API_KEY` | required for contact + order mail |
| `EMAIL_FROM` | `Shopmi.ng <noreply@shopmi.ng>` (domain verified in Resend) |
| `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | required in prod (contact fail-closed) |
| `PAYSTACK_*` | live keys when ready |
| `GOOGLE_*` | callback `https://api.shopmi.ng/api/auth/google/callback` |
| `CONTACT_CAPTCHA_BYPASS` | `false` |
| `SHOP_CONTACT_CONFIRM_REQUIRED` | keep `false` until confirm UX fixed |
| `RENDER_API_KEY` | Render account API key. Lets the API attach seller custom domains to `shopmi-web` and issue TLS |
| `RENDER_WEB_SERVICE_ID` | `srv-…` id of `shopmi-web` (from its dashboard URL) |
| `CUSTOM_DOMAIN_CNAME_TARGET` | optional, defaults to `shopmi-web.onrender.com` |
| `CUSTOM_DOMAIN_A_RECORD` | optional, defaults to `216.24.57.1` (Render's root-domain IP) |
| `GO54_API_EMAIL` | GO54 (WhoGoHost) reseller account email. Enables domain search and purchase |
| `GO54_API_KEY` | Domains Reseller API key from the GO54 client area |
| `GO54_API_URL` | optional, defaults to the live WhoGoHost Domains Reseller endpoint |
| `GO54_NAMESERVERS` | optional, defaults to `nsa.whogohost.com,nsb.whogohost.com` |
| `R2_ACCOUNT_ID` | Cloudflare account id (R2 overview page) |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | R2 API token with Object Read & Write on both buckets |
| `R2_PUBLIC_BUCKET` | e.g. `shopmi-media` (served at `media.shopmi.ng`) |
| `R2_PRIVATE_BUCKET` | e.g. `shopmi-private` (invoices, KYC). Never give it a public domain |
| `MEDIA_URL` | `https://media.shopmi.ng` |
| `ANTHROPIC_API_KEY` | AI product descriptions. Without it the Generate description button is hidden |
| `ANTHROPIC_MODEL` | optional, defaults to `claude-sonnet-4-20250514` |
| `PHOTOROOM_API_KEY` | Photoroom background removal. Without it the Enhance button is hidden |
| `WHATSAPP_TOKEN` | Meta system user token with `whatsapp_business_messaging` |
| `WHATSAPP_PHONE_NUMBER_ID` | From WhatsApp Manager → API setup |
| `WHATSAPP_TEMPLATE_NEW_ORDER` | approved template name, default `new_order` |
| `WHATSAPP_TEMPLATE_LANG` | template language code, default `en` |
| `WHATSAPP_GRAPH_VERSION` | optional, defaults to `v21.0` |
| `WHATSAPP_APP_SECRET` | API only. Meta app secret, used to check `X-Hub-Signature-256` on the webhook |
| `WHATSAPP_VERIFY_TOKEN` | API only. Any long random string; paste the same value into Meta's webhook settings |
| `ADMIN_ALERT_EMAIL` | where payment mismatches, failed refunds and bank detail changes are emailed. Falls back to the support email in platform settings |

Without the two `RENDER_*` keys, sellers can still verify DNS, but each domain has to be added to `shopmi-web` in the Render dashboard by hand before it gets a certificate.

Without the two `GO54_*` keys, the Buy domain page shows as unavailable in production (connecting an existing domain still works). Registrations are paid from the GO54 reseller wallet, so keep it funded, and whitelist the API and worker outbound IPs in the GO54 reseller settings. Retail prices per domain ending are set in Admin → Domains.

Worker must share `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, `GO54_*`, `PAYSTACK_SECRET_KEY` (it issues refunds when a paid domain registration fails), `R2_*`, `MEDIA_URL`, `ANTHROPIC_API_KEY`, `PHOTOROOM_API_KEY`, `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_TEMPLATE_*`, `ADMIN_ALERT_EMAIL`, and the same JWT/app URLs. The API also needs the AI and Photoroom keys, because it decides whether to show those buttons.

---

## 5. Third-party callbacks

| Provider | Value |
|---|---|
| Paystack webhook | `https://api.shopmi.ng/api/paystack/webhook` |
| Paystack webhook events | `charge.success`, `charge.failed`, `refund.processed`, `refund.failed` |
| Paystack callbacks | Sent per transaction (`/checkout/callback`, `/seller/plan/callback`, domain callback). Nothing to configure |
| Google OAuth redirect | `https://api.shopmi.ng/api/auth/google/callback` |
| Resend domain | Verify `shopmi.ng` (SPF/DKIM in Cloudflare DNS) |
| Turnstile hostnames | `shopmi.ng`, `*.shopmi.ng` |
| WhatsApp webhook | `https://api.shopmi.ng/api/whatsapp/webhook`, verify token = `WHATSAPP_VERIFY_TOKEN`, subscribe to `messages` |

Paystack sends webhooks to one URL per mode. Set it under Settings → API Keys & Webhooks for both test and live, and make sure the secret key in Render matches the mode you are in. Order, plan and domain payments are all fulfilled from the webhook (the callback page only re-checks), and the amount and currency are compared against what we asked for before anything is marked paid.

### WhatsApp order alerts

Sellers on a plan with WhatsApp alerts get a template message for each paid order. Business-initiated messages must use an approved template, so create one in WhatsApp Manager before turning this on:

- Name: `new_order` (or set `WHATSAPP_TEMPLATE_NEW_ORDER`), category Utility, language `en`
- Body with exactly four variables, in this order: shop name, order amount, items, order reference. For example:

  `New order for {{1}}: {{2}} for {{3}}. Reference {{4}}. Open your Shopmi.ng dashboard to fulfil it.`

Until the template is approved, sends fail and the worker retries five times before giving up. Order emails are unaffected.

---

## 6. Smoke test

After each deploy, from your machine:

```bash
pnpm smoke
```

It is read-only. It checks TLS on `shopmi.ng`, `www`, `api` and `media`, the API health, catalog and plans endpoints, that admin settings refuse anonymous requests, the home and pricing pages, that the web sends a Content-Security-Policy, and that the media origin answers. Override targets with `SMOKE_BASE`, `SMOKE_API` and `SMOKE_MEDIA` (for example to point at the `onrender.com` hosts before DNS is switched).

Then by hand:

1. Admin login with the seeded super-admin
2. Create a shop, add a product with a photo, and check the photo URL starts with `https://media.shopmi.ng/`
3. Contact form with Turnstile succeeds (the worker must be running)
4. With Paystack test keys: buy a product, pay with a test card, and check the order shows as paid for buyer and seller
5. Pay for a plan on the 1-month term and check the expiry date on the plan page

---

## 7. Cloudflare R2 (media storage)

Render's disk is wiped on every deploy and the worker cannot see the API's disk, so production files must live in R2.

1. Cloudflare → R2 → create two buckets in the same account: a public one (e.g. `shopmi-media`) and a private one (e.g. `shopmi-private`).
2. Public bucket → Settings → Custom Domains → connect `media.shopmi.ng`. Do not enable the `r2.dev` URL. Do not connect any domain to the private bucket.
3. R2 → Manage API tokens → create a token with Object Read & Write, scoped to those two buckets. Copy the access key id and secret into `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` on both `shopmi-api` and `shopmi-worker`.
4. Set `R2_ACCOUNT_ID`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `MEDIA_URL` on API and worker, and `NEXT_PUBLIC_MEDIA_URL` on web, then redeploy all three.

If any R2 variable is missing, the API logs `[storage] R2 is not configured` at startup and falls back to disk. Treat that log line as a failed deploy.

### Moving existing uploads

Images uploaded before R2 have URLs like `https://api.shopmi.ng/uploads/...`. Once R2 is configured, run this once from the **shopmi-api** Shell:

```bash
pnpm --filter @vendors/api run media:migrate --dry
pnpm --filter @vendors/api run media:migrate --from=https://api.shopmi.ng
```

The first command only reports. The second copies each file into R2 (re-encoding it through the normal image pipeline, so anything that is not a real image is dropped) and rewrites the stored URLs. It is safe to re-run. Files already lost to an earlier redeploy are reported as missing; those sellers need to re-upload.

---

## 8. Tests

Run these locally before pushing. Docker Postgres and Redis must be up; the integration and E2E suites also need `pnpm dev` running.

```bash
pnpm --filter @vendors/api test               # unit tests
pnpm --filter @vendors/api test:integration   # payments, roles, cross-tenant access
pnpm --filter @vendors/web test:e2e           # Playwright: flows + 375/768/1280 layout matrix
```

The E2E suite creates its own test accounts (`e2e.seller@example.com`, `e2e.buyer@example.com`, shop `e2e-shop`) and refuses to run against production. The Paystack checks only run when `PAYSTACK_SECRET_KEY` is a test key, and they stop at Paystack's checkout page.

---

## 9. Go-live checklist

- [ ] Code on GitHub `main`
- [ ] Neon Postgres provisioned (`DATABASE_URL` + `DIRECT_URL`)
- [ ] `shopmi-api` Pre-Deploy Command is `pnpm --filter @vendors/api run db:release`
- [ ] Redis linked to API + worker
- [ ] Worker service running
- [ ] Cloudflare DNS + Full (strict) SSL, `media.shopmi.ng` connected to the public R2 bucket
- [ ] R2 variables on API and worker, `NEXT_PUBLIC_MEDIA_URL` on web; no `[storage] R2 is not configured` in the API logs
- [ ] `media:migrate` run once
- [ ] Turnstile keys set, Resend domain verified
- [ ] Paystack webhook URL and the four events set for the mode you are in
- [ ] `ADMIN_ALERT_EMAIL` set to an inbox someone reads
- [ ] `ANTHROPIC_API_KEY` and `PHOTOROOM_API_KEY` on API and worker
- [ ] WhatsApp: template approved, webhook verified, token and phone number id set
- [ ] Cookies work cross-subdomain (`COOKIE_DOMAIN=.shopmi.ng`)
- [ ] `pnpm smoke` passes
