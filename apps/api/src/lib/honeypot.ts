/** True when an invisible form trap contains a value. */
export function isHoneypotFilled(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  return value !== undefined && value !== null && value !== false;
}
