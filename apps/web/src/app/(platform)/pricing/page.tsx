"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { HelpCircle, LogOut } from "lucide-react";
import type { PlanPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useAppName, usePlatformBranding } from "@/hooks/use-branding";
import { Button } from "@/components/ui/button";
import PricingSection from "@/components/ui/pricing-section";

const outlineSmClass =
  "inline-flex items-center justify-center gap-1.5 rounded-sm border border-border bg-card px-token-3 py-token-1 text-xs font-medium text-foreground shadow-sm transition hover:bg-muted";

export default function PricingPage() {
  const appName = useAppName();
  const branding = usePlatformBranding();
  const { user, logout } = useAuth();

  const billingOff =
    branding.isSuccess && branding.data?.billingEnabled === false;

  const { data, isLoading, error } = useQuery({
    queryKey: ["plans", "public"],
    queryFn: async () =>
      apiFetch<{ billingEnabled: boolean; plans: PlanPublic[] }>("/api/plans"),
    enabled: !billingOff,
  });

  if (billingOff || data?.billingEnabled === false) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Pricing unavailable
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Plan billing is currently turned off. You can still start selling —
          contact support if you need a custom arrangement.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/onboarding"
            className="inline-flex items-center justify-center rounded-md bg-accent px-token-6 py-token-3 text-sm font-medium text-white shadow-sm transition hover:bg-accent-deep"
          >
            Start free trial
          </Link>
          <Link href="/contact" className={outlineSmClass}>
            Contact us
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-end gap-2 px-4 pt-6 sm:px-6">
        <Link href="/support" className={outlineSmClass}>
          <HelpCircle className="h-4 w-4" />
          Need Help?
        </Link>
        {user ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void logout()}
          >
            <LogOut className="h-4 w-4" />
            Log Out
          </Button>
        ) : (
          <Link href="/login" className={outlineSmClass}>
            Sign in
          </Link>
        )}
      </div>

      <PricingSection
        plans={data?.plans ?? []}
        appName={appName}
        loading={isLoading}
        error={Boolean(error)}
      />
    </div>
  );
}
