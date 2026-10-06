import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type E2EContext = {
  seller: string;
  buyer: string;
  admin: string | null;
  shopSlug: string;
  productPath: string;
  productId: string;
  shopSlugs: string[];
  paystackTestMode: boolean;
};

export const CONTEXT_FILE = path.join(__dirname, ".auth", "context.json");

function storageState(token: string | null) {
  return {
    cookies: token
      ? [
          {
            name: "access_token",
            value: token,
            domain: "localhost",
            path: "/",
            expires: Math.floor(Date.now() / 1000) + 14 * 60,
            httpOnly: true,
            secure: false,
            sameSite: "Lax" as const,
          },
        ]
      : [],
    origins: [],
  };
}

export default async function globalSetup() {
  const apiDir = path.resolve(__dirname, "../../api");
  const out = execFileSync(path.join(apiDir, "node_modules/.bin/tsx"), ["scripts/e2e-tokens.ts"], {
    cwd: apiDir,
    encoding: "utf8",
  });
  const ctx = JSON.parse(out.trim().split("\n").pop()!) as E2EContext;

  const dir = path.dirname(CONTEXT_FILE);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(CONTEXT_FILE, JSON.stringify(ctx));
  for (const who of ["seller", "buyer", "admin"] as const) {
    fs.writeFileSync(path.join(dir, `${who}.json`), JSON.stringify(storageState(ctx[who])));
  }
}
