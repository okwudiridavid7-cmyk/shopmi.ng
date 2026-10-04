/** Unsplash photo per top-level category slug, used where a category needs a cover image. */
const CATEGORY_PHOTOS: Record<string, { id: string; alt: string; pos?: string }> = {
  "electronics-gadgets": { id: "1498049794561-7780e7231661", alt: "Headphones, phone and laptop on a desk" },
  "home-kitchen": { id: "1556909114-f6e7ad7d3136", alt: "Couple cooking together in a home kitchen" },
  fashion: { id: "1445205170230-053b83016050", alt: "Clothes hanging on a boutique rail" },
  "beauty-health-personal-care": { id: "1556228578-0d85b1a4d571", alt: "Skincare bottles on a tiled shelf" },
  "baby-kids-toys": { id: "1596461404969-9ae70f2830c1", alt: "Wooden toy train set" },
  "groceries-food": { id: "1542838132-92c53300491e", alt: "Fresh vegetables on supermarket shelves" },
  automotive: { id: "1492144534655-ae79c964c9d7", alt: "Sports car parked in a garage" },
  "sports-outdoors": { id: "1517836357463-d25dfeac3438", alt: "Athlete lifting a barbell" },
  "tools-home-improvement": { id: "1504148455328-c376907d081c", alt: "Cordless power drill on a workbench" },
  "office-stationery": { id: "1456735190827-d1262f71b8a3", alt: "Pens, markers and notes in a desk tray" },
  "pet-supplies": { id: "1548199973-03cce0bbc87b", alt: "Two small dogs running outdoors" },
  "arts-crafts-hobbies": { id: "1513364776144-60967b0f800f", alt: "Paint brushes and bright paint" },
  "agriculture-industrial": { id: "1500382017468-9049fed747ef", alt: "Farm field at sunset" },
};

export function categoryPhoto(slug: string, width = 600): { url: string; alt: string; pos?: string } | null {
  const photo = CATEGORY_PHOTOS[slug];
  if (!photo) return null;
  const height = Math.round((width * 4) / 3);
  return {
    url: `https://images.unsplash.com/photo-${photo.id}?auto=format&fit=crop&w=${width}&h=${height}&q=70`,
    alt: photo.alt,
    pos: photo.pos,
  };
}
