import type { ShopThemeSettings } from "@vendors/shared-types";

/** Default CTA label color on brand-colored buttons. */
export const BRAND_BUTTON_TEXT = "#ffffff";
/** Fallback dark text when brand is too light for white. */
export const BRAND_BUTTON_TEXT_DARK = "#0a0a0a";

export function parseThemeSettings(
  value: unknown
): ShopThemeSettings {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  const t = value as Record<string, unknown>;
  return {
    logoUrl: typeof t.logoUrl === "string" ? t.logoUrl : null,
    logoRectUrl: typeof t.logoRectUrl === "string" ? t.logoRectUrl : null,
    logoBuilder:
      t.logoBuilder && typeof t.logoBuilder === "object"
        ? (t.logoBuilder as ShopThemeSettings["logoBuilder"])
        : null,
    primaryColor:
      typeof t.primaryColor === "string" ? t.primaryColor : null,
    accentColor: typeof t.accentColor === "string" ? t.accentColor : null,
    shopDescription:
      typeof t.shopDescription === "string" ? t.shopDescription : null,
    contactEmail: typeof t.contactEmail === "string" ? t.contactEmail : null,
    contactPhone: typeof t.contactPhone === "string" ? t.contactPhone : null,
    contactFormEnabled: t.contactFormEnabled !== false,
    promoProductsEnabled: t.promoProductsEnabled === true,
    newArrivalsEnabled: t.newArrivalsEnabled === true,
    newArrivalsDays:
      typeof t.newArrivalsDays === "number" && t.newArrivalsDays > 0
        ? t.newArrivalsDays
        : 30,
    tickerEnabled: t.tickerEnabled === true,
    tickerText: typeof t.tickerText === "string" ? t.tickerText : null,
    tickerSpeed:
      typeof t.tickerSpeed === "number" && t.tickerSpeed > 0
        ? t.tickerSpeed
        : 12,
    tickerBg: typeof t.tickerBg === "string" ? t.tickerBg : null,
    tickerColor: typeof t.tickerColor === "string" ? t.tickerColor : null,
    whatsappUrl: typeof t.whatsappUrl === "string" ? t.whatsappUrl : null,
    chatbotHtml: typeof t.chatbotHtml === "string" ? t.chatbotHtml : null,
  };
}

function expandHex(hex: string): string {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  return `#${h}`;
}

export function parseHexColor(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) return null;
  return expandHex(trimmed).toLowerCase();
}

function relativeLuminance(hex: string): number {
  const full = expandHex(hex).slice(1);
  const rgb = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rgb[0]! + 0.7152 * rgb[1]! + 0.0722 * rgb[2]!;
}

/** WCAG contrast ratio between two hex colors. */
export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type BrandContrastResult = {
  ok: boolean;
  ratio: number;
  /** Suggested button text when brand fails white-text contrast. */
  suggestedTextColor: string;
  warning: string | null;
};

/**
 * Check brand color against platform button text (white).
 * Threshold 4.5:1 for normal text / UI labels on CTAs.
 */
export function checkBrandContrast(
  brandHex: string | null | undefined
): BrandContrastResult {
  const brand = parseHexColor(brandHex);
  if (!brand) {
    return {
      ok: true,
      ratio: 21,
      suggestedTextColor: BRAND_BUTTON_TEXT,
      warning: null,
    };
  }
  const vsWhite = contrastRatio(brand, BRAND_BUTTON_TEXT);
  if (vsWhite >= 4.5) {
    return {
      ok: true,
      ratio: vsWhite,
      suggestedTextColor: BRAND_BUTTON_TEXT,
      warning: null,
    };
  }
  const vsDark = contrastRatio(brand, BRAND_BUTTON_TEXT_DARK);
  return {
    ok: false,
    ratio: vsWhite,
    suggestedTextColor:
      vsDark >= 4.5 ? BRAND_BUTTON_TEXT_DARK : BRAND_BUTTON_TEXT,
    warning:
      `This brand color has low contrast with default button text (${vsWhite.toFixed(1)}:1). ` +
      (vsDark >= 4.5
        ? "Prefer dark button text, or pick a deeper brand color."
        : "Pick a deeper brand color so CTAs stay readable."),
  };
}

/** Resolve CTA text color for a brand fill — never silently unreadable. */
export function brandButtonTextColor(
  brandHex: string | null | undefined
): string {
  return checkBrandContrast(brandHex).suggestedTextColor;
}
