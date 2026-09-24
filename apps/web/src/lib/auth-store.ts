import type { UserPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";

type AuthListener = () => void;

export type AuthSnapshot = {
  user: UserPublic | null;
  loading: boolean;
};

let user: UserPublic | null = null;
let loading = true;
/** Stable reference — useSyncExternalStore requires Object.is equality across calls. */
let snapshot: AuthSnapshot = { user: null, loading: true };
const serverSnapshot: AuthSnapshot = { user: null, loading: true };
let listeners = new Set<AuthListener>();

function updateSnapshot() {
  snapshot = { user, loading };
  listeners.forEach((l) => l());
}

export function getAuthSnapshot(): AuthSnapshot {
  return snapshot;
}

export function getAuthServerSnapshot(): AuthSnapshot {
  return serverSnapshot;
}

export function subscribeAuth(listener: AuthListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export async function refreshAuth(): Promise<UserPublic | null> {
  loading = true;
  updateSnapshot();
  try {
    const res = await apiFetch<{ user: UserPublic }>("/api/auth/me");
    user = res.user;
  } catch {
    user = null;
  } finally {
    loading = false;
    updateSnapshot();
  }
  return user;
}

export async function logoutAuth(): Promise<void> {
  try {
    await apiFetch("/api/auth/logout", { method: "POST" });
  } catch {
    // clear local session anyway
  }
  user = null;
  loading = false;
  updateSnapshot();
}

export function setAuthUser(next: UserPublic | null) {
  user = next;
  loading = false;
  updateSnapshot();
}

/** Kick off first session resolve (idempotent). */
let bootstrapped = false;
export function bootstrapAuth() {
  if (bootstrapped) return;
  bootstrapped = true;
  void refreshAuth();
}
