import { redirect } from "next/navigation";

/** Team management lives under Settings (UI-3). */
export default function SellerTeamRedirect() {
  redirect("/seller/settings#team");
}
