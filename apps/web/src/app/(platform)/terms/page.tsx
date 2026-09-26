"use client";

import { LegalDoc } from "@/components/legal-doc";
import { useAppName, usePlatformBranding } from "@/hooks/use-branding";
import { platformTermsOfService } from "@/lib/legal";

export default function TermsPage() {
  const appName = useAppName();
  const b = usePlatformBranding().data;
  return (
    <LegalDoc
      title="Terms of Service"
      body={platformTermsOfService(
        appName,
        b?.webUrl ?? "",
        b?.supportEmail ?? "support@shopmi.ng"
      )}
    />
  );
}
