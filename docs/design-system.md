# Design system (locked)

Source of truth for visual decisions. Tokens live in `apps/web/src/app/globals.css` and map through Tailwind. Do not invent ad hoc colors, radii, or spacing outside this set.

## Brand

| Asset | Path |
|-------|------|
| Favicon | `/favicon.png` |
| Logo (light mode) | `/brand/logo-light.png` |
| Logo (dark mode) | `/brand/logo-dark.png` |
| Verified tick | `/brand/verified-tick.png` |

Primary brand color: **`#ff822e`**. Supporting palette: white, warm grays/blacks, lighter (`accent-soft`) and deeper (`accent-deep`) orange, plus soft orange gradients on the page wash.

## Typography

| Role | Token / class | Family |
|------|---------------|--------|
| Body UI | `--font-sans` / `font-sans` | Montserrat |
| Display / headings | `--font-display` / `font-display` | Montserrat (semibold / bold) |

Headings (`h1`–`h4`) use moderately bold weights (`font-semibold` / `font-bold`) site-wide.

## Spacing scale

`--space-1` … `--space-8` → Tailwind `p-token-*`, `gap-token-*`, etc.

## Radii & elevation

- Radii: `--radius-sm|md|lg` → `rounded-sm|md|lg`
- Shadows: `--shadow-sm|md|lg` → `shadow-sm|md|lg`

## Color tokens (light / dark)

| Token | Role |
|-------|------|
| `background` / `foreground` | Page surface & primary text |
| `muted` / `muted-foreground` | Secondary surfaces & meta text |
| `border` | Dividers, card edges |
| `card` / `card-foreground` | Elevated surfaces |
| `accent` / `accent-foreground` | **Actions & emphasis only** (`#ff822e` / white) |
| `accent-soft` / `accent-deep` | Soft fills / hover-deep |
| `warning` / `danger` / `success` | Semantic status |

Shell modes (`seller`, `buyer`, `admin`) remint `--color-accent` for role context — still action/emphasis only. Shop shells use the seller’s brand color.

## Accent usage

Use accent for:

- Primary buttons and active nav/filter states
- Search submit / key CTAs
- Discount badge (max one badge per card)
- Focus rings

Do **not** use accent as a decorative wash on banners, every badge, every icon row, or large backgrounds simultaneously.

## Buttons

- **Primary:** solid `bg-accent text-accent-foreground` (Add to Cart / main actions)
- **Secondary:** muted/outline surface — clearly different from primary (Buy Now pairing)

## Cards & surfaces

Prefer `bg-card border-border rounded-lg shadow-sm` for informational cards (delivery, seller trust). Footers: `bg-muted/40` with clear type hierarchy.

## Badges

**Max one priority badge per card/item.** Discount % wins over any other badge.

## Empty / zero data (trust)

Omit zero or empty stats rather than showing them as negative signals:

- No reviews → hide star row
- 0 sales → omit sales line
- Quality % / Delivery % → hide until `ordersCompletedCount >= 10`

## Section headers

One treatment everywhere: `SectionHeader` (`font-display` title + optional muted subtitle).

## Verified badge

Single component: `VerifiedBadge` → `/brand/verified-tick.png`. Do not recolor per call site.

## Marketplace UX (structure cues from category / PDP patterns)

Listing: left filter sidebar, result count + sort above grid, breadcrumb for category depth, numbered pagination.

PDP: gallery + thumbnails; buy box (price, qty, Add to Cart / Buy Now); delivery & seller trust cards; reviews with rating breakdown bars; “More from seller” + related carousels.
