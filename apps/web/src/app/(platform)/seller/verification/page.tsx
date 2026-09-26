"use client";

import { FormEvent, useEffect, useState } from "react";
import type { VerificationRequestPublic } from "@vendors/shared-types";
import { BadgeCheck } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { VerifiedBadge } from "@/components/shop-trust";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
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
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        title="Shop verification"
        description="Submit ID or business documents for review. Unverified shops show a warning to buyers."
        icon={BadgeCheck}
      />

      {verifiedBadge ? (
        <Card className="overflow-hidden rounded-2xl">
          <CardBody className="space-y-2">
            <VerifiedBadge />
            <p className="text-sm text-muted-foreground">
              Your shop is verified. Buyers will see the badge on your
              storefront.
            </p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-2">
          {verificationRequired && (
            <p className="rounded-xl border border-warning/40 bg-warning-muted px-3 py-2 text-sm text-warning">
              Platform setting: verification is required before your shop can
              accept payments.
            </p>
          )}
        </div>
      )}

      {request && (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Latest request
            </p>
          </CardHeader>
          <CardBody className="text-sm">
            <p>
              Status: <strong className="capitalize">{request.status}</strong>
            </p>
            {request.note && (
              <p className="mt-2 text-muted-foreground">Note: {request.note}</p>
            )}
            <ul className="mt-2 list-disc pl-5 text-muted-foreground">
              {request.submittedDocs.map((d) => (
                <li key={d.url}>
                  <a
                    href={d.url}
                    className="font-medium text-accent transition hover:text-accent-deep dark:text-accent-on-dark"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {d.name}
                  </a>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      {!verifiedBadge && request?.status !== "pending" && (
        <Card className="overflow-hidden rounded-2xl">
          <CardHeader className="bg-muted/30">
            <p className="text-sm font-semibold text-foreground">
              Submit documents
            </p>
          </CardHeader>
          <CardBody>
            <form onSubmit={submit} className="space-y-4">
              <Label>
                <span>Documents</span>
                <Input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={(e) => setFiles(e.target.files)}
                />
              </Label>
              {error && (
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
              )}
              <Button type="submit" disabled={busy} variant="primary">
                {busy ? "Uploading…" : "Submit for review"}
              </Button>
            </form>
          </CardBody>
        </Card>
      )}

      {error && verifiedBadge && (
        <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
