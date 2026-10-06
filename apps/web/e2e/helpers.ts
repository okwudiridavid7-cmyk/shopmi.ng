import fs from "node:fs";
import path from "node:path";
import type { Page } from "@playwright/test";
import { CONTEXT_FILE, type E2EContext } from "./global-setup";

export function ctx(): E2EContext {
  return JSON.parse(fs.readFileSync(CONTEXT_FILE, "utf8")) as E2EContext;
}

export function authState(who: "seller" | "buyer" | "admin"): string {
  return path.join(path.dirname(CONTEXT_FILE), `${who}.json`);
}

/** Horizontal overflow in CSS pixels (0 means the page fits the viewport). */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(0, doc.scrollWidth - doc.clientWidth);
  });
}

/** Elements that stick out past the right edge, for a readable failure message. */
export async function overflowCulprits(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const out: string[] = [];
    for (const el of Array.from(document.body.querySelectorAll<HTMLElement>("*"))) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= width + 1) continue;
      let p: HTMLElement | null = el.parentElement;
      let clipped = false;
      while (p && p !== document.body) {
        const s = getComputedStyle(p);
        if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) {
          clipped = true;
          break;
        }
        p = p.parentElement;
      }
      if (clipped) continue;
      const cls = typeof el.className === "string" ? el.className.slice(0, 80) : "";
      out.push(`${el.tagName.toLowerCase()}.${cls} right=${Math.round(r.right)}`);
      if (out.length >= 5) break;
    }
    return out;
  });
}
