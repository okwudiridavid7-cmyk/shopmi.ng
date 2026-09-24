"use client";

import { FormEvent, useEffect, useState } from "react";
import type { VerificationRequestPublic } from "@vendors/shared-types";
import { VerifiedBadge } from "@/components/shop-trust";
import { apiFetch } from "@/lib/api";

export default function SellerVerificationPage() {
  const [verifiedBadge, setVerifiedBadge] = useState(false);
  const [request, setRequest] = useState<VerificationRequestPublic | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [verificationRequired, setVerificationRequired] = useState(false);

  async function load() {
    try {
      const [res, config] = await Promise.all([
        apiFetch<{
          verifiedBadge: boolean;
          request: VerificationRequestPublic | null;
        }>("/api/seller/verification"),
        apiFetch<{ verificationRequired?: boolean }>("/api/tenants/config").catch(
          () => ({ verificationRequired: false })
        ),
      ]);
      setVerifiedBadge(res.verifiedBadge);
      setRequest(res.request);
      setVerificationRequired(!!config.verificationRequired);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!files || files.length === 0) {
      setError("Select at least one document");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append("docs", f));
      await apiFetch("/api/seller/verification", {
        method: "POST",
        body: fd,
      });
      setFiles(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-token-6">
      <div>
        <h2 className="font-display text-xl">Shop verification</h2>
      </div>

      {verifiedBadge ? (
        <div className="space-y-2 rounded-lg border border-border bg-card p-token-4">
          <VerifiedBadge />
          <p className="text-sm text-muted-foreground">
            Your shop is verified. Buyers will see the badge on your storefront.
          </p>
        </div>
      ) : (
        <div className="space-y-token-2">
          <p className="text-sm text-muted-foreground">
            Submit ID or business documents for review. Unverified shops show a
            warning to buyers.
          </p>
          {verificationRequired && (
            <p className="rounded-md border border-warning/40 bg-warning-muted px-token-3 py-token-2 text-sm text-warning">
              Platform setting: verification is required before your shop can
              accept payments.
            </p>
          )}
        </div>
      )}

      {request && (
        <div className="rounded-lg border border-border bg-card p-token-4 text-sm">
          <p>
            Latest request: <strong>{request.status}</strong>
          </p>
          {request.note && (
            <p className="mt-2 text-muted-foreground">Note: {request.note}</p>
          )}
          <ul className="mt-2 list-disc pl-5 text-muted-foreground">
            {request.submittedDocs.map((d) => (
              <li key={d.url}>
                <a href={d.url} className="underline" target="_blank" rel="noreferrer">
                  {d.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!verifiedBadge && request?.status !== "pending" && (
        <form onSubmit={submit} className="space-y-3">
          <input
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp,application/pdf"
            onChange={(e) => setFiles(e.target.files)}
            className="block w-full text-sm"
          />
          {error && (
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="rounded-md bg-accent px-4 py-2 text-sm text-accent-foreground disabled:opacity-60"
          >
            {busy ? "Uploading…" : "Submit for review"}
          </button>
        </form>
      )}

      {error && verifiedBadge && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
