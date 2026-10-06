import type { UserRole } from "@vendors/shared-types";

/** Safe internal path for post-login redirects - blocks open redirects. */
export function safeReturnTo(value: string | null | undefined): string | null {
  if (!value) return null;
  // Browsers treat "/\host" like "//host", and strip tabs/newlines before parsing.
  if (!value.startsWith("/") || /^\/[/\\]/.test(value) || /[\u0000-\u001f\\]/.test(value)) {
    return null;
  }
  if (value.startsWith("/login") || value.startsWith("/signup")) return null;
  return value;
}

export function loginUrl(returnTo?: string | null): string {
  const safe = safeReturnTo(returnTo);
  if (!safe) return "/login";
  return `/login?returnTo=${encodeURIComponent(safe)}`;
}

export function defaultDashboardForRole(role: UserRole | string): string {
  if (role === "super_admin") return "/admin";
  if (role === "seller" || role === "tenant_admin") return "/seller";
  return "/buyer";
}

export function firstNameFromUser(name: string | null | undefined, email?: string): string {
  if (name?.trim()) {
    return name.trim().split(/\s+/)[0]!;
  }
  if (email) {
    const local = email.split("@")[0] ?? "there";
    return local.charAt(0).toUpperCase() + local.slice(1).split(/[._-]/)[0]!;
  }
  return "there";
}
