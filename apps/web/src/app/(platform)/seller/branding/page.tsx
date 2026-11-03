import { redirect } from "next/navigation";

/** Branding lives under Website → Branding tab. */
export default function SellerBrandingRedirectPage() {
  redirect("/seller/website?tab=branding");
}
