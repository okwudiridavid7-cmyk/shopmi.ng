import type { TenantPublic } from "@vendors/shared-types";
import { TrustBadge, UnverifiedShopBanner } from "@/components/shell/trust-badge";

/** @deprecated Prefer TrustBadge — kept for existing imports. */
export function VerifiedBadge({ className = "" }: { className?: string }) {
  return <TrustBadge verified className={className} />;
}

/** @deprecated Prefer UnverifiedShopBanner — kept for existing imports. */
export function UnverifiedBanner({ shopName }: { shopName?: string }) {
  return <UnverifiedShopBanner shopName={shopName} />;
}

export function ShopTrustHeader({ tenant }: { tenant: TenantPublic }) {
  return (
    <div className="space-y-token-3">
      <div className="flex flex-wrap items-center gap-token-3">
        <h1 className="font-display text-4xl">{tenant.name}</h1>
        <TrustBadge verified={tenant.verifiedBadge} />
      </div>
      {!tenant.verifiedBadge && (
        <UnverifiedShopBanner
          shopName={tenant.name}
          storageKey={`unverified-banner:${tenant.slug}`}
        />
      )}
    </div>
  );
}
