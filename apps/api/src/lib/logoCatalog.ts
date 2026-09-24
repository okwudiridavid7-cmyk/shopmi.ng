/** Curated Lucide icon paths (24×24 viewBox) for server-side logo generation. */
export const LOGO_ICON_CATALOG: {
  id: string;
  label: string;
  path: string;
}[] = [
  {
    id: "store",
    label: "Store",
    path: "M2 7v1a1 1 0 0 0 1 1h2v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9h2a1 1 0 0 0 1-1V7l-9-4-9 4Z M6 9v8h12V9",
  },
  {
    id: "shopping-bag",
    label: "Shopping bag",
    path: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4ZM3.8 6h16.4L19 4H5l-1.2 2ZM12 10a4 4 0 0 0-4 4v2h8v-2a4 4 0 0 0-4-4Z",
  },
  {
    id: "sparkles",
    label: "Sparkles",
    path: "M9.9 2.2a1 1 0 0 1 4.2 0l.4 1.6a1 1 0 0 0 .8.7l1.6.4a1 1 0 0 1 0 4.2l-1.6.4a1 1 0 0 0-.8.7l-.4 1.6a1 1 0 0 1-4.2 0l-.4-1.6a1 1 0 0 0-.8-.7l-1.6-.4a1 1 0 0 1 0-4.2l1.6-.4a1 1 0 0 0 .8-.7l.4-1.6ZM18 14l1 4 1-4 4-1-4-1-1-4-1 4-4 1 4 1Z",
  },
  {
    id: "heart",
    label: "Heart",
    path: "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7 7-7Z",
  },
  {
    id: "star",
    label: "Star",
    path: "M12 2l2.9 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l7.1-1.01L12 2Z",
  },
  {
    id: "package",
    label: "Package",
    path: "M12 22 2 7l10-5 10 5-10 15ZM12 22V12M2 7l10 5 10-5M12 12 22 7",
  },
  {
    id: "gem",
    label: "Gem",
    path: "M6 3h12l4 6-10 13L2 9l4-6ZM12 22 6 9h12l-6 13ZM2 9h20",
  },
  {
    id: "leaf",
    label: "Leaf",
    path: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12",
  },
  {
    id: "coffee",
    label: "Coffee",
    path: "M10 2v2M14 2v2M16 8a1 1 0 0 1 1 1v1a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h10ZM6.53 18.5A7 7 0 0 0 18 14v-1",
  },
  {
    id: "home",
    label: "Home",
    path: "M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .7-1.53l7-5.33a2 2 0 0 1 2.4 0l7 5.33A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z",
  },
  {
    id: "shirt",
    label: "Fashion",
    path: "M20.38 3.46 16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23Z",
  },
  {
    id: "zap",
    label: "Energy",
    path: "M13 2 3 14h9l-1 8 10-12h-9l1-8Z",
  },
  {
    id: "crown",
    label: "Premium",
    path: "M11.6 3.7a1 1 0 0 1 1.8 0l1.5 3.1 3.4.5a1 1 0 0 1 .55 1.7l-2.5 2.4.6 3.4a1 1 0 0 1-1.45 1.05L12 14.3l-3 1.6a1 1 0 0 1-1.45-1.05l.6-3.4-2.5-2.4a1 1 0 0 1 .55-1.7l3.4-.5 1.5-3.1Z",
  },
  {
    id: "truck",
    label: "Delivery",
    path: "M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2M15 18h2M2 8h4v4H2V8ZM20 18h2v-3.34a4 4 0 0 0-1.17-2.83L19 10h-5v8h1M7 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM17 18a2 2 0 1 0 4 0 2 2 0 0 0-4 0Z",
  },
  {
    id: "palette",
    label: "Creative",
    path: "M12 22a1 1 0 0 1 0-20 10 9 0 0 1 10 9 5 5 0 0 1-5 5h-2.25a1.75 1.75 0 0 0-1.4 2.8l.3.4a1.75 1.75 0 0 1-1.4 2.8Z M7.5 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM12 7.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM16.5 12a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z",
  },
  {
    id: "book-open",
    label: "Books",
    path: "M12 7v14M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3H3Z",
  },
];

export const LOGO_FONT_PAIRS: {
  id: string;
  label: string;
  headingFont: string;
  bodyFont: string;
}[] = [
  {
    id: "modern",
    label: "Modern",
    headingFont: "system-ui, -apple-system, sans-serif",
    bodyFont: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "classic",
    label: "Classic",
    headingFont: "Georgia, 'Times New Roman', serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
  },
  {
    id: "bold",
    label: "Bold sans",
    headingFont: "'Arial Black', 'Helvetica Neue', sans-serif",
    bodyFont: "system-ui, -apple-system, sans-serif",
  },
  {
    id: "elegant",
    label: "Elegant",
    headingFont: "'Palatino Linotype', Palatino, serif",
    bodyFont: "system-ui, sans-serif",
  },
];

export function getLogoIcon(id: string) {
  return LOGO_ICON_CATALOG.find((i) => i.id === id) ?? LOGO_ICON_CATALOG[0];
}

export function getFontPair(id: string) {
  return LOGO_FONT_PAIRS.find((f) => f.id === id) ?? LOGO_FONT_PAIRS[0];
}
