"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";

function ConfirmInner() {
  const params = useSearchParams();
  const token = params.get("token")?.trim() ?? "";
  const [state, setState] = useState<
    "loading" | "ok" | "error"
  >(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Confirming your message…" : "Missing confirmation token."
  );

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        await apiFetch("/api/contact/confirm", {
          method: "POST",
          body: JSON.stringify({ token }),
        });
        if (cancelled) return;
        setState("ok");
        setMessage(
          "Thanks — your message is confirmed and on its way to the shop."
        );
      } catch (err) {
        if (cancelled) return;
        setState("error");
        setMessage(
          err instanceof Error
            ? err.message
            : "We couldn’t confirm that link. It may have expired."
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-token-4 py-token-16">
      <h1 className="font-display text-2xl text-foreground">
        {state === "ok"
          ? "Message confirmed"
          : state === "loading"
            ? "Confirming…"
            : "Confirmation failed"}
      </h1>
      <p className="mt-token-3 text-sm text-muted-foreground">{message}</p>
      <div className="mt-token-6">
        <Link
          href="/"
          className="inline-flex rounded-md border border-border bg-card px-token-4 py-token-2 text-sm text-foreground shadow-sm hover:bg-muted"
        >
          Back to home
        </Link>
      </div>
    </main>
  );
}

export default function ContactConfirmPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-token-4 py-token-16">
          <p className="text-sm text-muted-foreground">Loading…</p>
        </main>
      }
    >
      <ConfirmInner />
    </Suspense>
  );
}
