const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiClientError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

/** Paths that should never trigger a session-expired redirect loop. */
const AUTH_SKIP_401 = [
  "/api/auth/me",
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/signup",
  "/api/auth/logout",
  "/api/auth/refresh",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
];

let onUnauthorized: ((path: string) => void) | null = null;

/** Register once from the app shell — handles session expiry UX. */
export function setUnauthorizedHandler(handler: ((path: string) => void) | null) {
  onUnauthorized = handler;
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers: HeadersInit = {
    ...(init?.headers ?? {}),
  };
  const isForm = typeof FormData !== "undefined" && init?.body instanceof FormData;
  if (!isForm && !(headers as Record<string, string>)["Content-Type"]) {
    (headers as Record<string, string>)["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    if (
      res.status === 401 &&
      onUnauthorized &&
      !AUTH_SKIP_401.some((p) => path.startsWith(p))
    ) {
      onUnauthorized(path);
    }
    throw new ApiClientError(
      (data && typeof data === "object" && "error" in data
        ? String((data as { error: string }).error)
        : res.statusText) || "Request failed",
      res.status,
      data
    );
  }

  return data as T;
}

export function googleAuthUrl(
  returnTo?: string | null,
  role?: "buyer" | "seller" | null
): string {
  const base = `${API_URL}/api/auth/google`;
  const params = new URLSearchParams();
  if (returnTo) params.set("returnTo", returnTo);
  if (role) params.set("role", role);
  const q = params.toString();
  return q ? `${base}?${q}` : base;
}

export function apiUrl(path = ""): string {
  return `${API_URL}${path}`;
}

export function formatMoney(amount: number, currency = "NGN"): string {
  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function productImageUrl(images: string[]): string | null {
  const first = images[0];
  if (!first) return null;
  return resolveMediaUrl(first);
}

export function resolveMediaUrl(src: string): string {
  if (src.startsWith("http")) return src;
  if (src.startsWith("/uploads/")) return `${API_URL}${src}`;
  return src;
}

export function productImageUrls(images: string[]): string[] {
  return images.map(resolveMediaUrl).filter(Boolean);
}
