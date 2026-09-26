import { redirect } from "next/navigation";

/** Team management lives under Settings. */
export default function SellerTeamRedirect() {
  redirect("/seller/settings#team");
}
