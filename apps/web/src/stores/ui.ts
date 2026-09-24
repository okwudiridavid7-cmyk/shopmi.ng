import { create } from "zustand";

export type MarketplaceSort =
  | "relevance"
  | "price_asc"
  | "price_desc"
  | "newest";

export type MarketplaceFilters = {
  category: string;
  shopCategory: string;
  brand: string;
  location: string;
  countryCode: string;
  stateCode: string;
  minPrice: string;
  maxPrice: string;
  q: string;
  sort: MarketplaceSort;
};

const emptyFilters: MarketplaceFilters = {
  category: "",
  shopCategory: "",
  brand: "",
  location: "",
  countryCode: "",
  stateCode: "",
  minPrice: "",
  maxPrice: "",
  q: "",
  sort: "relevance",
};

type MarketplaceFilterState = {
  filters: MarketplaceFilters;
  setFilter: <K extends keyof MarketplaceFilters>(
    key: K,
    value: MarketplaceFilters[K]
  ) => void;
  setFilters: (partial: Partial<MarketplaceFilters>) => void;
  clearFilters: () => void;
};

/** Client UI store — marketplace sidebar filters (shared across remounts). */
export const useMarketplaceFilters = create<MarketplaceFilterState>((set) => ({
  filters: emptyFilters,
  setFilter: (key, value) =>
    set((s) => ({ filters: { ...s.filters, [key]: value } })),
  setFilters: (partial) =>
    set((s) => ({ filters: { ...s.filters, ...partial } })),
  clearFilters: () => set({ filters: emptyFilters }),
}));

type UiState = {
  sellerProductFormOpen: boolean;
  setSellerProductFormOpen: (open: boolean) => void;
  cartDrawerOpen: boolean;
  setCartDrawerOpen: (open: boolean) => void;
  toggleCartDrawer: () => void;
  navDrawerOpen: boolean;
  setNavDrawerOpen: (open: boolean) => void;
  shopFilterDrawerOpen: boolean;
  setShopFilterDrawerOpen: (open: boolean) => void;
};

/** Lightweight cross-page UI flags. */
export const useUiStore = create<UiState>((set) => ({
  sellerProductFormOpen: false,
  setSellerProductFormOpen: (open) => set({ sellerProductFormOpen: open }),
  cartDrawerOpen: false,
  setCartDrawerOpen: (open) => set({ cartDrawerOpen: open }),
  toggleCartDrawer: () => set((s) => ({ cartDrawerOpen: !s.cartDrawerOpen })),
  navDrawerOpen: false,
  setNavDrawerOpen: (open) => set({ navDrawerOpen: open }),
  shopFilterDrawerOpen: false,
  setShopFilterDrawerOpen: (open) => set({ shopFilterDrawerOpen: open }),
}));
