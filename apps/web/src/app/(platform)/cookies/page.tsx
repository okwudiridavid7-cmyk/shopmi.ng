"use client";

import { Cookie } from "lucide-react";
import { LegalDoc } from "@/components/legal-doc";
import { useCookieConsent } from "@/components/cookie-consent";
import { Button } from "@/components/ui/button";
import { useAppName, usePlatformBranding } from "@/hooks/use-branding";
import { platformCookiePolicy } from "@/lib/legal";

export default function CookiePolicyPage() {
  const appName = useAppName();
  const b = usePlatformBranding().data;
  const { openPreferences } = useCookieConsent();
  return (
    <LegalDoc
      title="Cookie Policy"
      body={platformCookiePolicy(
        appName,
        b?.webUrl ?? "",
        b?.supportEmail ?? "support@shopmi.ng"
      )}
      actions={
        <Button variant="primary" size="md" className="gap-2" onClick={openPreferences}>
          <Cookie className="h-4 w-4" aria-hidden />
          Manage cookie preferences
        </Button>
      }
    />
  );
}
