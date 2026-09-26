import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind classes (shadcn-compatible). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
