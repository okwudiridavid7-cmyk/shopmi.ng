import { OG_SIZE, renderOgCard } from "@/lib/og";

export const runtime = "nodejs";
export const alt = "Create your online store on Shopmi.ng";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  return renderOgCard({
    eyebrow: "For sellers",
    title: "Your online store, ready in minutes",
    subtitle:
      "Branded shop link, Paystack checkout and an orders dashboard on your phone.",
    screenshot: "og/dashboard.jpg",
  });
}
