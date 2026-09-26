"use client";

import { FormEvent, useEffect, useState } from "react";
import { Star } from "lucide-react";
import type { ReviewSummary } from "@vendors/shared-types";
import { SectionHeader } from "@/components/section-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/input";
import { apiFetch } from "@/lib/api";

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`${cls} ${
            n <= rating
              ? "fill-warning text-warning"
              : "fill-transparent text-border"
          }`}
          aria-hidden
        />
      ))}
    </span>
  );
}

function initialFromMasked(email?: string): string {
  if (!email) return "?";
  const ch = email.trim().charAt(0);
  return ch ? ch.toUpperCase() : "?";
}

function formatReviewDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ProductReviews({
  slug,
  productId,
}: {
  slug: string;
  productId: string;
}) {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);

  function load() {
    apiFetch<{ summary: ReviewSummary }>(
      `/api/shops/${slug}/products/${productId}/reviews`
    )
      .then((res) => setSummary(res.summary))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load reviews")
      );
  }

  useEffect(load, [slug, productId]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/api/shops/${slug}/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({ rating, comment }),
      });
      setComment("");
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
    } finally {
      setBusy(false);
    }
  }

  if (!summary) {
    return (
      <p className="text-sm text-muted-foreground">
        {error ?? "Loading reviews…"}
      </p>
    );
  }

  const distribution = summary.distribution ?? [0, 0, 0, 0, 0];
  const maxBar = Math.max(1, ...distribution);

  return (
    <section className="space-y-token-5 border-t border-border pt-token-6">
      <SectionHeader title="Reviews" />

      {summary.count > 0 ? (
        <div className="grid gap-token-6 sm:grid-cols-[auto_1fr] sm:items-start">
          <div className="space-y-token-1">
            <p className="font-display text-4xl text-foreground">
              {summary.average.toFixed(1)}
            </p>
            <Stars rating={Math.round(summary.average)} size="md" />
            <p className="text-sm text-muted-foreground">
              {summary.count} review{summary.count === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="space-y-token-2">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = distribution[5 - stars] ?? 0;
              const pct = Math.round((count / maxBar) * 100);
              return (
                <li
                  key={stars}
                  className="grid grid-cols-[2.5rem_1fr_2rem] items-center gap-token-2 text-sm"
                >
                  <span className="text-muted-foreground">{stars}★</span>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-warning transition-[width] motion-safe:duration-300"
                      style={{
                        width: `${pct}%`,
                        // Ensure a lone review still paints a visible segment
                        minWidth: count > 0 ? "0.5rem" : undefined,
                      }}
                    />
                  </div>
                  <span className="text-right text-xs text-muted-foreground">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : !summary.canReview ? (
        <p className="text-sm text-muted-foreground">
          Be the first to share feedback
        </p>
      ) : null}

      {summary.reviews.length > 0 && (
        <ul className="space-y-token-3">
          {summary.reviews.map((r) => {
            const name = r.buyerEmailMasked ?? "Buyer";
            return (
              <li
                key={r.id}
                className="rounded-md border border-border bg-card px-token-4 py-token-3"
              >
                <div className="flex items-start gap-token-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground"
                    aria-hidden
                  >
                    {initialFromMasked(r.buyerEmailMasked)}
                  </span>
                  <div className="min-w-0 flex-1 space-y-token-1">
                    <div className="flex flex-wrap items-center gap-token-2">
                      <p className="text-sm font-medium text-foreground">
                        {name}
                      </p>
                      <Stars rating={r.rating} />
                      {r.createdAt && (
                        <time
                          dateTime={r.createdAt}
                          className="text-xs text-muted-foreground"
                        >
                          {formatReviewDate(r.createdAt)}
                        </time>
                      )}
                    </div>
                    {r.comment ? (
                      <p className="text-sm text-muted-foreground">{r.comment}</p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {summary.canReview && (
        <form onSubmit={submit} className="max-w-md space-y-token-3">
          <h3 className="text-sm font-semibold text-foreground">
            Write a review
          </h3>
          <label className="block text-sm">
            <span className="text-muted-foreground">Rating</span>
            <Select
              icon={<Star />}
              value={rating}
              onChange={(e) => setRating(Number(e.target.value))}
              className="mt-1"
            >
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} star{n === 1 ? "" : "s"}
                </option>
              ))}
            </Select>
          </label>
          <Textarea
            required
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="How was the product?"
          />
          {error && (
            <p className="text-sm text-danger">{error}</p>
          )}
          <Button type="submit" disabled={busy}>
            {busy ? "Submitting…" : "Submit review"}
          </Button>
        </form>
      )}
    </section>
  );
}
