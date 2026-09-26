import path from "path";
import dotenv from "dotenv";
import { PrismaClient, type OrderStatus, type Prisma } from "@prisma/client";
import * as argon2 from "argon2";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const prisma = new PrismaClient();

const DEMO_PASSWORD = "DemoPass123!";
const DEMO_SEED_VERSION = "wave5-1";

type Niche = "fashion" | "electronics" | "home" | "beauty" | "sports";

const NICHE_TO_CATEGORY: Record<Niche, string> = {
  fashion: "fashion",
  electronics: "electronics-gadgets",
  home: "home-kitchen",
  beauty: "beauty-health-personal-care",
  sports: "sports-outdoors",
};

type ShopDef = {
  name: string;
  slug: string;
  niche: Niche;
  color: string;
  verified: boolean;
  location: string;
  shopCategories: { name: string; slug: string }[];
  banner: { imageUrl: string; title: string; subtitle: string };
  products: {
    title: string;
    description: string;
    price: number;
    compareAtPrice?: number;
    stockQty: number;
    brandName: string;
    image: string;
    shopCategorySlug: string;
    recent?: boolean;
  }[];
};

const SHOPS: ShopDef[] = [
  {
    name: "Lagos Loom",
    slug: "lagos-loom",
    niche: "fashion",
    color: "#8B2942",
    verified: true,
    location: "Lagos, NG",
    shopCategories: [
      { name: "Ready-to-Wear", slug: "ready-to-wear" },
      { name: "Accessories", slug: "accessories" },
      { name: "Ankara", slug: "ankara" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1441984904996-e0b692843f41?auto=format&fit=crop&w=1600&q=80",
      title: "Woven for the city",
      subtitle: "Contemporary African fashion from Lagos ateliers",
    },
    products: [
      {
        title: "Adire Wrap Dress",
        description:
          "Hand-dyed adire wrap dress with soft cotton lining. Ideal for brunch or evening events.",
        price: 28500,
        compareAtPrice: 34000,
        stockQty: 18,
        brandName: "Lagos Loom",
        image:
          "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ready-to-wear",
        recent: true,
      },
      {
        title: "Ankara Utility Jacket",
        description:
          "Structured utility jacket in bold geometric Ankara print. Unisex fit, brass snaps.",
        price: 42000,
        stockQty: 12,
        brandName: "Lagos Loom",
        image:
          "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ankara",
      },
      {
        title: "Linen Palazzo Set",
        description:
          "Breathable two-piece linen set in sand beige. Crop top with matching wide-leg palazzo.",
        price: 35500,
        compareAtPrice: 41000,
        stockQty: 22,
        brandName: "Loom Atelier",
        image:
          "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ready-to-wear",
      },
      {
        title: "Cowrie Statement Earrings",
        description:
          "Lightweight brass earrings finished with natural cowrie shells. Nickel-free posts.",
        price: 8500,
        stockQty: 45,
        brandName: "Loom Jewelry",
        image:
          "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
        recent: true,
      },
      {
        title: "Silk Headwrap Duo",
        description:
          "Set of two silk satin headwraps — burgundy and gold. Soft hold without frizz.",
        price: 12000,
        stockQty: 30,
        brandName: "Lagos Loom",
        image:
          "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
      },
      {
        title: "Kaftan Maxi in Indigo",
        description:
          "Flowing indigo kaftan with embroidered neckline. One-size relaxed silhouette.",
        price: 31000,
        stockQty: 15,
        brandName: "Loom Atelier",
        image:
          "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ready-to-wear",
      },
      {
        title: "Beaded Clutch Bag",
        description:
          "Evening clutch with hand-beaded front panel and magnetic clasp. Fits phone and cards.",
        price: 19500,
        compareAtPrice: 24000,
        stockQty: 20,
        brandName: "Loom Jewelry",
        image:
          "https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
      },
      {
        title: "Ankara Midi Skirt",
        description:
          "High-waist midi skirt with side zipper. Lined for comfort and opacity.",
        price: 22000,
        stockQty: 25,
        brandName: "Lagos Loom",
        image:
          "https://images.unsplash.com/photo-1583496661160-fb5886a0aaaa?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ankara",
        recent: true,
      },
      {
        title: "Cotton Oxford Shirt",
        description:
          "Crisp oxford shirt tailored for warm climates. Mother-of-pearl buttons.",
        price: 18500,
        stockQty: 28,
        brandName: "Loom Atelier",
        image:
          "https://images.unsplash.com/photo-1596755094514-f87e34085b85?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ready-to-wear",
      },
      {
        title: "Woven Leather Belt",
        description:
          "Handwoven leather belt with brushed buckle. Adjustable lengths.",
        price: 14500,
        stockQty: 35,
        brandName: "Loom Jewelry",
        image:
          "https://images.unsplash.com/photo-1624222247344-550fb60583fd?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
      },
    ],
  },
  {
    name: "Circuit Hub",
    slug: "circuit-hub",
    niche: "electronics",
    color: "#1B4F72",
    verified: true,
    location: "Abuja, NG",
    shopCategories: [
      { name: "Audio", slug: "audio" },
      { name: "Gadgets", slug: "gadgets" },
      { name: "Accessories", slug: "accessories" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1600&q=80",
      title: "Tech that ships fast",
      subtitle: "Curated gadgets and audio for work and play",
    },
    products: [
      {
        title: "Wireless ANC Earbuds",
        description:
          "Active noise cancelling earbuds with 28-hour case battery and IPX5 rating.",
        price: 45000,
        compareAtPrice: 55000,
        stockQty: 40,
        brandName: "Circuit",
        image:
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "audio",
        recent: true,
      },
      {
        title: "USB-C GaN Charger 65W",
        description:
          "Compact GaN wall charger with dual USB-C ports. Laptop + phone ready.",
        price: 28000,
        stockQty: 55,
        brandName: "Circuit Hub",
        image:
          "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
      },
      {
        title: "Mechanical Keyboard 75%",
        description:
          "Hot-swap mechanical keyboard with RGB and wireless mode. Pre-lubed switches.",
        price: 72000,
        stockQty: 14,
        brandName: "Hub Keys",
        image:
          "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "gadgets",
      },
      {
        title: "Portable SSD 1TB",
        description:
          "USB 3.2 portable SSD in shock-resistant casing. Up to 1050 MB/s read.",
        price: 95000,
        compareAtPrice: 110000,
        stockQty: 22,
        brandName: "Circuit",
        image:
          "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "gadgets",
        recent: true,
      },
      {
        title: "Desktop Monitor Arm",
        description:
          "Gas-spring dual monitor arm for 17–32\" screens. Cable management included.",
        price: 38000,
        stockQty: 18,
        brandName: "Circuit Hub",
        image:
          "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
      },
      {
        title: "Bluetooth Speaker Mini",
        description:
          "Pocket speaker with rich bass and 12-hour playtime. Waterproof shell.",
        price: 22000,
        stockQty: 48,
        brandName: "Circuit",
        image:
          "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "audio",
      },
      {
        title: "Webcam 1080p Pro",
        description:
          "Full HD webcam with auto-focus and dual mics for clear video calls.",
        price: 35000,
        stockQty: 26,
        brandName: "Hub Cam",
        image:
          "https://images.unsplash.com/photo-1587825140708-dfaf72ae4b04?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "gadgets",
      },
      {
        title: "Magnetic Cable Pack (3)",
        description:
          "Three magnetic USB-C cables (1m) with nylon braiding and LED tip.",
        price: 9500,
        stockQty: 80,
        brandName: "Circuit Hub",
        image:
          "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
      },
      {
        title: "Laptop Stand Aluminum",
        description:
          "Ergonomic aluminum stand with airflow vents. Fits up to 17\" laptops.",
        price: 18500,
        compareAtPrice: 22000,
        stockQty: 33,
        brandName: "Circuit Hub",
        image:
          "https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "accessories",
        recent: true,
      },
      {
        title: "Smart Plug Duo",
        description:
          "Wi-Fi smart plugs with energy monitoring. Works with Alexa and Google.",
        price: 16000,
        stockQty: 60,
        brandName: "Circuit",
        image:
          "https://images.unsplash.com/photo-1558002038-1055907df827?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "gadgets",
      },
    ],
  },
  {
    name: "Clay & Ember",
    slug: "clay-ember",
    niche: "home",
    color: "#6E2C00",
    verified: false,
    location: "Ibadan, NG",
    shopCategories: [
      { name: "Ceramics", slug: "ceramics" },
      { name: "Tableware", slug: "tableware" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=1600&q=80",
      title: "Fired by hand",
      subtitle: "Studio ceramics and warm tableware for everyday rituals",
    },
    products: [
      {
        title: "Speckled Dinner Plate Set",
        description:
          "Set of 4 stoneware dinner plates with speckled glaze. Microwave safe.",
        price: 24000,
        stockQty: 20,
        brandName: "Clay & Ember",
        image:
          "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "tableware",
      },
      {
        title: "Hand-Thrown Mug",
        description:
          "Artisan mug with comfortable handle and matte exterior. Holds 350ml.",
        price: 6500,
        stockQty: 50,
        brandName: "Ember Studio",
        image:
          "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ceramics",
        recent: true,
      },
      {
        title: "Serving Bowl Large",
        description:
          "Wide ceramic serving bowl for salads and shared dishes. Food-safe glaze.",
        price: 18000,
        compareAtPrice: 21000,
        stockQty: 16,
        brandName: "Clay & Ember",
        image:
          "https://images.unsplash.com/photo-1610701596007-11502861dcfa?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "tableware",
      },
      {
        title: "Bud Vase Pair",
        description:
          "Two small bud vases in complementary earth tones. Perfect for single stems.",
        price: 12000,
        stockQty: 28,
        brandName: "Ember Studio",
        image:
          "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ceramics",
      },
      {
        title: "Espresso Cup Set",
        description:
          "Set of 4 espresso cups with matching saucers. Dense stoneware.",
        price: 15500,
        stockQty: 24,
        brandName: "Clay & Ember",
        image:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "tableware",
        recent: true,
      },
      {
        title: "Oil Pourer Bottle",
        description:
          "Ceramic oil pourer with cork stopper. Slow-drip spout for dressings.",
        price: 9800,
        stockQty: 32,
        brandName: "Ember Studio",
        image:
          "https://images.unsplash.com/photo-1606914469633-bd39206ea739?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "tableware",
      },
      {
        title: "Planter with Tray",
        description:
          "Medium ceramic planter with drainage hole and matching tray.",
        price: 14000,
        stockQty: 19,
        brandName: "Clay & Ember",
        image:
          "https://images.unsplash.com/photo-1485955900006-10f4d324d411?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "ceramics",
      },
      {
        title: "Butter Dish",
        description:
          "Covered butter dish with soft white glaze and wooden knife rest.",
        price: 11000,
        compareAtPrice: 13500,
        stockQty: 21,
        brandName: "Ember Studio",
        image:
          "https://images.unsplash.com/photo-1603199506016-b9a694b5162d?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "tableware",
      },
      {
        title: "Ramekin Set of 6",
        description:
          "Classic ramekins for desserts or dips. Oven and dishwasher safe.",
        price: 13500,
        stockQty: 27,
        brandName: "Clay & Ember",
        image:
          "https://images.unsplash.com/photo-1584990347449-a2d17ebf3273?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "tableware",
      },
    ],
  },
  {
    name: "Glow Ritual",
    slug: "glow-ritual",
    niche: "beauty",
    color: "#4A235A",
    verified: true,
    location: "Lagos, NG",
    shopCategories: [
      { name: "Skincare", slug: "skincare" },
      { name: "Body", slug: "body" },
      { name: "Sets", slug: "sets" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?auto=format&fit=crop&w=1600&q=80",
      title: "Glow starts here",
      subtitle: "Clean formulas for melanin-rich skin",
    },
    products: [
      {
        title: "Vitamin C Serum 30ml",
        description:
          "Stabilized vitamin C serum for brightening. Fragrance-free, suitable for oily skin.",
        price: 18500,
        compareAtPrice: 22000,
        stockQty: 40,
        brandName: "Glow Ritual",
        image:
          "https://images.unsplash.com/photo-1620916297397-a4a5402a3c6c?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "skincare",
        recent: true,
      },
      {
        title: "Shea Body Butter",
        description:
          "Whipped shea body butter with cocoa notes. Deep moisture without greasiness.",
        price: 9500,
        stockQty: 55,
        brandName: "Glow Ritual",
        image:
          "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "body",
      },
      {
        title: "Gentle Foam Cleanser",
        description:
          "pH-balanced foam cleanser that removes SPF and makeup without stripping.",
        price: 12000,
        stockQty: 38,
        brandName: "Ritual Lab",
        image:
          "https://images.unsplash.com/photo-1556228720-195a672e8a03?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "skincare",
      },
      {
        title: "Night Repair Cream",
        description:
          "Ceramide-rich night cream for barrier repair. Non-comedogenic.",
        price: 24000,
        stockQty: 25,
        brandName: "Glow Ritual",
        image:
          "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "skincare",
      },
      {
        title: "Lip Oil Tint",
        description:
          "Nourishing lip oil with sheer berry tint. Non-sticky finish.",
        price: 7500,
        stockQty: 60,
        brandName: "Ritual Lab",
        image:
          "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "body",
        recent: true,
      },
      {
        title: "AM/PM Glow Kit",
        description:
          "Travel kit with cleanser, serum, and moisturizer for a 7-day reset.",
        price: 32000,
        compareAtPrice: 38000,
        stockQty: 18,
        brandName: "Glow Ritual",
        image:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "sets",
      },
      {
        title: "Exfoliating Toner Pads",
        description:
          "60 PHA toner pads for gentle nightly exfoliation. Alcohol-free.",
        price: 14500,
        stockQty: 30,
        brandName: "Ritual Lab",
        image:
          "https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "skincare",
      },
      {
        title: "Hair Growth Oil",
        description:
          "Blend of rosemary, castor, and jojoba oils for scalp massage.",
        price: 11000,
        stockQty: 42,
        brandName: "Glow Ritual",
        image:
          "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "body",
      },
      {
        title: "SPF 50 Fluid",
        description:
          "Lightweight mineral SPF fluid that leaves no white cast on deep skin tones.",
        price: 16500,
        stockQty: 35,
        brandName: "Ritual Lab",
        image:
          "https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "skincare",
        recent: true,
      },
      {
        title: "Bath Soak Ritual",
        description:
          "Epsom and pink salt soak with lavender essential oil. 400g pouch.",
        price: 8500,
        stockQty: 48,
        brandName: "Glow Ritual",
        image:
          "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "body",
      },
    ],
  },
  {
    name: "Peak Motion",
    slug: "peak-motion",
    niche: "sports",
    color: "#145A32",
    verified: true,
    location: "Port Harcourt, NG",
    shopCategories: [
      { name: "Apparel", slug: "apparel" },
      { name: "Training", slug: "training" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1600&q=80",
      title: "Train harder",
      subtitle: "Performance gear built for tropical climates",
    },
    products: [
      {
        title: "Moisture-Wick Tee",
        description:
          "Lightweight training tee with quick-dry fabric and reflective logo.",
        price: 12500,
        stockQty: 45,
        brandName: "Peak Motion",
        image:
          "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "apparel",
        recent: true,
      },
      {
        title: "Compression Leggings",
        description:
          "High-waist compression leggings with phone pocket. Squat-proof fabric.",
        price: 18500,
        compareAtPrice: 22000,
        stockQty: 32,
        brandName: "Peak Motion",
        image:
          "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "apparel",
      },
      {
        title: "Adjustable Dumbbell Pair",
        description:
          "Pair of adjustable dumbbells from 2–12kg each. Compact home setup.",
        price: 65000,
        stockQty: 10,
        brandName: "Peak Gear",
        image:
          "https://images.unsplash.com/photo-1517963879433-6ad2b056d944?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "training",
      },
      {
        title: "Yoga Mat 6mm",
        description:
          "Non-slip yoga mat with alignment markers. Carry strap included.",
        price: 14000,
        stockQty: 28,
        brandName: "Peak Motion",
        image:
          "https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "training",
      },
      {
        title: "Running Shorts Elite",
        description:
          "2-in-1 running shorts with liner and side pocket for keys.",
        price: 15500,
        stockQty: 36,
        brandName: "Peak Motion",
        image:
          "https://images.unsplash.com/photo-1591195853828-11db59a44f6b?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "apparel",
        recent: true,
      },
      {
        title: "Resistance Band Set",
        description:
          "Five latex resistance bands with door anchor and handles.",
        price: 11000,
        stockQty: 50,
        brandName: "Peak Gear",
        image:
          "https://images.unsplash.com/photo-1598289431512-b97b0917affc?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "training",
      },
      {
        title: "Sports Water Bottle 1L",
        description:
          "Insulated stainless bottle keeps drinks cold for 24 hours.",
        price: 9500,
        compareAtPrice: 12000,
        stockQty: 60,
        brandName: "Peak Motion",
        image:
          "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "training",
      },
      {
        title: "Gym Duffle 40L",
        description:
          "Water-resistant duffle with shoe compartment and wet pocket.",
        price: 28000,
        stockQty: 20,
        brandName: "Peak Gear",
        image:
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "apparel",
      },
      {
        title: "Jump Rope Pro",
        description:
          "Speed jump rope with ball bearings and adjustable steel cable.",
        price: 7500,
        stockQty: 70,
        brandName: "Peak Motion",
        image:
          "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "training",
        recent: true,
      },
      {
        title: "Training Gloves",
        description:
          "Padded workout gloves with wrist wrap support. Breathable mesh.",
        price: 8500,
        stockQty: 40,
        brandName: "Peak Gear",
        image:
          "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "training",
      },
    ],
  },
  {
    name: "Lens Lab",
    slug: "lens-lab",
    niche: "electronics",
    color: "#1C2833",
    verified: false,
    location: "Lagos, NG",
    shopCategories: [
      { name: "Cameras", slug: "cameras" },
      { name: "Lighting", slug: "lighting" },
      { name: "Bags", slug: "bags" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=1600&q=80",
      title: "Capture every frame",
      subtitle: "Creator gear for photo and video",
    },
    products: [
      {
        title: "Mirrorless Camera Kit",
        description:
          "APS-C mirrorless body with 18-55 kit lens. 4K video and Wi-Fi transfer.",
        price: 485000,
        compareAtPrice: 520000,
        stockQty: 6,
        brandName: "Lens Lab",
        image:
          "https://images.unsplash.com/photo-1512790182412-b19e6d62bc39?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "cameras",
      },
      {
        title: "LED Soft Panel",
        description:
          "Bi-color LED soft panel with diffuser. USB-C powered for travel shoots.",
        price: 55000,
        stockQty: 15,
        brandName: "Lab Light",
        image:
          "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "lighting",
        recent: true,
      },
      {
        title: "Camera Sling Bag",
        description:
          "Padded sling bag for mirrorless + 2 lenses. Weather-resistant shell.",
        price: 32000,
        stockQty: 22,
        brandName: "Lens Lab",
        image:
          "https://images.unsplash.com/photo-1548036328-c1038a1e061e?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "bags",
      },
      {
        title: "50mm Prime Lens",
        description:
          "Fast f/1.8 prime for portraits. Compatible with popular APS-C mounts.",
        price: 125000,
        stockQty: 8,
        brandName: "Lab Optics",
        image:
          "https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "cameras",
      },
      {
        title: "Tripod Carbon Fiber",
        description:
          "Lightweight carbon tripod with ball head. Packs to 40cm.",
        price: 78000,
        compareAtPrice: 89000,
        stockQty: 12,
        brandName: "Lens Lab",
        image:
          "https://images.unsplash.com/photo-1617005082133-548c4dd27f35?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "cameras",
        recent: true,
      },
      {
        title: "Ring Light 18\"",
        description:
          "Dimmable ring light with phone holder and color temperature dial.",
        price: 28000,
        stockQty: 25,
        brandName: "Lab Light",
        image:
          "https://images.unsplash.com/photo-1626785774573-4b7993143464?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "lighting",
      },
      {
        title: "SD Card 128GB UHS-II",
        description:
          "High-speed UHS-II card for burst shooting and 4K recording.",
        price: 22000,
        stockQty: 40,
        brandName: "Lens Lab",
        image:
          "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "cameras",
      },
      {
        title: "Shotgun Mic Compact",
        description:
          "On-camera shotgun mic with deadcat and shock mount.",
        price: 42000,
        stockQty: 14,
        brandName: "Lab Audio",
        image:
          "https://images.unsplash.com/photo-1598653226810-4f278ea495b0?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "cameras",
      },
      {
        title: "Backdrop Stand Kit",
        description:
          "Adjustable backdrop stand with two muslin backgrounds.",
        price: 35000,
        stockQty: 11,
        brandName: "Lab Light",
        image:
          "https://images.unsplash.com/photo-1471341173076-b0f0c3c5b1b1?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "lighting",
      },
    ],
  },
  {
    name: "Stitch Theory",
    slug: "stitch-theory",
    niche: "fashion",
    color: "#922B21",
    verified: true,
    location: "Enugu, NG",
    shopCategories: [
      { name: "Menswear", slug: "menswear" },
      { name: "Womenswear", slug: "womenswear" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1600&q=80",
      title: "Tailored theory",
      subtitle: "Minimal cuts with bold Nigerian craft",
    },
    products: [
      {
        title: "Structured Blazer",
        description:
          "Single-breasted blazer in charcoal wool blend. Soft shoulder construction.",
        price: 52000,
        compareAtPrice: 60000,
        stockQty: 14,
        brandName: "Stitch Theory",
        image:
          "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "menswear",
      },
      {
        title: "Pleated Midi Dress",
        description:
          "Bias-cut midi dress with subtle pleats. Side zip, fully lined.",
        price: 38000,
        stockQty: 18,
        brandName: "Stitch Theory",
        image:
          "https://images.unsplash.com/photo-1572804013309-59a88b7e92f1?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "womenswear",
        recent: true,
      },
      {
        title: "Wide-Leg Trousers",
        description:
          "High-rise wide-leg trousers with pressed crease. Stretch waistband.",
        price: 26500,
        stockQty: 24,
        brandName: "Theory Studio",
        image:
          "https://images.unsplash.com/photo-1594633312681-425c7b97ccd1?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "womenswear",
      },
      {
        title: "Cuban Collar Shirt",
        description:
          "Relaxed Cuban collar shirt in breathable cotton. Camp-ready fit.",
        price: 19500,
        stockQty: 30,
        brandName: "Stitch Theory",
        image:
          "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "menswear",
        recent: true,
      },
      {
        title: "Knit Cardigan",
        description:
          "Chunky knit cardigan with tortoiseshell buttons. Soft merino blend.",
        price: 31000,
        stockQty: 16,
        brandName: "Theory Studio",
        image:
          "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "womenswear",
      },
      {
        title: "Denim Trucker Jacket",
        description:
          "Classic trucker jacket in mid-wash denim. Contrast stitching.",
        price: 34000,
        compareAtPrice: 39000,
        stockQty: 20,
        brandName: "Stitch Theory",
        image:
          "https://images.unsplash.com/photo-1576995853123-5a10305d93c0?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "menswear",
      },
      {
        title: "Silk Camisole",
        description:
          "Bias-cut silk camisole with adjustable straps. Layer or wear alone.",
        price: 17500,
        stockQty: 28,
        brandName: "Theory Studio",
        image:
          "https://images.unsplash.com/photo-1564257631407-4deb1f99d508?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "womenswear",
      },
      {
        title: "Tailored Chinos",
        description:
          "Slim-straight chinos with hidden stretch. Available in olive and navy.",
        price: 22000,
        stockQty: 35,
        brandName: "Stitch Theory",
        image:
          "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "menswear",
      },
      {
        title: "Wrap Blouse",
        description:
          "False-wrap blouse with soft draping. Machine washable crepe.",
        price: 21000,
        stockQty: 22,
        brandName: "Theory Studio",
        image:
          "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "womenswear",
        recent: true,
      },
      {
        title: "Wool Scarf",
        description:
          "Lightweight wool scarf in herringbone weave. Fringed edges.",
        price: 12500,
        stockQty: 40,
        brandName: "Stitch Theory",
        image:
          "https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "menswear",
      },
    ],
  },
  {
    name: "Nest Form",
    slug: "nest-form",
    niche: "home",
    color: "#196F3D",
    verified: true,
    location: "Abuja, NG",
    shopCategories: [
      { name: "Furniture", slug: "furniture" },
      { name: "Decor", slug: "decor" },
      { name: "Textiles", slug: "textiles" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1600&q=80",
      title: "Form meets nest",
      subtitle: "Furniture and textiles for calm interiors",
    },
    products: [
      {
        title: "Oak Side Table",
        description:
          "Solid oak side table with tapered legs. Oil-finished surface.",
        price: 65000,
        stockQty: 8,
        brandName: "Nest Form",
        image:
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "furniture",
      },
      {
        title: "Linen Throw Blanket",
        description:
          "Stonewashed linen throw in sage. Softens with every wash.",
        price: 28000,
        compareAtPrice: 32000,
        stockQty: 25,
        brandName: "Nest Textiles",
        image:
          "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "textiles",
        recent: true,
      },
      {
        title: "Ceramic Table Lamp",
        description:
          "Curved ceramic base with linen shade. E27 fitting included.",
        price: 42000,
        stockQty: 12,
        brandName: "Nest Form",
        image:
          "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "decor",
      },
      {
        title: "Woven Storage Basket",
        description:
          "Large seagrass basket with handles. Ideal for blankets or toys.",
        price: 16000,
        stockQty: 30,
        brandName: "Nest Form",
        image:
          "https://images.unsplash.com/photo-1595428774223-ef52624120d2?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "decor",
      },
      {
        title: "Accent Dining Chair",
        description:
          "Upholstered dining chair with oak frame. Soft bouclé seat.",
        price: 55000,
        stockQty: 10,
        brandName: "Nest Form",
        image:
          "https://images.unsplash.com/photo-1506439773649-6e0eb8cfb237?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "furniture",
        recent: true,
      },
      {
        title: "Cushion Cover Set",
        description:
          "Set of 2 cotton cushion covers (45cm). Envelope closure.",
        price: 12000,
        stockQty: 40,
        brandName: "Nest Textiles",
        image:
          "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "textiles",
      },
      {
        title: "Wall Mirror Round",
        description:
          "60cm round mirror with thin black metal frame. Ready to hang.",
        price: 35000,
        stockQty: 15,
        brandName: "Nest Form",
        image:
          "https://images.unsplash.com/photo-1618220179428-22790b461013?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "decor",
      },
      {
        title: "Bookshelf Low",
        description:
          "Low open bookshelf in birch plywood. Five compartments.",
        price: 78000,
        compareAtPrice: 88000,
        stockQty: 7,
        brandName: "Nest Form",
        image:
          "https://images.unsplash.com/photo-1594620302200-9a762244a156?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "furniture",
      },
      {
        title: "Curtain Panel Pair",
        description:
          "Blackout curtain panels (2.4m). Soft fold, thermal lining.",
        price: 45000,
        stockQty: 18,
        brandName: "Nest Textiles",
        image:
          "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "textiles",
      },
    ],
  },
  {
    name: "Aura Studio",
    slug: "aura-studio",
    niche: "beauty",
    color: "#7D3C98",
    verified: false,
    location: "Lagos, NG",
    shopCategories: [
      { name: "Makeup", slug: "makeup" },
      { name: "Fragrance", slug: "fragrance" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=1600&q=80",
      title: "Aura unlocked",
      subtitle: "Color and scent crafted for everyday glam",
    },
    products: [
      {
        title: "Matte Lipstick Duo",
        description:
          "Two long-wear matte lipsticks in berry and nude. Cruelty-free.",
        price: 14000,
        stockQty: 35,
        brandName: "Aura Studio",
        image:
          "https://images.unsplash.com/photo-1586495777744-4413f21062fa?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "makeup",
        recent: true,
      },
      {
        title: "Glow Highlighter Stick",
        description:
          "Cream highlighter stick for cheeks and lids. Buildable shimmer.",
        price: 9500,
        stockQty: 42,
        brandName: "Aura",
        image:
          "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "makeup",
      },
      {
        title: "Eau de Parfum 50ml",
        description:
          "Warm floral fragrance with vanilla base. Long-lasting projection.",
        price: 28000,
        compareAtPrice: 34000,
        stockQty: 20,
        brandName: "Aura Studio",
        image:
          "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "fragrance",
      },
      {
        title: "Brow Pencil Precise",
        description:
          "Ultra-fine brow pencil with spoolie. Smudge-resistant formula.",
        price: 7500,
        stockQty: 50,
        brandName: "Aura",
        image:
          "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "makeup",
      },
      {
        title: "Body Mist Citrus",
        description:
          "Light citrus body mist for day wear. 200ml spray bottle.",
        price: 8500,
        stockQty: 38,
        brandName: "Aura Studio",
        image:
          "https://images.unsplash.com/photo-1594035910387-fea47794261f?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "fragrance",
        recent: true,
      },
      {
        title: "Foundation Stick",
        description:
          "Buildable foundation stick with satin finish. Matches deep to medium tones.",
        price: 16500,
        stockQty: 28,
        brandName: "Aura",
        image:
          "https://images.unsplash.com/photo-1631214524020-7e18db9a8f92?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "makeup",
      },
      {
        title: "Nail Lacquer Set",
        description:
          "Three chip-resistant nail lacquers in seasonal shades.",
        price: 11000,
        stockQty: 33,
        brandName: "Aura Studio",
        image:
          "https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "makeup",
      },
      {
        title: "Solid Perfume Compact",
        description:
          "Travel solid perfume in refillable compact. Soft musk notes.",
        price: 12000,
        stockQty: 24,
        brandName: "Aura Studio",
        image:
          "https://images.unsplash.com/photo-1587017539504-67cfbddac569?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "fragrance",
      },
      {
        title: "Setting Spray",
        description:
          "Humidity-proof setting spray for all-day makeup hold.",
        price: 10500,
        compareAtPrice: 13000,
        stockQty: 40,
        brandName: "Aura",
        image:
          "https://images.unsplash.com/photo-1571781926291-c477ebfd024b?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "makeup",
        recent: true,
      },
      {
        title: "Rollerball Trio",
        description:
          "Three 10ml rollerball fragrances for sampling and travel.",
        price: 19500,
        stockQty: 22,
        brandName: "Aura Studio",
        image:
          "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "fragrance",
      },
    ],
  },
  {
    name: "Trail Kit",
    slug: "trail-kit",
    niche: "sports",
    color: "#1A5276",
    verified: true,
    location: "Jos, NG",
    shopCategories: [
      { name: "Outdoor", slug: "outdoor" },
      { name: "Camping", slug: "camping" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1600&q=80",
      title: "Ready for the trail",
      subtitle: "Outdoor kits for weekends and expeditions",
    },
    products: [
      {
        title: "Daypack 25L",
        description:
          "Hydration-ready daypack with rain cover. Ventilated back panel.",
        price: 38000,
        stockQty: 18,
        brandName: "Trail Kit",
        image:
          "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "outdoor",
        recent: true,
      },
      {
        title: "Hiking Poles Pair",
        description:
          "Collapsible aluminum hiking poles with cork grips.",
        price: 22000,
        compareAtPrice: 26000,
        stockQty: 24,
        brandName: "Trail Kit",
        image:
          "https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "outdoor",
      },
      {
        title: "2-Person Tent",
        description:
          "Lightweight dome tent with double wall. Setup under 5 minutes.",
        price: 85000,
        stockQty: 9,
        brandName: "Camp Peak",
        image:
          "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "camping",
      },
      {
        title: "Sleeping Bag 5°C",
        description:
          "Mummy sleeping bag rated to 5°C. Packs into included sack.",
        price: 45000,
        stockQty: 14,
        brandName: "Camp Peak",
        image:
          "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "camping",
      },
      {
        title: "Headlamp 400lm",
        description:
          "Rechargeable headlamp with red-light mode and IPX6 rating.",
        price: 14500,
        stockQty: 35,
        brandName: "Trail Kit",
        image:
          "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "outdoor",
        recent: true,
      },
      {
        title: "Camp Cookset",
        description:
          "Nested aluminum cookset for 2 people. Pot, pan, and kettle.",
        price: 28000,
        stockQty: 16,
        brandName: "Camp Peak",
        image:
          "https://images.unsplash.com/photo-1537905569824-f89f14cceb68?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "camping",
      },
      {
        title: "Insulated Flask 750ml",
        description:
          "Double-wall flask keeps drinks hot for 12 hours on the trail.",
        price: 12500,
        stockQty: 40,
        brandName: "Trail Kit",
        image:
          "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "outdoor",
      },
      {
        title: "Camping Chair Foldable",
        description:
          "Compact camping chair with cup holder. 120kg capacity.",
        price: 18500,
        stockQty: 22,
        brandName: "Camp Peak",
        image:
          "https://images.unsplash.com/photo-1504851149312-7a075b496cc7?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "camping",
      },
      {
        title: "Trail First Aid Kit",
        description:
          "Compact first aid kit with blister care and emergency whistle.",
        price: 9500,
        compareAtPrice: 11000,
        stockQty: 45,
        brandName: "Trail Kit",
        image:
          "https://images.unsplash.com/photo-1603398938378-e54eab446dde?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "outdoor",
      },
      {
        title: "Waterproof Dry Bag 20L",
        description:
          "Roll-top dry bag for river crossings and rainy hikes.",
        price: 11000,
        stockQty: 30,
        brandName: "Trail Kit",
        image:
          "https://images.unsplash.com/photo-1622260614153-03223fb72052?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "outdoor",
        recent: true,
      },
    ],
  },
  {
    name: "Pages & Pour",
    slug: "pages-pour",
    niche: "home",
    color: "#784212",
    verified: false,
    location: "Ibadan, NG",
    shopCategories: [
      { name: "Books", slug: "books" },
      { name: "Coffee", slug: "coffee" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1600&q=80",
      title: "Read. Sip. Repeat.",
      subtitle: "Books and brewware for slow weekends",
    },
    products: [
      {
        title: "Ceramic Pour-Over Set",
        description:
          "Pour-over dripper with matching server. Includes paper filters.",
        price: 22000,
        stockQty: 20,
        brandName: "Pages & Pour",
        image:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "coffee",
        recent: true,
      },
      {
        title: "Espresso Cup Pair",
        description:
          "Two thick-walled espresso cups for home baristas.",
        price: 9500,
        stockQty: 30,
        brandName: "Pour Co",
        image:
          "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "coffee",
      },
      {
        title: "Nigerian Fiction Bundle",
        description:
          "Curated set of three contemporary Nigerian novels. Paperback.",
        price: 18500,
        compareAtPrice: 22000,
        stockQty: 15,
        brandName: "Pages & Pour",
        image:
          "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "books",
      },
      {
        title: "Leather Bookmark Set",
        description:
          "Three hand-cut leather bookmarks with brass charms.",
        price: 5500,
        stockQty: 50,
        brandName: "Pages",
        image:
          "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "books",
      },
      {
        title: "French Press 600ml",
        description:
          "Borosilicate French press with stainless plunger.",
        price: 16000,
        stockQty: 22,
        brandName: "Pour Co",
        image:
          "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "coffee",
        recent: true,
      },
      {
        title: "Reading Lamp Clip",
        description:
          "USB clip lamp with warm LED and flexible neck.",
        price: 8500,
        stockQty: 35,
        brandName: "Pages & Pour",
        image:
          "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "books",
      },
      {
        title: "Single-Origin Beans 250g",
        description:
          "Medium roast single-origin beans. Notes of cocoa and citrus.",
        price: 7500,
        stockQty: 40,
        brandName: "Pour Co",
        image:
          "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "coffee",
      },
      {
        title: "Journal Lined A5",
        description:
          "Cloth-bound A5 journal with 192 lined pages. Elastic closure.",
        price: 6500,
        stockQty: 45,
        brandName: "Pages",
        image:
          "https://images.unsplash.com/photo-1531346878377-a5be20888e57?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "books",
      },
      {
        title: "Milk Frother Handheld",
        description:
          "Battery frother for lattes and matcha. Stainless whisk.",
        price: 4500,
        compareAtPrice: 6000,
        stockQty: 55,
        brandName: "Pour Co",
        image:
          "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "coffee",
      },
    ],
  },
  {
    name: "Green Pantry",
    slug: "green-pantry",
    niche: "home",
    color: "#0E6655",
    verified: true,
    location: "Lagos, NG",
    shopCategories: [
      { name: "Pantry", slug: "pantry" },
      { name: "Kitchen", slug: "kitchen" },
      { name: "Wellness", slug: "wellness" },
    ],
    banner: {
      imageUrl:
        "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1600&q=80",
      title: "Stock the green pantry",
      subtitle: "Wholesome staples and kitchen essentials",
    },
    products: [
      {
        title: "Organic Honey 500g",
        description:
          "Raw multifloral honey from Nigerian apiaries. Unfiltered.",
        price: 8500,
        stockQty: 40,
        brandName: "Green Pantry",
        image:
          "https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "pantry",
        recent: true,
      },
      {
        title: "Cold-Pressed Coconut Oil",
        description:
          "Virgin coconut oil for cooking and skin. 500ml glass jar.",
        price: 6500,
        stockQty: 50,
        brandName: "Green Pantry",
        image:
          "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "pantry",
      },
      {
        title: "Bamboo Cutting Board",
        description:
          "Large bamboo board with juice groove. Naturally antimicrobial.",
        price: 14000,
        compareAtPrice: 17000,
        stockQty: 22,
        brandName: "Pantry Kitchen",
        image:
          "https://images.unsplash.com/photo-1590794056226-9dc1338986b6?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "kitchen",
      },
      {
        title: "Herbal Tea Sampler",
        description:
          "Six herbal blends including hibiscus, ginger, and lemongrass.",
        price: 9500,
        stockQty: 35,
        brandName: "Green Pantry",
        image:
          "https://images.unsplash.com/photo-1564890369478-c89ca6d9cde9?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "wellness",
        recent: true,
      },
      {
        title: "Glass Storage Jars (4)",
        description:
          "Airtight glass jars with bamboo lids. 500ml each.",
        price: 12000,
        stockQty: 28,
        brandName: "Pantry Kitchen",
        image:
          "https://images.unsplash.com/photo-1585515320310-259814833e62?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "kitchen",
      },
      {
        title: "Moringa Powder 200g",
        description:
          "Pure moringa leaf powder. Add to smoothies or soups.",
        price: 5500,
        stockQty: 45,
        brandName: "Green Pantry",
        image:
          "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "wellness",
      },
      {
        title: "Olive Wood Spoon Set",
        description:
          "Three cooking spoons carved from olive wood. Food-safe oil finish.",
        price: 11000,
        stockQty: 30,
        brandName: "Pantry Kitchen",
        image:
          "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "kitchen",
      },
      {
        title: "Spice Trio Tin",
        description:
          "Suya spice, curry blend, and chili flakes in reusable tins.",
        price: 7500,
        stockQty: 38,
        brandName: "Green Pantry",
        image:
          "https://images.unsplash.com/photo-1596040033229-a0b34b4434c8?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "pantry",
      },
      {
        title: "Reusable Produce Bags",
        description:
          "Set of 5 mesh produce bags. Machine washable.",
        price: 4500,
        compareAtPrice: 6000,
        stockQty: 60,
        brandName: "Pantry Kitchen",
        image:
          "https://images.unsplash.com/photo-1610348725531-843dff563e2c?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "kitchen",
        recent: true,
      },
      {
        title: "Turmeric Latte Mix",
        description:
          "Golden milk mix with black pepper and ginger. 200g pouch.",
        price: 6000,
        stockQty: 42,
        brandName: "Green Pantry",
        image:
          "https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=800&q=80",
        shopCategorySlug: "wellness",
      },
    ],
  },
];

const BUYERS: { email: string; name: string }[] = [
  { email: "ada.buyer@demo.vendors.local", name: "Ada Okonkwo" },
  { email: "tunde.buyer@demo.vendors.local", name: "Tunde Bakare" },
  { email: "chioma.buyer@demo.vendors.local", name: "Chioma Eze" },
  { email: "ibrahim.buyer@demo.vendors.local", name: "Ibrahim Musa" },
];

const REVIEW_COMMENTS = [
  "Great quality — shipping was fast too.",
  "Exactly as described. Will order again.",
  "Solid product for the price.",
  "Packaging was thoughtful and the item looks premium.",
  "Happy with this purchase. Recommend.",
];

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(10 + (days % 8), (days * 7) % 60, 0, 0);
  return d;
}

function sellerEmail(slug: string): string {
  return `seller.${slug}@demo.vendors.local`;
}

async function clearTenantCatalog(tenantId: string) {
  // OrderItem has no onDelete from Product — delete orders first.
  await prisma.order.deleteMany({ where: { tenantId } });
  await prisma.favorite.deleteMany({
    where: { product: { tenantId } },
  });
  await prisma.review.deleteMany({
    where: { product: { tenantId } },
  });
  await prisma.cartItem.deleteMany({
    where: { product: { tenantId } },
  });
  await prisma.product.deleteMany({ where: { tenantId } });
  await prisma.shopBanner.deleteMany({ where: { tenantId } });
  await prisma.shopCategory.deleteMany({ where: { tenantId } });
}

async function main() {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEMO_SEED !== "true"
  ) {
    throw new Error(
      "Refusing to run demo seed in production. Set ALLOW_DEMO_SEED=true to override."
    );
  }

  const passwordHash = await argon2.hash(DEMO_PASSWORD, {
    type: argon2.argon2id,
  });

  const categorySlugs = [
    "electronics-gadgets",
    "fashion",
    "home-kitchen",
    "beauty-health-personal-care",
    "sports-outdoors",
  ] as const;

  const categories = await prisma.category.findMany({
    where: { slug: { in: [...categorySlugs] } },
  });
  const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));
  for (const slug of categorySlugs) {
    if (!categoryBySlug.has(slug)) {
      throw new Error(
        `Missing platform category "${slug}". Run db:seed first.`
      );
    }
  }

    let plan = await prisma.plan.findUnique({ where: { slug: "yomi" } });
  if (!plan) {
    plan = await prisma.plan.findUnique({ where: { slug: "lemi" } });
  }
  if (!plan) {
    plan = await prisma.plan.findUnique({ where: { slug: "free" } });
  }
  if (!plan) {
    throw new Error(
      'Missing plan "yomi" (or lemi/free). Run db:seed first.'
    );
  }

  console.log(`Using plan: ${plan.slug} (${plan.id})`);

  const buyers = [];
  for (const b of BUYERS) {
    const user = await prisma.user.upsert({
      where: { email: b.email },
      create: {
        email: b.email,
        passwordHash,
        role: "buyer",
        name: b.name,
      },
      update: {
        passwordHash,
        role: "buyer",
        name: b.name,
      },
    });
    buyers.push(user);
  }
  console.log(`Upserted ${buyers.length} demo buyers`);

  type SeededShop = {
    tenantId: string;
    slug: string;
    name: string;
    sellerEmail: string;
    productIds: string[];
    products: { id: string; price: number }[];
  };
  const seededShops: SeededShop[] = [];

  for (const shop of SHOPS) {
    const email = sellerEmail(shop.slug);
    const seller = await prisma.user.upsert({
      where: { email },
      create: {
        email,
        passwordHash,
        role: "seller",
        name: `${shop.name} Owner`,
        phone: `+23480${String(Math.abs(hashCode(shop.slug)) % 100000000).padStart(8, "0")}`,
      },
      update: {
        passwordHash,
        role: "seller",
        name: `${shop.name} Owner`,
      },
    });

    const bg = shop.color.replace("#", "");
    const themeSettings: Prisma.InputJsonValue = {
      primaryColor: shop.color,
      // Branded shape mark (not initials) — consistent look across demo shops
      logoUrl: `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(shop.slug)}&backgroundColor=${bg}`,
      logoRectUrl: null,
      promoProductsEnabled: shop.slug !== "pages-pour",
      newArrivalsEnabled: shop.slug !== "lens-lab",
    };

    const existing = await prisma.tenant.findUnique({
      where: { slug: shop.slug },
    });

    let tenantId: string;
    if (existing) {
      await clearTenantCatalog(existing.id);
      const updated = await prisma.tenant.update({
        where: { id: existing.id },
        data: {
          name: shop.name,
          ownerUserId: seller.id,
          status: "active",
          verifiedBadge: shop.verified,
          themeSettings,
          location: shop.location,
          countryCode: "NG",
          email,
          phone: seller.phone,
          address: `${shop.location.split(",")[0]?.trim() ?? "Lagos"}, Nigeria`,
          planId: plan.id,
          trialEndsAt: daysAgo(-30),
        },
      });
      tenantId = updated.id;
    } else {
      const created = await prisma.tenant.create({
        data: {
          name: shop.name,
          slug: shop.slug,
          ownerUserId: seller.id,
          status: "active",
          verifiedBadge: shop.verified,
          themeSettings,
          location: shop.location,
          countryCode: "NG",
          email,
          phone: seller.phone,
          address: `${shop.location.split(",")[0]?.trim() ?? "Lagos"}, Nigeria`,
          planId: plan.id,
          trialEndsAt: daysAgo(-30),
        },
      });
      tenantId = created.id;
    }

    await prisma.tenantAdmin.upsert({
      where: {
        tenantId_userId: { tenantId, userId: seller.id },
      },
      create: {
        tenantId,
        userId: seller.id,
        role: "owner",
      },
      update: {
        role: "owner",
      },
    });

    const shopCatMap = new Map<string, string>();
    for (const sc of shop.shopCategories) {
      const row = await prisma.shopCategory.create({
        data: {
          tenantId,
          name: sc.name,
          slug: sc.slug,
        },
      });
      shopCatMap.set(sc.slug, row.id);
    }

    await prisma.shopBanner.create({
      data: {
        tenantId,
        imageUrl: shop.banner.imageUrl,
        title: shop.banner.title,
        subtitle: shop.banner.subtitle,
        ctaText: "Shop now",
        ctaUrl: "/",
        scrollSpeed: 5,
        displayOrder: 0,
        active: true,
      },
    });

    const platformCategoryId = categoryBySlug.get(
      NICHE_TO_CATEGORY[shop.niche]
    )!.id;

    const products: { id: string; price: number }[] = [];
    for (let pi = 0; pi < shop.products.length; pi++) {
      const p = shop.products[pi]!;
      const shopCategoryId = shopCatMap.get(p.shopCategorySlug);
      if (!shopCategoryId) {
        throw new Error(
          `Shop category ${p.shopCategorySlug} missing for ${shop.slug}`
        );
      }
      const createdAt = p.recent
        ? daysAgo(pi % 7)
        : daysAgo(14 + ((pi * 5) % 60));

      const product = await prisma.product.create({
        data: {
          tenantId,
          title: p.title,
          description: p.description,
          price: p.price,
          compareAtPrice: p.compareAtPrice ?? null,
          currency: "NGN",
          stockQty: p.stockQty,
          categoryId: platformCategoryId,
          shopCategoryId,
          brandName: p.brandName,
          images: [p.image] as Prisma.InputJsonValue,
          status: "active",
          location: shop.location,
          countryCode: "NG",
          createdAt,
        },
      });
      products.push({ id: product.id, price: p.price });
    }

    seededShops.push({
      tenantId,
      slug: shop.slug,
      name: shop.name,
      sellerEmail: email,
      productIds: products.map((x) => x.id),
      products,
    });
    console.log(
      `Shop ${shop.slug}: ${products.length} products, verified=${shop.verified}`
    );
  }

  // Sparse reviews: ~30% of products get 1–2 reviews from distinct buyers
  let reviewCount = 0;
  const allProducts = seededShops.flatMap((s) =>
    s.products.map((p) => ({ ...p, tenantId: s.tenantId }))
  );
  for (let i = 0; i < allProducts.length; i++) {
    if (i % 10 >= 3) continue; // ~30%
    const product = allProducts[i]!;
    const numReviews = i % 2 === 0 ? 1 : 2;
    const usedBuyers = new Set<string>();
    for (let r = 0; r < numReviews; r++) {
      const buyer = buyers[(i + r * 2) % buyers.length]!;
      if (usedBuyers.has(buyer.id)) continue;
      usedBuyers.add(buyer.id);
      await prisma.review.create({
        data: {
          productId: product.id,
          buyerId: buyer.id,
          rating: 3 + ((i + r) % 3),
          comment: REVIEW_COMMENTS[(i + r) % REVIEW_COMMENTS.length]!,
          createdAt: daysAgo(2 + ((i + r) % 20)),
        },
      });
      reviewCount += 1;
    }
  }
  console.log(`Created ${reviewCount} reviews`);

  // Orders across shops: 15–25 with status mix
  const orderStatuses: OrderStatus[] = [
    "paid",
    "fulfilled",
    "pending_payment",
    "paid",
    "fulfilled",
    "fulfilled",
    "pending_payment",
    "paid",
  ];
  const orderCount = 20;
  let ordersCreated = 0;

  for (let i = 0; i < orderCount; i++) {
    const shop = seededShops[i % seededShops.length]!;
    const buyer = buyers[i % buyers.length]!;
    const status = orderStatuses[i % orderStatuses.length]!;
    const p1 = shop.products[i % shop.products.length]!;
    const p2 = shop.products[(i + 3) % shop.products.length]!;
    const useTwo = i % 3 !== 0 && p1.id !== p2.id;

    const items = useTwo
      ? [
          { productId: p1.id, qty: 1 + (i % 2), unitPrice: p1.price },
          { productId: p2.id, qty: 1, unitPrice: p2.price },
        ]
      : [{ productId: p1.id, qty: 1 + (i % 3), unitPrice: p1.price }];

    const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.qty, 0);
    const paystackReference =
      status === "pending_payment" ? null : `demo_ref_${i + 1}`;

    await prisma.order.create({
      data: {
        tenantId: shop.tenantId,
        buyerId: buyer.id,
        status,
        subtotal,
        total: subtotal,
        currency: "NGN",
        paystackReference,
        createdAt: daysAgo(1 + (i % 45)),
        items: {
          create: items.map((it) => ({
            productId: it.productId,
            qty: it.qty,
            unitPrice: it.unitPrice,
          })),
        },
      },
    });
    ordersCreated += 1;
  }
  console.log(`Created ${ordersCreated} orders`);

  await prisma.platformSetting.upsert({
    where: { key: "demo_seed_version" },
    create: { key: "demo_seed_version", value: DEMO_SEED_VERSION },
    update: { value: DEMO_SEED_VERSION },
  });

  console.log("\n========== DEMO CREDENTIALS ==========");
  console.log(`Password (all users): ${DEMO_PASSWORD}`);
  console.log("\nBuyers:");
  for (const b of BUYERS) {
    console.log(`  ${b.name} <${b.email}>`);
  }
  console.log("\nSellers (shop owners):");
  for (const s of seededShops) {
    console.log(`  ${s.name} (${s.slug}) <${s.sellerEmail}>`);
  }
  console.log(`\ndemo_seed_version=${DEMO_SEED_VERSION}`);
  console.log(
    `Shops: ${seededShops.length}, Products: ${allProducts.length}, Orders: ${ordersCreated}, Reviews: ${reviewCount}`
  );
  console.log("======================================\n");
}

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
