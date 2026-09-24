"use client";

import { LegalDoc } from "@/components/legal-doc";
import { useAppName, usePlatformBranding } from "@/hooks/use-branding";
import { platformPrivacyPolicy } from "@/lib/legal";

export default function PrivacyPage() {
  const appName = useAppName();
  const b = usePlatformBranding().data;
  return (
    <LegalDoc
      title="Privacy Policy"
      body={platformPrivacyPolicy(
        appName,
        b?.webUrl ?? "",
        b?.supportEmail ?? "support@vendors.local"
      )}
    />
  );
}
