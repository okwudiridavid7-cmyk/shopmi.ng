import { OG_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Shop trusted independent sellers on Shopmi.ng";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "For buyers",
    title: "Shop Nigerian brands with confidence",
    subtitle:
      "Verified sellers, secure Paystack checkout and every order tracked.",
    screenshot: "og/marketplace.jpg",
  });
}
