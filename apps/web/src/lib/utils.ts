import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes (shadcn-compatible). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** True for `base` itself or any path below it, so "/seller" never matches "/sellers". */
export function isUnderPath(pathname: string, base: string): boolean {
  return pathname === base || pathname.startsWith(`${base}/`);
}
