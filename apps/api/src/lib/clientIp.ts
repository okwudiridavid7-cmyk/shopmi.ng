import net from "net";
import type { NextFunction, Request, Response } from "express";

/**
 * Cloudflare's published edge ranges (https://www.cloudflare.com/ips/).
 * Only when the hop that reached Render is one of these do we trust CF-Connecting-IP.
 */
const CLOUDFLARE_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];

const cloudflare = new net.BlockList();
for (const cidr of CLOUDFLARE_RANGES) {
  const [addr, bits] = cidr.split("/") as [string, string];
  cloudflare.addSubnet(addr, Number(bits), net.isIPv6(addr) ? "ipv6" : "ipv4");
}

function normalize(ip: string | undefined): string | null {
  if (!ip) return null;
  const v = ip.trim().replace(/^::ffff:/, "");
  return net.isIP(v) ? v : null;
}

export function isCloudflareIp(ip: string): boolean {
  const v = normalize(ip);
  if (!v) return false;
  return cloudflare.check(v, net.isIPv6(v) ? "ipv6" : "ipv4");
}

/**
 * Real client IP behind Cloudflare -> Render -> app.
 * Render appends the connecting address as the last X-Forwarded-For entry, so that
 * entry is trustworthy. If it is a Cloudflare edge, the visitor is CF-Connecting-IP;
 * otherwise someone hit Render directly and the last hop is the visitor.
 */
export function resolveClientIp(req: Request): string {
  const socketIp = normalize(req.socket.remoteAddress) ?? "unknown";
  const xff = req.headers["x-forwarded-for"];
  const raw = Array.isArray(xff) ? xff.join(",") : xff;
  if (!raw) return socketIp;
  const hops = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const lastHop = normalize(hops[hops.length - 1]);
  if (!lastHop) return socketIp;
  if (isCloudflareIp(lastHop)) {
    const cf = req.headers["cf-connecting-ip"];
    const cfIp = normalize(Array.isArray(cf) ? cf[0] : cf);
    if (cfIp) return cfIp;
  }
  return lastHop;
}

/** Overrides req.ip so every consumer (rate limits, logs) sees the real visitor. */
export function clientIpMiddleware(req: Request, _res: Response, next: NextFunction) {
  Object.defineProperty(req, "ip", { value: resolveClientIp(req), configurable: true, enumerable: true });
  next();
}
