import { redirect } from "next/navigation";

/** Custom domain field lives under Settings. */
export default function SellerDomainRedirect() {
  redirect("/seller/settings#domain");
}
