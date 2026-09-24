"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { loginUrl } from "@/lib/auth-redirect";
import { SkeletonLines } from "@/components/skeleton";

type Props = {
  children: ReactNode;
  /** Optional role check — redirects away if wrong role. */
  roles?: string[];
};

/**
 * Shared guard for protected dashboards.
 * Unauthenticated → /login?returnTo=<current path>. Never renders API error text.
 */
export function AuthGuard({ children, roles }: Props) {
  const { user, loading, isAuthenticated } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace(loginUrl(pathname));
      return;
    }
    if (roles?.length && user && !roles.includes(user.role)) {
      router.replace("/");
    }
  }, [loading, isAuthenticated, pathname, router, roles, user]);

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-token-4 px-token-4 py-token-10">
        <SkeletonLines count={4} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-token-4 px-token-4 py-token-10">
        <SkeletonLines count={2} />
        <p className="text-sm text-muted-foreground">Redirecting to sign in…</p>
      </div>
    );
  }

  if (roles?.length && user && !roles.includes(user.role)) {
    return null;
  }

  return <>{children}</>;
}
