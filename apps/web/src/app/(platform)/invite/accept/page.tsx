"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MailWarning, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SkeletonLines } from "@/components/skeleton";
import { Button, buttonClasses } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

type Preview = { shopName: string; role: "manager" | "staff"; email: string };

function AcceptInner() {
  const token = useSearchParams().get("token") ?? "";
  const { user, loading, refresh } = useAuth();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This invite link is incomplete.");
      return;
    }
    apiFetch<Preview>("/api/team-invites/preview", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(setPreview)
      .catch((err) => setError(err instanceof Error ? err.message : "This invite is invalid."));
  }, [token]);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/team-invites/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      });
      await refresh();
      window.location.assign("/seller");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't accept the invite.");
      setBusy(false);
    }
  }

  if (!preview && !error) {
    return (
      <div className="mx-auto max-w-md py-16">
        <SkeletonLines count={3} />
      </div>
    );
  }

  if (!preview) {
    return (
      <div className="mx-auto max-w-md space-y-6 py-12">
        <PageHeader title="Invite unavailable" description={error ?? undefined} icon={MailWarning} />
        <TextLink href="/" arrow="right">
          Go to Shopmi.ng
        </TextLink>
      </div>
    );
  }

  const here = `/invite/accept?token=${encodeURIComponent(token)}`;
  const roleLabel = preview.role === "manager" ? "a manager" : "a staff member";

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <PageHeader
        title={`Join ${preview.shopName}`}
        description={`You've been invited as ${roleLabel}. The invite was sent to ${preview.email}.`}
        icon={Users}
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      {loading ? (
        <SkeletonLines count={1} />
      ) : user ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">Signed in as {user.email}.</p>
          <Button variant="primary" disabled={busy} onClick={() => void accept()}>
            {busy ? "Joining…" : "Accept invite"}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          <a className={buttonClasses("primary")} href={`/login?returnTo=${encodeURIComponent(here)}`}>
            Sign in to accept
          </a>
          <a
            className={buttonClasses("outline")}
            href={`/signup/account?returnTo=${encodeURIComponent(here)}`}
          >
            Create an account
          </a>
        </div>
      )}
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<SkeletonLines count={3} />}>
      <AcceptInner />
    </Suspense>
  );
}
