"use client";

import { useEffect, useMemo, useSyncExternalStore } from "react";
import {
  bootstrapAuth,
  getAuthServerSnapshot,
  getAuthSnapshot,
  logoutAuth,
  refreshAuth,
  setAuthUser,
  subscribeAuth,
} from "@/lib/auth-store";
import type { UserPublic } from "@vendors/shared-types";
import { firstNameFromUser } from "@/lib/auth-redirect";

/** Full name when set; otherwise a humanized email local-part (never the raw email). */
function displayName(user: UserPublic): string {
  if (user.name?.trim()) return user.name.trim();
  const local = user.email.split("@")[0] ?? "User";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(user: UserPublic): string {
  if (user.name?.trim()) {
    const parts = user.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
    }
    return (parts[0] ?? "U").slice(0, 2).toUpperCase();
  }
  const first = firstNameFromUser(null, user.email);
  return first.slice(0, 2).toUpperCase();
}

export function useAuth() {
  const snap = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    getAuthServerSnapshot
  );

  useEffect(() => {
    bootstrapAuth();
  }, []);

  return useMemo(
    () => ({
      user: snap.user,
      loading: snap.loading,
      isAuthenticated: !!snap.user,
      /** First name for greetings / nav — never the email address. */
      firstName: snap.user
        ? firstNameFromUser(snap.user.name, snap.user.email)
        : null,
      displayName: snap.user ? displayName(snap.user) : null,
      initials: snap.user ? initials(snap.user) : null,
      refresh: refreshAuth,
      logout: logoutAuth,
      setUser: setAuthUser,
    }),
    [snap]
  );
}
