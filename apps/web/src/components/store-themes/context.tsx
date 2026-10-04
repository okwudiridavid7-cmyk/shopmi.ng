"use client";

import { createContext, useContext } from "react";
import type { StoreThemeId } from "@vendors/shared-types";

type StoreThemeContextValue = {
  id: StoreThemeId;
  /** Seller brand colour, or the theme default. */
  brand: string;
};

const StoreThemeContext = createContext<StoreThemeContextValue>({
  id: "classic",
  brand: "#ff822e",
});

export const StoreThemeProvider = StoreThemeContext.Provider;

/** Active storefront theme; "classic" outside shop pages. */
export function useStoreTheme(): StoreThemeContextValue {
  return useContext(StoreThemeContext);
}
