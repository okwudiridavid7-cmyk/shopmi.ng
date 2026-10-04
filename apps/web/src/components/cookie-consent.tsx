"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import {
  readConsent,
  writeConsent,
  type ConsentCategory,
  type CookieConsent,
} from "@/lib/cookie-consent";

const CookieConsentUi = dynamic(() => import("./cookie-consent-ui"), { ssr: false });

type ConsentContextValue = {
  consent: CookieConsent | null;
  hasConsent: (category: ConsentCategory) => boolean;
  openPreferences: () => void;
};

const ConsentContext = React.createContext<ConsentContextValue | null>(null);

export function useCookieConsent(): ConsentContextValue {
  const ctx = React.useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useCookieConsent must be used inside <CookieConsentProvider>");
  }
  return ctx;
}

const ALL_OFF = { functional: false, analytics: false, marketing: false };

export function CookieConsentProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [consent, setConsent] = React.useState<CookieConsent | null>(null);
  const [prefsOpen, setPrefsOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(ALL_OFF);
  const [prefsUsed, setPrefsUsed] = React.useState(false);

  React.useEffect(() => {
    setConsent(readConsent());
    setMounted(true);
  }, []);

  const save = React.useCallback((choice: typeof ALL_OFF) => {
    setConsent(writeConsent(choice));
    setPrefsOpen(false);
  }, []);

  const openPreferences = React.useCallback(() => {
    const current = readConsent();
    setDraft(
      current
        ? {
            functional: current.functional,
            analytics: current.analytics,
            marketing: current.marketing,
          }
        : ALL_OFF
    );
    setPrefsOpen(true);
    setPrefsUsed(true);
  }, []);
  const closePrefs = React.useCallback(() => setPrefsOpen(false), []);

  const value = React.useMemo<ConsentContextValue>(
    () => ({
      consent,
      hasConsent: (category) => !!consent?.[category],
      openPreferences,
    }),
    [consent, openPreferences]
  );

  React.useEffect(() => {
    if (!prefsOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPrefsOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prefsOpen]);

  const showBanner = mounted && !consent && !prefsOpen;

  return (
    <ConsentContext.Provider value={value}>
      {children}

      {showBanner || prefsOpen || prefsUsed ? (
        <CookieConsentUi
          showBanner={showBanner}
          prefsOpen={prefsOpen}
          draft={draft}
          setDraft={setDraft}
          save={save}
          openPreferences={openPreferences}
          closePrefs={closePrefs}
        />
      ) : null}
    </ConsentContext.Provider>
  );
}
