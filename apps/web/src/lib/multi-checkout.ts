/**
 * Client-side multi-vendor checkout queue.
 * Paystack settles one shop per payment; we chain shops after each success.
 *
 * pending[0] = shop currently being paid (or about to be redirected).
 * On success callback we remove that slug and initialize the next.
 */
const STORAGE_KEY = "shopmi-checkout-queue";

export type CheckoutQueueState = {
  /** Shop slugs still awaiting payment (current in-flight is first). */
  pending: string[];
  paid: { slug: string; reference: string }[];
  startedAt: number;
};

export function readCheckoutQueue(): CheckoutQueueState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CheckoutQueueState;
    if (!Array.isArray(parsed.pending) || !Array.isArray(parsed.paid)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeCheckoutQueue(state: CheckoutQueueState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clearCheckoutQueue() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(STORAGE_KEY);
}

/** Begin multi-shop checkout — pending[0] is the shop about to pay. */
export function beginCheckoutQueue(shopSlugs: string[]) {
  const pending = shopSlugs.filter(Boolean);
  writeCheckoutQueue({
    pending,
    paid: [],
    startedAt: Date.now(),
  });
  return pending[0] ?? null;
}

/** After a successful payment for `slug`, advance the queue. Returns next slug or null. */
export function advanceCheckoutQueue(
  slug: string,
  reference: string
): string | null {
  const state = readCheckoutQueue();
  if (!state) return null;

  const pending = state.pending.filter((s) => s !== slug);
  const paid = [
    ...state.paid.filter((p) => p.slug !== slug),
    { slug, reference },
  ];

  if (pending.length === 0) {
    writeCheckoutQueue({ ...state, pending: [], paid });
    return null;
  }

  writeCheckoutQueue({ ...state, pending, paid });
  return pending[0] ?? null;
}

export function checkoutProgress(): {
  paidCount: number;
  remainingCount: number;
  total: number;
} | null {
  const state = readCheckoutQueue();
  if (!state) return null;
  const paidCount = state.paid.length;
  const remainingCount = state.pending.length;
  return {
    paidCount,
    remainingCount,
    total: paidCount + remainingCount,
  };
}
