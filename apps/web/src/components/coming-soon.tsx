"use client";

import * as React from "react";
import dynamic from "next/dynamic";

const ComingSoonDialog = dynamic(() => import("./coming-soon-dialog"), { ssr: false });

type OpenComingSoon = (feature?: string) => void;

const ComingSoonContext = React.createContext<OpenComingSoon | null>(null);

/** Opens the shared "Coming soon" dialog, optionally naming the feature. */
export function useComingSoon(): OpenComingSoon {
  const open = React.useContext(ComingSoonContext);
  if (!open) {
    throw new Error("useComingSoon must be used inside <ComingSoonProvider>");
  }
  return open;
}

export function ComingSoonProvider({ children }: { children: React.ReactNode }) {
  const [feature, setFeature] = React.useState<string | null>(null);
  const [isOpen, setIsOpen] = React.useState(false);
  const [used, setUsed] = React.useState(false);

  const open = React.useCallback<OpenComingSoon>((name) => {
    setFeature(name?.trim() || null);
    setIsOpen(true);
    setUsed(true);
  }, []);
  const close = React.useCallback(() => setIsOpen(false), []);

  return (
    <ComingSoonContext.Provider value={open}>
      {children}
      {used ? <ComingSoonDialog isOpen={isOpen} feature={feature} close={close} /> : null}
    </ComingSoonContext.Provider>
  );
}
