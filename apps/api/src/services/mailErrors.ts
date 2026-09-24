/** Mail could not be sent because the provider is not configured. */
export class MailConfigError extends Error {
  readonly code = "MAIL_UNAVAILABLE" as const;

  constructor(message = "Email delivery is not configured.") {
    super(message);
    this.name = "MailConfigError";
  }
}

/** Mail provider rejected the send or timed out. */
export class MailProviderError extends Error {
  readonly code = "MAIL_REJECTED" as const;

  constructor(message = "Email delivery failed.") {
    super(message);
    this.name = "MailProviderError";
  }
}

export function isMailError(
  err: unknown
): err is MailConfigError | MailProviderError {
  return err instanceof MailConfigError || err instanceof MailProviderError;
}
