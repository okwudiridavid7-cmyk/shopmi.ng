/** sessionStorage keys shared by /cart/import and /cart. */
export const CART_IMPORT_NOTES_KEY = "shopmi:cart-import-notes";

export function shopReturnKey(slug: string): string {
  return `shopmi:shop-return:${slug}`;
}
