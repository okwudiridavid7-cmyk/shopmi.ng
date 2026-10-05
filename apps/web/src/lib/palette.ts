/* Platform colour palettes. Pure functions so the root layout (server) and the admin editor (client) share them. */

export type PaletteColors = {
  /** Dark brand surface: dashboard sidebar, highlight cards, chart bars. */
  primary: string;
  /** Soft background tint: dashboard canvas, muted sections. */
  secondary: string;
  /** Main text on light backgrounds. */
  text: string;
  /** Highlight: buttons, active states, links, focus rings. */
  accent: string;
};

export type PalettePresetId = "tangerine" | "forest" | "ocean" | "crimson" | "burgundy" | "sunflower";

export type Palette = PaletteColors & { preset: PalettePresetId | "custom" };

export type PalettePreset = {
  id: PalettePresetId;
  name: string;
  description: string;
  colors: PaletteColors;
};

export const PALETTE_PRESETS: PalettePreset[] = [
  {
    id: "tangerine",
    name: "Tangerine",
    description: "The Shopmi.ng default. Warm ink with brand orange.",
    colors: { primary: "#1c1714", secondary: "#f4f3f1", text: "#111113", accent: "#ff822e" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Deep green with a fresh lime highlight.",
    colors: { primary: "#0f2e22", secondary: "#f2f3f0", text: "#111a15", accent: "#b5e61d" },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Navy and bright blue. Calm and trustworthy.",
    colors: { primary: "#0b1f3a", secondary: "#f2f5f9", text: "#0f172a", accent: "#2563eb" },
  },
  {
    id: "crimson",
    name: "Crimson",
    description: "Bold red for sales, deals and energy.",
    colors: { primary: "#2a0d10", secondary: "#f8f3f3", text: "#1a1012", accent: "#e11d48" },
  },
  {
    id: "burgundy",
    name: "Burgundy and gold",
    description: "Rich wine with a gold accent. Premium feel.",
    colors: { primary: "#4a0e1f", secondary: "#f7f2ef", text: "#1f0d12", accent: "#d4a24c" },
  },
  {
    id: "sunflower",
    name: "Sunflower",
    description: "Near-black with a sunny yellow highlight.",
    colors: { primary: "#1f1a0a", secondary: "#faf7ef", text: "#17140a", accent: "#f5b301" },
  },
];

export const DEFAULT_PALETTE: Palette = { preset: "tangerine", ...PALETTE_PRESETS[0]!.colors };

export const PALETTE_SETTING_KEY = "platform_palette";

const HEX = /^#[0-9a-f]{6}$/i;
const FIELDS = ["primary", "secondary", "text", "accent"] as const;

export function isHex(v: unknown): v is string {
  return typeof v === "string" && HEX.test(v);
}

/** Validates a stored palette (object or JSON string). Returns null when unusable. */
export function parsePalette(raw: unknown): Palette | null {
  let obj = raw;
  if (typeof raw === "string") {
    try {
      obj = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!obj || typeof obj !== "object") return null;
  const o = obj as Record<string, unknown>;
  if (!FIELDS.every((f) => isHex(o[f]))) return null;
  const colors = Object.fromEntries(FIELDS.map((f) => [f, (o[f] as string).toLowerCase()])) as PaletteColors;
  return { preset: matchPreset(colors), ...colors };
}

export function matchPreset(colors: PaletteColors): PalettePresetId | "custom" {
  const hit = PALETTE_PRESETS.find((p) => FIELDS.every((f) => p.colors[f].toLowerCase() === colors[f].toLowerCase()));
  return hit?.id ?? "custom";
}

/* ---------- colour maths ---------- */

type Rgb = [number, number, number];

function toRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function toHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((c) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, "0")).join("")}`;
}

/** Mix `a` toward `b` by `t` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t]);
}

function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Step `hex` toward `toward` until it reaches `target` contrast against `against`. */
function shiftUntil(hex: string, toward: string, against: string, target: number): string {
  for (let t = 0; t <= 1; t += 0.04) {
    const c = mix(hex, toward, t);
    if (contrast(c, against) >= target) return c;
  }
  return toward;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = toRgb(hex);
  return `rgb(${r} ${g} ${b} / ${alpha})`;
}

const WHITE = "#ffffff";
const NEAR_BLACK = "#0a0a0b";

export type DerivedPalette = PaletteColors & {
  /** Readable text on an accent fill. */
  accentForeground: string;
  /** Copy on large accent fills: white or the brand near-black. */
  accentInk: string;
  /** Accent darkened until it reads as text on white (and carries white text as a fill). */
  accentStrong: string;
  accentDeep: string;
  /** Accent lightened for dark backgrounds. */
  accentOnDark: string;
  accentTint: string;
  primaryDark: string;
  chartBarDark: string;
};

export function derivePalette(p: PaletteColors): DerivedPalette {
  const lightOnAccent = contrast(p.accent, WHITE) >= 3;
  return {
    ...p,
    accentForeground: lightOnAccent ? WHITE : NEAR_BLACK,
    accentInk: lightOnAccent ? WHITE : "#141414",
    accentStrong: shiftUntil(p.accent, contrast(p.primary, WHITE) >= 4.6 ? p.primary : "#000000", WHITE, 4.6),
    accentDeep: mix(p.accent, "#000000", 0.1),
    accentOnDark: shiftUntil(p.accent, WHITE, NEAR_BLACK, 6),
    accentTint: mix(p.accent, WHITE, 0.88),
    primaryDark: mix(p.primary, NEAR_BLACK, 0.15),
    chartBarDark: mix(p.primary, "#f5f5f7", 0.85),
  };
}

export type PaletteIssue = { field: keyof PaletteColors; message: string; blocking: boolean };

export function paletteIssues(p: PaletteColors): PaletteIssue[] {
  const issues: PaletteIssue[] = [];
  if (contrast(p.primary, WHITE) < 4.5) {
    issues.push({
      field: "primary",
      message: "Primary is too light for the white text on the sidebar and highlight cards. Pick a darker shade.",
      blocking: true,
    });
  }
  if (contrast(p.text, WHITE) < 7 || contrast(p.text, p.secondary) < 4.5) {
    issues.push({
      field: "text",
      message: "Text is hard to read on white or on the secondary colour. Pick a darker shade.",
      blocking: true,
    });
  }
  if (luminance(p.secondary) < 0.75) {
    issues.push({
      field: "secondary",
      message: "Secondary works best as a very light tint. Darker shades make pages feel heavy.",
      blocking: false,
    });
  }
  if (contrast(p.accent, WHITE) < 1.4) {
    issues.push({
      field: "accent",
      message: "Accent is very pale and may disappear on white backgrounds.",
      blocking: false,
    });
  }
  return issues;
}

const SHELLS = ["seller", "buyer", "admin"] as const;

function block(selector: string, vars: Record<string, string>): string {
  return `${selector}{${Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(";")}}`;
}

/** CSS variable overrides for the whole site. Empty for the default palette, so globals.css stays in charge. */
export function paletteCss(palette: Palette | null): string {
  if (!palette || matchPreset(palette) === "tangerine") return "";
  const d = derivePalette(palette);
  const lightShell = SHELLS.map((s) => `[data-shell="${s}"]`).join(",");
  const darkShell = SHELLS.flatMap((s) => [`.dark[data-shell="${s}"]`, `.dark [data-shell="${s}"]`]).join(",");

  return [
    block(":root:not(.dark)", {
      "--color-foreground": d.text,
      "--color-card-foreground": d.text,
      "--color-muted": d.secondary,
      "--color-accent": d.accent,
      "--color-accent-strong": d.accentStrong,
      "--color-accent-foreground": d.accentForeground,
      "--color-accent-ink": d.accentInk,
      "--color-accent-soft": rgba(d.accent, 0.1),
      "--color-accent-deep": d.accentDeep,
      "--color-accent-on-dark": d.accentOnDark,
      "--color-ring": d.accent,
      "--auth-overlay-glow": rgba(d.accent, 0.2),
      "--auth-overlay-accent": d.accentStrong,
    }),
    block(".dark", {
      "--color-accent": d.accent,
      "--color-accent-strong": d.accentStrong,
      "--color-accent-foreground": d.accentForeground,
      "--color-accent-ink": d.accentInk,
      "--color-accent-soft": rgba(d.accent, 0.15),
      "--color-accent-deep": d.accentOnDark,
      "--color-accent-on-dark": d.accentOnDark,
      "--color-ring": d.accentOnDark,
      "--auth-overlay-glow": rgba(d.accent, 0.22),
      "--auth-overlay-accent": d.accentOnDark,
    }),
    block(lightShell, {
      "--shell-accent": d.accentStrong,
      "--shell-accent-foreground": WHITE,
      "--color-accent": d.accent,
      "--color-accent-strong": d.accentStrong,
      "--color-accent-foreground": d.accentForeground,
      "--color-accent-soft": rgba(d.accent, 0.12),
      "--color-ring": d.accent,
      "--color-ink": d.primary,
      "--dash-canvas": d.secondary,
      "--dash-tint": d.accentTint,
      "--chart-bar": d.primary,
    }),
    block(darkShell, {
      "--shell-accent": d.accentOnDark,
      "--shell-accent-foreground": NEAR_BLACK,
      "--color-accent": d.accent,
      "--color-accent-foreground": d.accentForeground,
      "--color-accent-soft": rgba(d.accent, 0.15),
      "--color-accent-on-dark": d.accentOnDark,
      "--color-ring": d.accentOnDark,
      "--color-ink": d.primaryDark,
      "--dash-canvas": NEAR_BLACK,
      "--dash-tint": rgba(d.accent, 0.08),
      "--chart-bar": d.chartBarDark,
    }),
  ].join("\n");
}
