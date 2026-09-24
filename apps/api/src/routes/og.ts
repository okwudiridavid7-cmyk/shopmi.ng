import { Router } from "express";
import sharp from "sharp";
import { prisma } from "../db/prisma";
import { decimalToNumber } from "../lib/serialize";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : `${s.slice(0, n - 1)}…`;
}

export const ogRouter = Router();

/** Public OG card image for product share previews. */
ogRouter.get("/products/:id", async (req, res, next) => {
  try {
    const product = await prisma.product.findFirst({
      where: {
        id: req.params.id,
        status: "active",
        tenant: { status: { not: "suspended" } },
      },
      include: { tenant: { select: { name: true, slug: true } } },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const title = escapeXml(truncate(product.title, 48));
    const shop = escapeXml(truncate(product.tenant.name, 36));
    const price = escapeXml(
      `${product.currency} ${decimalToNumber(product.price).toLocaleString("en-NG", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      })}`
    );
    const verified = product.tenant
      ? await prisma.tenant.findUnique({
          where: { id: product.tenantId },
          select: { verifiedBadge: true },
        })
      : null;

    const badge = verified?.verifiedBadge
      ? `<rect x="48" y="280" rx="8" width="110" height="28" fill="#3dba7e"/>
         <text x="103" y="299" text-anchor="middle" fill="#06140e" font-size="14" font-family="system-ui,sans-serif">Verified</text>`
      : "";

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0e1511"/>
      <stop offset="100%" stop-color="#1a2420"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <circle cx="1050" cy="80" r="180" fill="#1f6b4a" fill-opacity="0.25"/>
  <circle cx="100" cy="520" r="140" fill="#3dba7e" fill-opacity="0.12"/>
  <text x="48" y="72" fill="#9aaca1" font-size="22" font-family="system-ui,sans-serif" letter-spacing="4">VENDORS</text>
  <text x="48" y="180" fill="#e8f0ea" font-size="56" font-family="Georgia,serif" font-weight="700">${title}</text>
  <text x="48" y="240" fill="#3dba7e" font-size="40" font-family="system-ui,sans-serif" font-weight="600">${price}</text>
  <text x="48" y="320" fill="#9aaca1" font-size="24" font-family="system-ui,sans-serif">${shop}</text>
  ${badge}
</svg>`;

    const png = await sharp(Buffer.from(svg)).png().toBuffer();
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.send(png);
  } catch (err) {
    return next(err);
  }
});
