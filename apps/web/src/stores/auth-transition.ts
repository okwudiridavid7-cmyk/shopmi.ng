"use client";

import { create } from "zustand";

export type AuthTransitionKind =
  | "session-expired"
  | "sign-out"
  | "welcome"
  | "signing-in"
  | null;

type AuthTransitionState = {
  kind: AuthTransitionKind;
  name: string | null;
  /** Destination after the moment finishes. */
  nextHref: string | null;
  show: (
    kind: Exclude<AuthTransitionKind, null>,
    opts?: { name?: string | null; nextHref?: string | null }
  ) => void;
  clear: () => void;
};

export const useAuthTransition = create<AuthTransitionState>((set) => ({
  kind: null,
  name: null,
  nextHref: null,
  show: (kind, opts) =>
    set({
      kind,
      name: opts?.name ?? null,
      nextHref: opts?.nextHref ?? null,
    }),
  clear: () => set({ kind: null, name: null, nextHref: null }),
}));
