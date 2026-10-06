const isDev = process.env.NODE_ENV !== "production";

function originOf(url) {
  try {
    return url ? new URL(url).origin : "";
  } catch {
    return "";
  }
}

const apiOrigin = originOf(process.env.NEXT_PUBLIC_API_URL) || "http://localhost:4000";
const mediaOrigin = originOf(process.env.NEXT_PUBLIC_MEDIA_URL);

// Chat widgets sellers can pick (see lib/chat-embed.ts) and the Turnstile captcha.
const chatScriptHosts = [
  "https://embed.tawk.to",
  "https://*.tawk.to",
  "https://client.crisp.chat",
  "https://*.crisp.chat",
  "https://code.tidio.co",
  "https://*.tidio.co",
  "https://*.tidiochat.com",
];
const chatSocketHosts = ["wss://*.tawk.to", "wss://*.crisp.chat", "wss://*.tidio.co"];
const turnstile = "https://challenges.cloudflare.com";

const csp = [
  "default-src 'self'",
  // Next injects inline bootstrap scripts; third-party script hosts stay allowlisted.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} ${turnstile} ${chatScriptHosts.join(" ")}`,
  "style-src 'self' 'unsafe-inline' https:",
  "img-src 'self' data: blob: https:" + (isDev ? " http://localhost:4000 http://127.0.0.1:4000" : ""),
  "font-src 'self' data: https:",
  "media-src 'self' blob: https:",
  [
    "connect-src 'self'",
    apiOrigin,
    mediaOrigin,
    turnstile,
    "https://cdn.jsdelivr.net",
    ...chatScriptHosts,
    ...chatSocketHosts,
    isDev ? "ws://localhost:3000 http://localhost:4000" : "",
  ]
    .filter(Boolean)
    .join(" "),
  `frame-src ${turnstile} https://*.tawk.to https://*.tidio.co https://*.tidiochat.com https://*.crisp.chat`,
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  isDev ? "" : "upgrade-insecure-requests",
]
  .filter(Boolean)
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  ...(isDev
    ? []
    : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const mediaPatterns = [
  { protocol: "https", hostname: "media.shopmi.ng" },
  { protocol: "https", hostname: "api.shopmi.ng" },
];
if (mediaOrigin) {
  const { protocol, hostname } = new URL(mediaOrigin);
  if (!mediaPatterns.some((p) => p.hostname === hostname)) {
    mediaPatterns.push({ protocol: protocol.replace(":", ""), hostname });
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@vendors/shared-types"],
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      ...mediaPatterns,
      { protocol: "http", hostname: "localhost", port: "4000" },
      { protocol: "http", hostname: "localhost", port: "3000" },
      { protocol: "http", hostname: "127.0.0.1", port: "4000" },
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return [{ source: "/about", destination: "/#about", permanent: true }];
  },
  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "recharts",
      "framer-motion",
      "motion",
      "@tanstack/react-query",
    ],
  },
};

module.exports = nextConfig;
