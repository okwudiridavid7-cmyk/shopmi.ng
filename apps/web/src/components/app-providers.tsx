"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { AuthSessionBridge } from "@/components/auth-session-bridge";
import { ComingSoonProvider } from "@/components/coming-soon";
import { CookieConsentProvider } from "@/components/cookie-consent";
import { NavigationProgress } from "@/components/navigation-progress";

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: (failureCount, error) => {
              if (
                error &&
                typeof error === "object" &&
                "status" in error &&
                (error as { status: number }).status === 401
              ) {
                return false;
              }
              return failureCount < 1;
            },
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationProgress />
      <CookieConsentProvider>
        <ComingSoonProvider>
          <AuthSessionBridge>{children}</AuthSessionBridge>
        </ComingSoonProvider>
      </CookieConsentProvider>
    </QueryClientProvider>
  );
}
