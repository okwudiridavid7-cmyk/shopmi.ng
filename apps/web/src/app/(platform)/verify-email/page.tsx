"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailWarning } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { SkeletonLines } from "@/components/skeleton";
import { Button } from "@/components/ui/button";
import { TextLink } from "@/components/ui/text-link";
import { apiFetch, isAuthError } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

function VerifyInner() {
  const search = useSearchParams();
  const token = search.get("token") ?? "";
  const { refresh, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<"working" | "ok" | "error">("working");
  const [message, setMessage] = useState("Confirming your email…");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }
    apiFetch<{ ok: boolean }>("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then(async () => {
        await refresh();
        setStatus("ok");
        setMessage("Your email is verified. You’re all set.");
      })
      .catch((err) => {
        if (isAuthError(err)) {
          setStatus("error");
          setMessage("Sign in and open the link again, or request a new email.");
          return;
        }
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Verification failed."
        );
      });
  }, [token, refresh]);

  if (status === "working") {
    return (
      <div className="mx-auto max-w-md space-y-4 py-16">
        <SkeletonLines count={3} />
        <p className="text-center text-sm text-muted-foreground">{message}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-6 py-12">
      <PageHeader
        title={status === "ok" ? "Email verified" : "Verification needed"}
        description={message}
        icon={status === "ok" ? CheckCircle2 : MailWarning}
      />
      <div className="flex flex-wrap gap-3">
        <TextLink href={isAuthenticated ? "/explore" : "/login"} arrow="right">
          {isAuthenticated ? "Continue shopping" : "Sign in"}
        </TextLink>
        {status === "error" && isAuthenticated ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              void apiFetch("/api/auth/resend-verification", {
                method: "POST",
              }).then(() => setMessage("A new verification email is on the way."));
            }}
          >
            Resend email
          </Button>
        ) : null}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<SkeletonLines count={3} />}>
      <VerifyInner />
    </Suspense>
  );
}
