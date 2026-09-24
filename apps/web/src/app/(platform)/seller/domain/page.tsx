import { redirect } from "next/navigation";

/** Custom domain field lives under Settings (UI-3). */
export default function SellerDomainRedirect() {
  redirect("/seller/settings#domain");
}
