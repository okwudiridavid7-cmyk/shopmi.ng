"use client";

import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { AuthSplitLayout } from "@/components/auth-split";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/components/ui/toast";
import { markWalkthroughPending } from "@/components/walkthrough";

function VerifyInner() {
  const search = useSearchParams();
  const router = useRouter();
  const email = search.get("email") ?? "";
  const token = search.get("token");
  const next = search.get("next") || ("/buyer");
  const { refresh } = useAuth();
  const { toast } = useToast();
  const [code, setCode] = useState(["", "", "", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const refs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!token) return;
    setBusy(true);
    apiFetch("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ token }) })
      .then(async () => { await refresh(); if (next.startsWith("/buyer")) markWalkthroughPending(); toast({ title: "Email verified", description: "Your account is ready.", tone: "success" }); router.replace(next); })
      .catch((e) => { const text = e instanceof Error ? e.message : "That verification link has expired."; setMessage(text); toast({ title: "Verification failed", description: text, tone: "danger" }); })
      .finally(() => setBusy(false));
  }, [token, refresh, router, next]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const value = code.join("");
    if (value.length !== 6 || !email) return;
    setBusy(true); setMessage("");
    try {
      await apiFetch("/api/auth/verify-email", { method: "POST", body: JSON.stringify({ email, code: value }) });
      await refresh();
      if (next.startsWith("/buyer")) markWalkthroughPending();
      toast({ title: "Email verified", description: "Your account is ready.", tone: "success" });
      router.replace(next);
    } catch (err) {
      const text = err instanceof Error ? err.message : "That code didn’t work. Try again.";
      setMessage(text);
      toast({ title: "Verification failed", description: text, tone: "danger" });
      setCode(["", "", "", "", "", ""]);
      refs.current[0]?.focus();
    } finally { setBusy(false); }
  }

  return <AuthSplitLayout title="Verify your email" subtitle="Enter the 6-digit code we sent to your inbox.">
    <div className="space-y-6">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent"><Mail className="h-5 w-5" /></span>
        <div className="min-w-0"><p className="text-sm text-muted-foreground">Verification code sent to</p><p className="truncate text-sm font-semibold text-foreground">{email || "your email address"}</p></div>
      </div>
      <form onSubmit={submit} className="space-y-5">
        <div className="flex justify-between gap-2" role="group" aria-label="6-digit verification code">
          {code.map((digit, i) => <input key={i} ref={(el) => { refs.current[i] = el; }} value={digit} inputMode="numeric" autoComplete={i === 0 ? "one-time-code" : "off"} aria-label={`Digit ${i + 1}`} maxLength={1} onChange={(e) => { const v = e.target.value.replace(/\D/g, "").slice(-1); setCode((old) => old.map((x, n) => n === i ? v : x)); if (v) refs.current[Math.min(i + 1, 5)]?.focus(); }} onKeyDown={(e) => { if (e.key === "Backspace" && !digit && i > 0) refs.current[i - 1]?.focus(); }} onPaste={(e) => { const digits = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6).split(""); if (digits.length) { e.preventDefault(); setCode(Array.from({ length: 6 }, (_, n) => digits[n] ?? "")); refs.current[Math.min(digits.length, 5)]?.focus(); } }} className="h-14 min-w-0 flex-1 rounded-xl border-2 border-border bg-card text-center text-xl font-bold tracking-wide text-foreground shadow-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/10 sm:h-16 sm:text-2xl" />)}
        </div>
        {message && <p role="alert" className="text-sm text-danger">{message}</p>}
        <Button type="submit" disabled={busy || code.join("").length !== 6} className="h-12 w-full" size="lg">{busy ? "Verifying…" : "Verify email"}</Button>
      </form>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Go back</button>
        <button type="button" disabled={busy || !email} onClick={async () => { try { await apiFetch("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }) }); toast({ title: "Code sent", description: "A fresh code is on its way.", tone: "success" }); } catch (err) { const text = err instanceof Error ? err.message : "Could not resend the code."; setMessage(text); toast({ title: "Could not resend code", description: text, tone: "danger" }); } }} className="font-medium text-accent hover:underline">Resend code</button>
      </div>
      <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground"><CheckCircle2 className="h-3.5 w-3.5" /> Your account is protected until you verify this address.</p>
    </div>
  </AuthSplitLayout>;
}

export default function VerifyEmailPage() {
  return <Suspense fallback={<div className="p-10 text-center text-sm text-muted-foreground">Loading…</div>}><VerifyInner /></Suspense>;
}
