"use server";

import { cookies } from "next/headers";
import { revalidatePath, revalidateTag } from "next/cache";
import { PLATFORM_CONFIG_TAG } from "@/lib/marketing-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function isSuperAdmin(): Promise<boolean> {
  const token = (await cookies()).get("access_token")?.value;
  if (!token) return false;
  try {
    const res = await fetch(`${API_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { user?: { role?: string } };
    return data.user?.role === "super_admin";
  } catch {
    return false;
  }
}

/** Drops cached pages so a newly saved palette shows everywhere. Super admins only. */
export async function refreshPlatformPalette(): Promise<void> {
  if (!(await isSuperAdmin())) return;
  revalidateTag(PLATFORM_CONFIG_TAG);
  revalidatePath("/", "layout");
}
