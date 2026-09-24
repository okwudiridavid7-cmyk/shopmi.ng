"use client";

import { useQuery } from "@tanstack/react-query";
import type { PlatformBranding } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";

/** Used only until /api/tenants/config returns. Admin `app_name` is the source of truth. */
export const FALLBACK_APP_NAME = "Shopmi.ng";
export const FALLBACK_WEB_URL =
  process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000";

export function usePlatformBranding() {
  return useQuery({
    queryKey: ["platform", "branding"] as const,
    queryFn: async () => {
      const res = await apiFetch<{ branding?: PlatformBranding }>(
        "/api/tenants/config"
      );
      if (!res.branding) {
        throw new Error("Branding config missing");
      }
      return res.branding;
    },
    staleTime: 15_000,
  });
}

export function useAppName(): string {
  return usePlatformBranding().data?.appName ?? FALLBACK_APP_NAME;
}
