"use client";

import type { ReactNode } from "react";
import { useSellerPlan } from "@/hooks/use-seller";
import { QueryErrorState } from "@/components/empty-state";
import { SkeletonLines } from "@/components/skeleton";

/**
 * Blocks seller dashboard content until the user has a shop membership.
 * Without this, every `/api/seller/*` call returns 403 and pages dump raw errors.
 */
export function SellerTenantGate({ children }: { children: ReactNode }) {
  const plan = useSellerPlan();

  if (plan.isLoading && !plan.data) {
    return <SkeletonLines count={5} />;
  }

  if (plan.isError) {
    return (
      <QueryErrorState
        error={plan.error}
        onRetry={() => {
          void plan.refetch();
        }}
        sellerHomeHref="/"
      />
    );
  }

  return <>{children}</>;
}
