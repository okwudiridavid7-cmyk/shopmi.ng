"use client";

import { useCallback, useState } from "react";
import { usePlatformBranding } from "@/hooks/use-branding";
import { resetTurnstile, TurnstileField } from "@/components/turnstile-field";

/** Turnstile for sign-in, signup and password reset. Renders nothing until a site key is configured. */
export function useAuthCaptcha() {
  const siteKey = usePlatformBranding().data?.turnstileSiteKey ?? null;
  const [token, setToken] = useState<string | null>(null);
  const reset = useCallback(() => {
    resetTurnstile();
    setToken(null);
  }, []);
  const field = <TurnstileField siteKey={siteKey} onToken={setToken} />;
  return { token, field, reset, waiting: Boolean(siteKey) && !token };
}
