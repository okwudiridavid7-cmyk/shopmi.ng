import { OG_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Shopmi.ng: shop local brands or open your online store";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "Independent shops",
    title: "Shop local. Sell online.",
    subtitle:
      "Discover independent Nigerian brands or open your own online store in minutes.",
    screenshot: "og/hero.jpg",
  });
}
