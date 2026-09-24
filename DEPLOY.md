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

1. Hostile review still has **High** findings (confirm auto-POST, worker ops, XFF). Ship platform contact only with Turnstile keys + worker always on; keep `SHOP_CONTACT_CONFIRM_REQUIRED=false` until confirm UX is fixed.
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

Worker must share `DATABASE_URL`, `REDIS_URL`, `RESEND_API_KEY`, `EMAIL_FROM`, and the same JWT/app URLs.

---

## 5. Third-party callbacks

| Provider | Value |
|---|---|
| Paystack webhook | `https://api.shopmi.ng/api/paystack/webhook` |
| Paystack callback | `{WEB_URL}/checkout/callback` |
| Google OAuth redirect | `https://api.shopmi.ng/api/auth/google/callback` |
| Resend domain | Verify `shopmi.ng` (SPF/DKIM in Cloudflare DNS) |
| Turnstile hostnames | `shopmi.ng`, `*.shopmi.ng` |

---

## 6. Smoke test

1. `https://api.shopmi.ng/health` → OK  
2. `https://shopmi.ng` loads  
3. Admin login with seed super-admin  
4. Create a shop → `https://{slug}.shopmi.ng` resolves  
5. Contact form with Turnstile succeeds only with worker running  
6. Paystack test charge (test keys) if not going live on payments yet  

---

## 7. Local → prod checklist

- [ ] Code on GitHub `main`  
- [ ] Neon Postgres provisioned (`DATABASE_URL` + `DIRECT_URL`) + `prisma db push` + seed  
- [ ] Redis linked to API + worker  
- [ ] Worker service **running** (contact mail will not send without it)  
- [ ] Cloudflare DNS + Full strict SSL  
- [ ] Turnstile + Resend domain verified  
- [ ] Cookies work cross-subdomain (`COOKIE_DOMAIN=.shopmi.ng`)  
- [ ] CORS allows apex + www; shop hosts under `SHOP_BASE_DOMAIN`  

---

## Uploads note

API stores uploads under `apps/api/uploads` on local disk. On Render’s ephemeral filesystem those files **disappear on redeploy**. For production images, plan S3/R2 soon; until then treat uploads as non-durable.
