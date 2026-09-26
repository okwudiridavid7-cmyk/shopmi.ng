"use client";

import { Heart } from "lucide-react";
import { PageHeader } from "@/components/dashboard/page-header";
import { ProductCard } from "@/components/product-card";
import { EmptyState, QueryErrorState } from "@/components/empty-state";
import { ProductCardSkeleton } from "@/components/skeleton";
import { useBuyerFavorites, useRemoveFavorite } from "@/hooks/use-buyer";

export default function BuyerFavoritesPage() {
  const { data: favorites = [], error, isLoading, refetch } =
    useBuyerFavorites();
  const removeFavorite = useRemoveFavorite();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Favorites"
        description="Products you’ve saved for later."
        icon={Heart}
      />

      {error ? (
        <QueryErrorState
          error={error}
          onRetry={() => {
            void refetch();
          }}
          sellerHomeHref="/buyer"
        />
      ) : isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          kind="favorites"
          icon={Heart}
          actionLabel="Browse marketplace"
          actionHref="/explore"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((f) => (
            <ProductCard
              key={f.id}
              product={f.product}
              favorited
              favoriteBusy={removeFavorite.isPending}
              onFavoriteToggle={() => removeFavorite.mutate(f.product.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
