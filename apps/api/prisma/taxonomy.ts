/** Nested marketplace taxonomy — Wave 6. Slugs are stable; names are our own wording. */

export type CategorySeedNode = {
  name: string;
  slug: string;
  children?: CategorySeedNode[];
};

export const MARKETPLACE_TAXONOMY: CategorySeedNode[] = [
  {
    name: "Electronics & Gadgets",
    slug: "electronics-gadgets",
    children: [
      { name: "Phones & Accessories", slug: "phones-accessories" },
      { name: "Computers & Laptops", slug: "computers-laptops" },
      { name: "Audio & Headphones", slug: "audio-headphones" },
      { name: "Cameras & Photo", slug: "cameras-photo" },
      { name: "Smart Home", slug: "smart-home" },
      { name: "Wearables", slug: "wearables" },
      { name: "Gaming", slug: "gaming-electronics" },
      { name: "TV & Video", slug: "tv-video" },
    ],
  },
  {
    name: "Home & Kitchen",
    slug: "home-kitchen",
    children: [
      { name: "Furniture", slug: "furniture" },
      { name: "Cookware & Bakeware", slug: "cookware-bakeware" },
      { name: "Small Appliances", slug: "small-appliances" },
      { name: "Bedding & Bath", slug: "bedding-bath" },
      { name: "Home Decor", slug: "home-decor" },
      { name: "Storage & Organization", slug: "storage-organization" },
      { name: "Lighting", slug: "lighting" },
    ],
  },
  {
    name: "Fashion",
    slug: "fashion",
    children: [
      { name: "Women's Clothing", slug: "womens-clothing" },
      { name: "Men's Clothing", slug: "mens-clothing" },
      { name: "Shoes", slug: "shoes" },
      { name: "Bags & Luggage", slug: "bags-luggage" },
      { name: "Jewelry & Watches", slug: "jewelry-watches" },
      { name: "Accessories", slug: "fashion-accessories" },
    ],
  },
  {
    name: "Beauty Health & Personal Care",
    slug: "beauty-health-personal-care",
    children: [
      { name: "Skincare", slug: "skincare" },
      { name: "Hair Care", slug: "hair-care" },
      { name: "Makeup", slug: "makeup" },
      { name: "Fragrances", slug: "fragrances" },
      { name: "Wellness & Supplements", slug: "wellness-supplements" },
      { name: "Personal Care", slug: "personal-care" },
      { name: "Oral Care", slug: "oral-care" },
    ],
  },
  {
    name: "Baby Kids & Toys",
    slug: "baby-kids-toys",
    children: [
      { name: "Baby Gear", slug: "baby-gear" },
      { name: "Diapering & Feeding", slug: "diapering-feeding" },
      { name: "Kids Clothing", slug: "kids-clothing" },
      { name: "Toys & Games", slug: "toys-games" },
      { name: "School Supplies", slug: "school-supplies-kids" },
      { name: "Nursery", slug: "nursery" },
    ],
  },
  {
    name: "Groceries & Food",
    slug: "groceries-food",
    children: [
      { name: "Pantry Staples", slug: "pantry-staples" },
      { name: "Snacks & Confectionery", slug: "snacks-confectionery" },
      { name: "Beverages", slug: "beverages" },
      { name: "Cooking Oils & Spices", slug: "oils-spices" },
      { name: "Fresh & Produce", slug: "fresh-produce" },
      { name: "Household Essentials", slug: "household-essentials-food" },
    ],
  },
  {
    name: "Automotive",
    slug: "automotive",
    children: [
      { name: "Car Care", slug: "car-care" },
      { name: "Interior Accessories", slug: "car-interior" },
      { name: "Exterior Accessories", slug: "car-exterior" },
      { name: "Oils & Fluids", slug: "oils-fluids" },
      { name: "Motorcycle", slug: "motorcycle" },
      { name: "Tools & Diagnostic", slug: "auto-tools" },
    ],
  },
  {
    name: "Sports & Outdoors",
    slug: "sports-outdoors",
    children: [
      { name: "Fitness Equipment", slug: "fitness-equipment" },
      { name: "Team Sports", slug: "team-sports" },
      { name: "Outdoor Recreation", slug: "outdoor-recreation" },
      { name: "Cycling", slug: "cycling" },
      { name: "Camping & Hiking", slug: "camping-hiking" },
      { name: "Sportswear", slug: "sportswear" },
    ],
  },
  {
    name: "Tools & Home Improvement",
    slug: "tools-home-improvement",
    children: [
      { name: "Power Tools", slug: "power-tools" },
      { name: "Hand Tools", slug: "hand-tools" },
      { name: "Hardware", slug: "hardware" },
      { name: "Electrical", slug: "electrical" },
      { name: "Plumbing", slug: "plumbing" },
      { name: "Paint & Supplies", slug: "paint-supplies" },
      { name: "Safety Gear", slug: "safety-gear" },
    ],
  },
  {
    name: "Office & Stationery",
    slug: "office-stationery",
    children: [
      { name: "Writing Supplies", slug: "writing-supplies" },
      { name: "Paper & Notebooks", slug: "paper-notebooks" },
      { name: "Desk Organization", slug: "desk-organization" },
      { name: "Printers & Ink", slug: "printers-ink" },
      { name: "Office Electronics", slug: "office-electronics" },
      { name: "Filing & Storage", slug: "filing-storage" },
    ],
  },
  {
    name: "Pet Supplies",
    slug: "pet-supplies",
    children: [
      { name: "Dog Supplies", slug: "dog-supplies" },
      { name: "Cat Supplies", slug: "cat-supplies" },
      { name: "Pet Food", slug: "pet-food" },
      { name: "Aquarium & Fish", slug: "aquarium-fish" },
      { name: "Small Pets & Birds", slug: "small-pets-birds" },
      { name: "Pet Grooming", slug: "pet-grooming" },
    ],
  },
  {
    name: "Arts Crafts & Hobbies",
    slug: "arts-crafts-hobbies",
    children: [
      { name: "Drawing & Painting", slug: "drawing-painting" },
      { name: "Sewing & Fabric", slug: "sewing-fabric" },
      { name: "Beading & Jewelry Making", slug: "beading-jewelry-making" },
      { name: "Scrapbooking", slug: "scrapbooking" },
      { name: "Musical Instruments", slug: "musical-instruments" },
      { name: "Collectibles", slug: "collectibles" },
    ],
  },
  {
    name: "Agriculture & Industrial",
    slug: "agriculture-industrial",
    children: [
      { name: "Farm Tools", slug: "farm-tools" },
      { name: "Seeds & Fertilizers", slug: "seeds-fertilizers" },
      { name: "Irrigation", slug: "irrigation" },
      { name: "Livestock Supplies", slug: "livestock-supplies" },
      { name: "Safety & Workwear", slug: "industrial-workwear" },
      { name: "Packaging & Materials", slug: "packaging-materials" },
      { name: "Industrial Equipment", slug: "industrial-equipment" },
    ],
  },
];
