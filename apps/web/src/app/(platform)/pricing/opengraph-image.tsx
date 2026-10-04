import { OG_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Shopmi.ng pricing";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "Pricing",
    title: "Simple plans for your online store",
    subtitle:
      "Start with a free trial. Paystack checkout and your own shop link included.",
    screenshot: "og/dashboard.jpg",
  });
}
