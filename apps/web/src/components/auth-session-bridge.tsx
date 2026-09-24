"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { setUnauthorizedHandler } from "@/lib/api";
import { getAuthSnapshot, setAuthUser } from "@/lib/auth-store";
import { loginUrl } from "@/lib/auth-redirect";
import { useAuthTransition } from "@/stores/auth-transition";
import { AuthTransitionOverlay } from "@/components/auth-transition-overlay";

/**
 * Wires global 401 → session-expired transition + login redirect.
 * Mount once under AppProviders.
 */
export function AuthSessionBridge({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const show = useAuthTransition((s) => s.show);
  const handling = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (handling.current) return;
      if (
        pathname.startsWith("/login") ||
        pathname.startsWith("/signup") ||
        pathname.startsWith("/forgot-password") ||
        pathname.startsWith("/reset-password")
      ) {
        return;
      }
      // Only treat as session expiry if we had a user — cold unauth visits use AuthGuard.
      const snap = getAuthSnapshot();
      if (!snap.user) return;

      handling.current = true;
      setAuthUser(null);
      const returnPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname;
      show("session-expired", {
        nextHref: loginUrl(returnPath),
      });
      window.setTimeout(() => {
        handling.current = false;
      }, 2000);
    });
    return () => setUnauthorizedHandler(null);
  }, [pathname, show]);

  return (
    <>
      {children}
      <AuthTransitionOverlay />
    </>
  );
}
