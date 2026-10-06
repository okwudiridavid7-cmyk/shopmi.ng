import { prisma } from "../db/prisma";
import { CHAT_EMBED_SETTING_KEY, parseChatEmbed } from "./chatEmbed";
import { isHttpsUrl, isSafeLink, isWhatsappTarget } from "./safeUrl";

export const MAX_COMMISSION_PERCENT = 30;

/**
 * All settings are read with one query and memoised briefly per process, so a
 * request that checks a dozen flags costs a single DB round trip.
 */
const SETTINGS_TTL_MS = 15_000;
let snapshot: { at: number; values: Map<string, string> } | null = null;
let inflight: Promise<Map<string, string>> | null = null;

async function loadSettings(): Promise<Map<string, string>> {
  if (snapshot && Date.now() - snapshot.at < SETTINGS_TTL_MS) return snapshot.values;
  if (inflight) return inflight;
  inflight = prisma.platformSetting
    .findMany({ select: { key: true, value: true } })
    .then((rows) => {
      const values = new Map(rows.map((r) => [r.key, r.value]));
      snapshot = { at: Date.now(), values };
      return values;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/** Call after writing platform settings so this process sees them immediately. */
export function invalidatePlatformSettings(): void {
  snapshot = null;
}

export async function getPlatformSetting(
  key: string,
  fallback = ""
): Promise<string> {
  const values = await loadSettings();
  return values.get(key) ?? fallback;
}

export async function isAiFeaturesEnabled(): Promise<boolean> {
  return (await getPlatformSetting("ai_features_enabled", "false")) === "true";
}

export async function isWatermarkDefaultOn(): Promise<boolean> {
  return (await getPlatformSetting("watermark_default_on", "true")) === "true";
}

export async function isVerificationRequired(): Promise<boolean> {
  return (await getPlatformSetting("verification_required", "false")) === "true";
}

/** When false, hide public pricing / plan CTAs site-wide. */
export async function isBillingEnabled(): Promise<boolean> {
  return (await getPlatformSetting("billing_enabled", "true")) !== "false";
}

/** Platform trial length (days) for new shops - falls back to plan/default. */
export async function getPlatformTrialDays(fallback = 3): Promise<number> {
  const raw = await getPlatformSetting("trial_days", String(fallback));
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export async function getCommissionPercent(fallback = 5): Promise<number> {
  const raw = await getPlatformSetting("commission_percent", String(fallback));
  const n = Number.parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? Math.min(n, MAX_COMMISSION_PERCENT) : fallback;
}

export const PALETTE_SETTING_KEY = "platform_palette";

export type PlatformPalette = { primary: string; secondary: string; text: string; accent: string };

const HEX = /^#[0-9a-f]{6}$/i;
const PALETTE_FIELDS = ["primary", "secondary", "text", "accent"] as const;

/** Parses the stored palette JSON. Returns null when missing or malformed so the site falls back to the default. */
export function parsePalette(raw: string | null | undefined): PlatformPalette | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    if (!o || typeof o !== "object") return null;
    if (!PALETTE_FIELDS.every((f) => typeof o[f] === "string" && HEX.test(o[f] as string))) return null;
    return Object.fromEntries(
      PALETTE_FIELDS.map((f) => [f, (o[f] as string).toLowerCase()])
    ) as PlatformPalette;
  } catch {
    return null;
  }
}

export async function getPlatformPalette(): Promise<PlatformPalette | null> {
  return parsePalette(await getPlatformSetting(PALETTE_SETTING_KEY, ""));
}

/** Per-key value checks for settings that the web app renders directly. Returns an error message or null. */
export function settingValueError(key: string, value: string): string | null {
  if (key === PALETTE_SETTING_KEY && value !== "" && !parsePalette(value)) {
    return "Palette must be JSON with primary, secondary, text and accent as #rrggbb colours";
  }
  if (key === "commission_percent") {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0 || n > MAX_COMMISSION_PERCENT) {
      return `Commission must be between 0 and ${MAX_COMMISSION_PERCENT}`;
    }
  }
  if (key === RETIRED_CHATBOT_HTML_KEY && value !== "") {
    return "Raw chatbot HTML is no longer supported. Pick a chat provider instead.";
  }
  if (key === CHAT_EMBED_SETTING_KEY && value !== "" && !parseChatEmbed(value)) {
    return "Chat widget must be a supported provider with a valid widget ID";
  }
  if (key === "whatsapp_url" && value !== "" && !isWhatsappTarget(value)) {
    return "Use a wa.me link or a phone number";
  }
  if ((key === "platform_logo_url" || key === "platform_logo_square_url") && value !== "" && !isHttpsUrl(value)) {
    return "Logo must be an https:// URL";
  }
  if (key === "homepage_banners" && value !== "") {
    try {
      const slides = JSON.parse(value) as unknown;
      if (!Array.isArray(slides)) return "Banners must be a JSON array";
      for (const s of slides as Record<string, unknown>[]) {
        if (typeof s?.imageUrl === "string" && s.imageUrl && !isHttpsUrl(s.imageUrl)) {
          return "Banner images must be https:// URLs";
        }
        if (typeof s?.ctaUrl === "string" && s.ctaUrl && !isSafeLink(s.ctaUrl)) {
          return "Banner links must be https:// URLs or paths starting with /";
        }
      }
    } catch {
      return "Banners must be valid JSON";
    }
  }
  return null;
}

export const RETIRED_CHATBOT_HTML_KEY = "chatbot_html";
