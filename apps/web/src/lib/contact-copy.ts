/** Contact page promises shown beside the inquiry form. */
export const CONTACT_PROMISES = [
  "We read every message and reply as soon as we can on business days",
  "For order issues, include your order details so we can help faster",
  "Shop-specific questions are best sent from that shop’s contact page",
] as const;

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
] as const;

export const CONTACT_INTENTS = [
  "Just browsing",
  "Opening a shop",
  "Growing an existing shop",
] as const;
