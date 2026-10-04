import { OG_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Shopmi.ng marketplace";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "Marketplace",
    title: "Shop independent Nigerian sellers",
    subtitle:
      "Fashion, beauty, electronics, food and more. Pay securely with Paystack.",
    screenshot: "og/marketplace.jpg",
  });
}
