"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import type { HelloResponse, TenantPublic } from "@vendors/shared-types";
import { apiFetch } from "@/lib/api";
import { TextLink } from "@/components/ui/text-link";

export default function HelloPage() {
  const router = useRouter();
  const [data, setData] = useState<HelloResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tenantResult, setTenantResult] = useState<TenantPublic | null>(null);
  const [tenantError, setTenantError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    apiFetch<HelloResponse>("/hello")
      .then(setData)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load");
      });
  }, []);

  async function createTenant(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTenantError(null);
    setCreating(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiFetch<{ tenant: TenantPublic }>("/api/tenants", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          slug: form.get("slug"),
        }),
      });
      setTenantResult(res.tenant);
      const hello = await apiFetch<HelloResponse>("/hello");
      setData(hello);
    } catch (err) {
      setTenantError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  if (error) {
    return (
      <div className="space-y-token-4">
        <h1 className="font-display text-3xl">Not authenticated</h1>
        <p className="text-muted-foreground">{error}</p>
        <TextLink href="/login">Log in</TextLink>
      </div>
    );
  }

  if (!data) {
    return <p className="text-muted-foreground">Loading…</p>;
  }

  return (
    <div className="space-y-token-8">
      <div className="space-y-token-3">
        <h1 className="font-display text-3xl">{data.message}</h1>
        <p className="text-sm text-muted-foreground">
          Auth cookies + optional tenant membership — end-to-end check.
        </p>
      </div>

      <pre className="overflow-x-auto rounded-lg border border-border bg-card p-token-4 text-xs text-card-foreground shadow-sm">
        {JSON.stringify({ user: data.user, tenant: data.tenant }, null, 2)}
      </pre>

      {!data.tenant && (
        <form onSubmit={createTenant} className="max-w-md space-y-token-4">
          <h2 className="font-display text-xl">Create a shop</h2>
          <p className="text-sm text-muted-foreground">
            Separate from signup — creates tenant + owner membership.
          </p>
          <label className="block space-y-token-2 text-sm">
            <span>Shop name</span>
            <input
              name="name"
              required
              className="w-full rounded-md border border-border bg-card px-token-3 py-token-3"
            />
          </label>
          <label className="block space-y-token-2 text-sm">
            <span>Slug</span>
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              placeholder="my-shop"
              className="w-full rounded-md border border-border bg-card px-token-3 py-token-3"
            />
          </label>
          {tenantError && (
            <p className="text-sm text-red-700 dark:text-red-400">{tenantError}</p>
          )}
          <button
            type="submit"
            disabled={creating}
            className="rounded-md bg-accent px-token-4 py-token-3 text-sm font-medium text-accent-foreground"
          >
            {creating ? "Creating…" : "Create tenant"}
          </button>
        </form>
      )}

      {(data.tenant || tenantResult) && (
        <p className="text-sm text-muted-foreground">
          Tenant scoped via membership. Public lookup:{" "}
          <code>
            GET /api/shops/{(data.tenant || tenantResult)?.slug}
          </code>
        </p>
      )}

      <button
        type="button"
        onClick={logout}
        className="text-sm text-muted-foreground transition hover:text-foreground"
      >
        Log out
      </button>
    </div>
  );
}
