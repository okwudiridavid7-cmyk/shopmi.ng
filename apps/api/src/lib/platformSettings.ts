import { prisma } from "../db/prisma";

export async function getPlatformSetting(
  key: string,
  fallback = ""
): Promise<string> {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  return row?.value ?? fallback;
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

/** Platform trial length (days) for new shops — falls back to plan/default. */
export async function getPlatformTrialDays(fallback = 3): Promise<number> {
  const raw = await getPlatformSetting("trial_days", String(fallback));
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}
