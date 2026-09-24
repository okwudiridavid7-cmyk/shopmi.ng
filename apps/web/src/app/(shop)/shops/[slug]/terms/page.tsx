"use client";

import { useEffect, useState } from "react";
import type { TenantPublic } from "@vendors/shared-types";
import { LegalDoc } from "@/components/legal-doc";
import { useAppName } from "@/hooks/use-branding";
import { apiFetch } from "@/lib/api";
import { shopTermsOfService } from "@/lib/legal";

export default function ShopTermsPage({
  params,
}: {
  params: { slug: string };
}) {
  const [tenant, setTenant] = useState<TenantPublic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const appName = useAppName();

  useEffect(() => {
    apiFetch<{ tenant: TenantPublic }>(`/api/shops/${params.slug}`)
      .then((r) => setTenant(r.tenant))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load")
      );
  }, [params.slug]);

  if (error) {
    return <p className="text-sm text-danger">{error}</p>;
  }

  const name = tenant?.name ?? "This shop";
  const text =
    tenant?.termsText?.trim() || shopTermsOfService(name, appName);

  return <LegalDoc title="Terms of Service" body={text} />;
}
