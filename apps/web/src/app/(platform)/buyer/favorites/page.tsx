"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { EmptyState } from "@/components/empty-state";
import { ProductCardSkeleton } from "@/components/skeleton";
import { useBuyerFavorites, useRemoveFavorite } from "@/hooks/use-buyer";

export default function BuyerFavoritesPage() {
  const { data: favorites = [], error, isLoading } = useBuyerFavorites();
  const removeFavorite = useRemoveFavorite();

  return (
    <div className="space-y-token-4">
      <div>
        <h1 className="font-display text-2xl text-foreground">Favorites</h1>
        <p className="mt-token-1 text-sm text-muted-foreground">
          Products you’ve saved for later.
        </p>
      </div>

      {error ? (
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Failed to load"}{" "}
          <Link href="/login" className="text-accent underline">
            Log in
          </Link>
        </p>
      ) : isLoading ? (
        <div className="grid gap-token-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : favorites.length === 0 ? (
        <EmptyState
          title="No favorites yet"
          description="Tap the heart on a product to save it here. Start browsing and build your shortlist."
          actionLabel="Browse marketplace"
          actionHref="/"
          icon={Heart}
        />
      ) : (
        <div className="grid gap-token-4 sm:grid-cols-2 lg:grid-cols-3">
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
