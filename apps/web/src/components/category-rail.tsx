import {
  Baby,
  BookOpen,
  Briefcase,
  Car,
  CookingPot,
  Dumbbell,
  Flower2,
  Gamepad2,
  Gem,
  HeartPulse,
  LayoutGrid,
  Laptop,
  Music,
  Palette,
  PawPrint,
  Shirt,
  ShoppingBasket,
  Smartphone,
  Sparkles,
  Tag,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import type { CategoryPublic } from "@vendors/shared-types";
import { NAV_ICON_TONES } from "@/components/shell/nav-icons";
import { cn } from "@/lib/utils";

const ICON_RULES: [RegExp, LucideIcon][] = [
  [/phone|electronic|gadget/i, Smartphone],
  [/comput|laptop/i, Laptop],
  [/fashion|cloth|apparel|wear/i, Shirt],
  [/beauty|cosmetic|personal care|skin/i, Sparkles],
  [/health|pharm|wellness/i, HeartPulse],
  [/baby|kid|toy/i, Baby],
  [/grocer|food|drink|beverage/i, ShoppingBasket],
  [/tool|improvement|hardware/i, Wrench],
  [/kitchen|home|furniture|decor/i, CookingPot],
  [/auto|car|vehicle/i, Car],
  [/sport|outdoor|fitness/i, Dumbbell],
  [/office|stationer|business/i, Briefcase],
  [/book/i, BookOpen],
  [/gam(e|ing)/i, Gamepad2],
  [/jewel|watch|accessor/i, Gem],
  [/pet/i, PawPrint],
  [/garden|plant/i, Flower2],
  [/music|instrument/i, Music],
  [/art|craft|handmade/i, Palette],
];

export function categoryIcon(name: string): LucideIcon {
  return ICON_RULES.find(([re]) => re.test(name))?.[1] ?? Tag;
}

/** Horizontally scrolling category shortcuts for the marketplace. */
export function CategoryRail({
  categories,
  active,
  onSelect,
  allLabel = "All",
  className,
}: {
  categories: CategoryPublic[];
  active: string;
  onSelect: (slug: string) => void;
  allLabel?: string;
  className?: string;
}) {
  const items = [
    { slug: "", name: allLabel, icon: LayoutGrid },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, icon: categoryIcon(c.name) })),
  ];
  return (
    <div
      className={cn(
        "-mx-4 overflow-x-auto px-4 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] [scrollbar-width:none] sm:-mx-6 sm:px-6 [&::-webkit-scrollbar]:hidden",
        className
      )}
    >
      <ul className="flex gap-2 py-1 sm:gap-3">
        {items.map(({ slug, name, icon: Icon }, i) => {
          const selected = active === slug;
          return (
            <li key={slug || "all"} className="shrink-0">
              <button
                type="button"
                onClick={() => onSelect(slug)}
                aria-pressed={selected}
                className={cn(
                  "group flex w-[5.75rem] flex-col items-center gap-2 rounded-2xl px-1.5 py-2.5 text-center transition sm:w-[6.5rem]",
                  selected ? "bg-card ring-2 ring-accent" : "hover:bg-card"
                )}
              >
                <span
                  className={cn(
                    "flex h-14 w-14 items-center justify-center rounded-full text-[#1c1c1f] transition group-hover:scale-105",
                    i === 0
                      ? "bg-[#1c1c1f] text-white dark:bg-white dark:text-[#1c1c1f]"
                      : NAV_ICON_TONES[(i - 1) % NAV_ICON_TONES.length]
                  )}
                >
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">{name}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
