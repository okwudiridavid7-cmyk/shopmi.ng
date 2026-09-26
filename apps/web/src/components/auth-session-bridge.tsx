"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { setUnauthorizedHandler } from "@/lib/api";
import { setAuthUser } from "@/lib/auth-store";
import { loginUrl } from "@/lib/auth-redirect";
import { useAuthTransition } from "@/stores/auth-transition";
import { AuthTransitionOverlay } from "@/components/auth-transition-overlay";

function isAuthPath(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/signup") ||
    pathname.startsWith("/forgot-password") ||
    pathname.startsWith("/reset-password")
  );
}

/**
 * Global 401 → preserve return URL + calm redirect to login.
 * Never surfaces "Authentication required" in the UI.
 */
export function AuthSessionBridge({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const show = useAuthTransition((s) => s.show);
  const handling = useRef(false);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (handling.current) return;
      if (isAuthPath(pathname)) return;

      handling.current = true;
      setAuthUser(null);

      const returnPath =
        typeof window !== "undefined"
          ? `${window.location.pathname}${window.location.search}`
          : pathname;

      show("session-expired", {
        nextHref: loginUrl(returnPath),
      });

      // Ensure login actually opens even if the overlay soft-nav fails.
      window.setTimeout(() => {
        window.location.assign(loginUrl(returnPath));
      }, 500);

      window.setTimeout(() => {
        handling.current = false;
      }, 2500);
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
