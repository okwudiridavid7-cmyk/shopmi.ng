import { prisma } from "../db/prisma";
import { isWatermarkDefaultOn } from "./platformSettings";

export type WatermarkPrefs = {
  platformDefault: boolean;
  shopOverride: boolean | null;
};

export async function getWatermarkPrefs(
  tenantId: string
): Promise<WatermarkPrefs> {
  const [platformDefault, tenant] = await Promise.all([
    isWatermarkDefaultOn(),
    prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { notificationSettings: true },
    }),
  ]);
  const settings =
    (tenant?.notificationSettings as Record<string, unknown> | null) ?? {};
  const shopOverride =
    typeof settings.watermarkDefaultOn === "boolean"
      ? settings.watermarkDefaultOn
      : null;
  return { platformDefault, shopOverride };
}

/** Effective default for new products / uploads when product has no explicit value yet. */
export async function resolveShopWatermarkDefault(
  tenantId: string
): Promise<boolean> {
  const { platformDefault, shopOverride } = await getWatermarkPrefs(tenantId);
  return shopOverride ?? platformDefault;
}
