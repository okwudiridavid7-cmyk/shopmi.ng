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

function displayName(user: UserPublic): string {
  if (user.name?.trim()) return user.name.trim();
  const local = user.email.split("@")[0] ?? "User";
  return local
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function initials(user: UserPublic): string {
  const name = displayName(user);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
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
      displayName: snap.user ? displayName(snap.user) : null,
      initials: snap.user ? initials(snap.user) : null,
      refresh: refreshAuth,
      logout: logoutAuth,
      setUser: setAuthUser,
    }),
    [snap]
  );
}
