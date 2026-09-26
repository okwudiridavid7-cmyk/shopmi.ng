import { ApiClientError } from "@/lib/api";

/** High-level UI condition for dashboard empty / error states. */
export type QueryStateKind =
  | "no_tenant"
  | "no_access"
  | "not_found"
  | "load_failed"
  | "empty"
  | "empty_filtered";

/**
 * Map API / network failures to a presentation kind.
 * Never surface raw `error.message` strings in the UI.
 */
export function classifyQueryError(error: unknown): QueryStateKind {
  if (!(error instanceof ApiClientError)) {
    return "load_failed";
  }

  const msg = (error.message || "").toLowerCase();

  if (
    error.status === 403 &&
    (msg.includes("no tenant membership") ||
      msg.includes("no tenant") ||
      msg.includes("tenant membership"))
  ) {
    return "no_tenant";
  }

  if (error.status === 403) {
    return "no_access";
  }

  if (error.status === 404) {
    return "not_found";
  }

  if (error.status === 401) {
    return "no_access";
  }

  return "load_failed";
}

export function isNoTenantError(error: unknown): boolean {
  return classifyQueryError(error) === "no_tenant";
}
