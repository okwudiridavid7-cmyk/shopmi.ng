"use client";

import { FormEvent, useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";
import { usePlatformBranding } from "@/hooks/use-branding";
import {
  CONTACT_CONFIRM_MESSAGE,
  CONTACT_PROMISES,
  CONTACT_SUCCESS_MESSAGE,
} from "@/lib/contact-copy";
import { TurnstileField, resetTurnstile } from "@/components/turnstile-field";

const TOPICS = [
  "General inquiry",
  "Seller support",
  "Buyer order help",
  "Partnerships",
  "Press & media",
  "Verification",
] as const;

const BUDGETS = [
  "Just browsing",
  "Opening a shop",
  "Growing an existing shop",
] as const;

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-token-4 py-token-2 text-sm transition ${
        selected
          ? "border-accent bg-accent text-accent-foreground"
          : "border-white/25 bg-transparent text-white/90 hover:border-white/50"
      }`}
    >
      {children}
    </button>
  );
}

/** Dark, two-column inquiry form for the platform Contact page. */
export function ModernContactForm() {
  const b = usePlatformBranding().data;
  const supportEmail = b?.supportEmail ?? "support@vendors.local";
  const turnstileSiteKey = b?.turnstileSiteKey ?? null;

  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [intent, setIntent] = useState<string>(BUDGETS[1]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const onCaptchaToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  const subjectLine = useMemo(
    () => `${topic} · ${intent}`,
    [topic, intent]
  );

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    const form = new FormData(e.currentTarget);
    try {
      await apiFetch("/api/contact", {
        method: "POST",
        headers: {
          "Idempotency-Key":
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone") || undefined,
          subject: subjectLine,
          message: form.get("message"),
          website: form.get("website") || undefined,
          captchaToken: captchaToken || undefined,
        }),
      });
      setMsg(CONTACT_SUCCESS_MESSAGE);
      e.currentTarget.reset();
      setCaptchaToken(null);
      resetTurnstile();
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Couldn’t send that just now. Try again in a moment."
      );
      resetTurnstile();
      setCaptchaToken(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#0c0c0e] text-white">
      <div
        className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-accent/30 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-token-4 py-16 sm:px-token-6 lg:grid-cols-2 lg:gap-16 lg:py-20">
        {/* Left: promises */}
        <div className="flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Contact
            </p>
            <h1 className="mt-token-4 font-display text-4xl leading-tight sm:text-5xl">
              Tell us about your project
            </h1>
            <ul className="mt-token-8 space-y-token-4">
              {CONTACT_PROMISES.map((line) => (
                <li key={line} className="flex items-start gap-token-3 text-sm text-white/75">
                  <span
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-accent-foreground"
                    aria-hidden
                  >
                    ✓
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>
            <div className="mt-10 space-y-token-4 lg:mt-16">
            <a
              href={`mailto:${supportEmail}`}
              className="inline-block text-sm text-white underline decoration-white/40 underline-offset-4 transition hover:decoration-accent"
            >
              {supportEmail}
            </a>
            <p className="text-sm text-white/55">
              Always busy and want to book an exact time to call?
            </p>
            <Link href="/support">
              <Button
                type="button"
                className="rounded-full border-0 bg-white/10 text-white hover:bg-white/15"
              >
                Visit support hub
              </Button>
            </Link>
          </div>
        </div>

        {/* Right: form */}
        <form onSubmit={onSubmit} className="space-y-token-8">
          {/* Honeypot — leave empty (REM-08) */}
          <div
            className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
            aria-hidden
          >
            <label>
              Website
              <input
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          <fieldset>
            <legend className="mb-token-3 text-sm text-white/60">Topic</legend>
            <div className="flex flex-wrap gap-token-2">
              {TOPICS.map((t) => (
                <Chip key={t} selected={topic === t} onClick={() => setTopic(t)}>
                  {t}
                </Chip>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-token-3 text-sm text-white/60">I am…</legend>
            <div className="flex flex-wrap gap-token-2">
              {BUDGETS.map((t) => (
                <Chip
                  key={t}
                  selected={intent === t}
                  onClick={() => setIntent(t)}
                >
                  {t}
                </Chip>
              ))}
            </div>
          </fieldset>

          <div className="grid gap-token-6 sm:grid-cols-2">
            <label className="block space-y-token-2">
              <span className="text-sm text-white/70">
                Full name<span className="text-accent">*</span>
              </span>
              <input
                name="name"
                required
                autoComplete="name"
                minLength={2}
                className="w-full border-0 border-b border-white/30 bg-transparent px-0 py-token-2 text-white outline-none transition placeholder:text-white/30 focus:border-accent"
                placeholder="Your name"
              />
            </label>
            <label className="block space-y-token-2">
              <span className="text-sm text-white/70">
                Email<span className="text-accent">*</span>
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full border-0 border-b border-white/30 bg-transparent px-0 py-token-2 text-white outline-none transition placeholder:text-white/30 focus:border-accent"
                placeholder="you@example.com"
              />
            </label>
          </div>

          <label className="block space-y-token-2">
            <span className="text-sm text-white/70">Phone (optional)</span>
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              className="w-full border-0 border-b border-white/30 bg-transparent px-0 py-token-2 text-white outline-none transition placeholder:text-white/30 focus:border-accent"
              placeholder="+234…"
            />
          </label>

          <label className="block space-y-token-2">
            <span className="text-sm text-white/70">
              Project details<span className="text-accent">*</span>
            </span>
            <textarea
              name="message"
              required
              rows={4}
              minLength={10}
              className="w-full resize-y border-0 border-b border-white/30 bg-transparent px-0 py-token-2 text-white outline-none transition placeholder:text-white/30 focus:border-accent"
              placeholder="What can we help with?"
            />
          </label>

          <TurnstileField
            siteKey={turnstileSiteKey}
            theme="dark"
            onToken={onCaptchaToken}
          />

          {err && <p className="text-sm text-red-400">{err}</p>}
          {msg && <p className="text-sm text-emerald-400">{msg}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-white py-token-4 text-sm font-semibold text-[#0c0c0e] transition hover:bg-white/90 disabled:opacity-60"
          >
            {busy ? "Sending…" : "Submit inquiry"}
          </button>
        </form>
      </div>
    </section>
  );
}

/** Classic form used on shop contact pages. */
export function ContactForm({
  endpoint,
  accent,
}: {
  endpoint: string;
  accent?: string | null;
}) {
  const branding = usePlatformBranding().data;
  const turnstileSiteKey = branding?.turnstileSiteKey ?? null;
  const confirmRequired = Boolean(branding?.shopContactConfirmRequired);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const onCaptchaToken = useCallback((token: string | null) => {
    setCaptchaToken(token);
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    setErr(null);
    const form = new FormData(e.currentTarget);
    try {
      const res = await apiFetch<{ status?: string }>(endpoint, {
        method: "POST",
        headers: {
          "Idempotency-Key":
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : `contact-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        },
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          phone: form.get("phone") || undefined,
          subject: form.get("subject"),
          message: form.get("message"),
          website: form.get("website") || undefined,
          captchaToken: captchaToken || undefined,
        }),
      });
      setMsg(
        res.status === "awaiting_confirm" || confirmRequired
          ? CONTACT_CONFIRM_MESSAGE
          : CONTACT_SUCCESS_MESSAGE
      );
      e.currentTarget.reset();
      setCaptchaToken(null);
      resetTurnstile();
    } catch (error) {
      setErr(
        error instanceof Error
          ? error.message
          : "Couldn’t send that just now. Try again in a moment."
      );
      resetTurnstile();
      setCaptchaToken(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="relative space-y-token-4">
      <div
        className="absolute -left-[9999px] h-0 w-0 overflow-hidden"
        aria-hidden
      >
        <label>
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-token-4 sm:grid-cols-2">
        <Label>
          <span>Name</span>
          <Input name="name" required autoComplete="name" />
        </Label>
        <Label>
          <span>Email</span>
          <Input name="email" type="email" required autoComplete="email" />
        </Label>
      </div>
      <div className="grid gap-token-4 sm:grid-cols-2">
        <Label>
          <span>Phone (optional)</span>
          <Input name="phone" type="tel" autoComplete="tel" />
        </Label>
        <Label>
          <span>Subject</span>
          <Input name="subject" required placeholder="How can we help?" />
        </Label>
      </div>
      <Label>
        <span>Message</span>
        <Textarea name="message" required rows={6} minLength={10} />
      </Label>
      <TurnstileField siteKey={turnstileSiteKey} onToken={onCaptchaToken} />
      {err && <p className="text-sm text-danger">{err}</p>}
      {msg && (
        <p className="text-sm text-emerald-700 dark:text-emerald-400">{msg}</p>
      )}
      <Button
        type="submit"
        variant="primary"
        disabled={busy}
        style={accent ? { backgroundColor: accent } : undefined}
      >
        {busy ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
