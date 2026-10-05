"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { PLATFORM_CONFIG_TAG } from "@/lib/marketing-data";

/** Drops cached pages so a newly saved palette shows everywhere. Only clears caches, so it is safe to expose. */
export async function refreshPlatformPalette(): Promise<void> {
  revalidateTag(PLATFORM_CONFIG_TAG);
  revalidatePath("/", "layout");
}
