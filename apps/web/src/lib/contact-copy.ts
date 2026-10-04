/** Contact page promises shown beside the inquiry form. */
export const CONTACT_PROMISES: readonly string[] = [];

export const CONTACT_SUCCESS_MESSAGE =
  "We received your message. We’ll get back to you by email.";

/** Shown when shop contact requires email confirmation. */
export const CONTACT_CONFIRM_MESSAGE =
  "Check your email to confirm this message. The shop is notified only after you confirm.";

export const CONTACT_TOPICS = [
  "General inquiry",
  "Seller support",
  "Buyer order help",
  "Partnerships",
  "Press & media",
  "Verification",
  "Other",
] as const;

export const CONTACT_INTENTS = [
  "Just browsing",
  "Opening a shop",
  "Growing an existing shop",
] as const;
