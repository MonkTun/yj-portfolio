import type { CSSProperties } from "react";
import type { Palette, PaletteColors, PaletteFonts } from "./schema";
import { resolveFont, FONT_ROLES } from "./fonts";

// Default palette — mirrors the values committed to globals.css :root so a
// fresh install (no content/theme.json yet) renders exactly the documented
// "organic but dark editorial" direction. Update both places together.
export const DEFAULT_PALETTE: Palette = {
  id: "editorial-dark",
  name: "Editorial dark",
  colors: {
    background: "#0F0D0B",
    foreground: "#E8DFCF",
    mutedForeground: "#8A8275",
    surface: "#1A1714",
    border: "#2A2520",
    accent: "#5C8A3A",
    accentForeground: "#FFFFFF",
  },
  fonts: {
    display: "karepefx",
    body: "playfair-display",
    sans: "bricolage",
    mono: "ibm-plex-mono",
  },
};

export const PALETTE_FIELDS: Array<{
  key: keyof PaletteColors;
  label: string;
  hint: string;
}> = [
  { key: "background", label: "Background", hint: "Page base — body bg." },
  { key: "foreground", label: "Foreground", hint: "Primary running text." },
  { key: "mutedForeground", label: "Muted text", hint: "Kickers, captions." },
  { key: "surface", label: "Surface", hint: "Cards, panels, inputs." },
  { key: "border", label: "Border", hint: "Hairline dividers." },
  { key: "accent", label: "Accent", hint: "Links, the one loud color." },
  {
    key: "accentForeground",
    label: "On accent",
    hint: "Text sitting on accent.",
  },
];

/** Map a palette's colors onto the CSS custom properties that globals.css
 *  reads. Returned shape is suitable for React `style={...}`. */
export function paletteToCssVars(colors: PaletteColors): CSSProperties {
  return {
    "--background": colors.background,
    "--foreground": colors.foreground,
    "--muted-foreground": colors.mutedForeground,
    "--surface": colors.surface,
    "--border": colors.border,
    "--accent": colors.accent,
    "--accent-foreground": colors.accentForeground,
  } as CSSProperties;
}

/** Map a palette's font choices onto the role variables (--font-display,
 *  --font-body, etc.) by pointing each at the per-font variable that
 *  next/font binds in layout.tsx. Unknown ids fall back to the role's
 *  default font so the page never renders fontless. */
export function paletteToFontVars(fonts: PaletteFonts): CSSProperties {
  const out: Record<string, string> = {};
  for (const role of FONT_ROLES) {
    const opt = resolveFont(fonts[role], role);
    out[`--font-${role}`] = `var(${opt.cssVar}), ${opt.fallback}`;
  }
  return out as CSSProperties;
}
