import type { Metadata } from "next";
import localFont from "next/font/local";
import {
  Bricolage_Grotesque,
  Crimson_Pro,
  DM_Sans,
  IBM_Plex_Mono,
  JetBrains_Mono,
  Newsreader,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { loadTheme } from "@/lib/content";
import {
  paletteToCssVars,
  paletteToFontVars,
  paletteToSizeVars,
} from "@/lib/theme";

// ============================================================
// Font registry — every font listed in src/lib/fonts.ts must be
// loaded here under its `cssVar` name. The active palette picks
// which of these fills each role variable below.
// ============================================================

// Karepefx — display face for headlines, hero, drop caps.
// Local woff2 (subset from the source OTFs), six weights. Preloaded: it is
// the active palette's display face and paints the hero.
const karepefx = localFont({
  variable: "--font-karepefx",
  display: "swap",
  src: [
    { path: "../fonts/karepefx/Karepefx-Light.woff2", weight: "300", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Regular.woff2", weight: "400", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Medium.woff2", weight: "500", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Bold.woff2", weight: "700", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Extrabold.woff2", weight: "800", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Black.woff2", weight: "900", style: "normal" },
  ],
});

// The pixel faces (Galmuri9, PF Stardust, PF Stardust S) are NOT registered
// through next/font: they live as hand-written @font-face rules in
// globals.css, split into latin/hangul woff2 slices with unicode-range so a
// visitor downloads ~8KB of latin glyphs instead of the 4.6MB source TTF —
// the hangul slice only loads if Korean text actually renders. next/font
// can't express unicode-range slices, which is why these are manual.

// Only the active palette's faces preload (Crimson Pro is the current body
// face). Everything else stays registered for the palette switcher but
// loads on demand via its CSS variable — preloading all 11 families cost
// ~600KB of contended bandwidth on every page view.
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
});

const crimsonPro = Crimson_Pro({
  variable: "--font-crimson-pro",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  preload: false,
});

export const metadata: Metadata = {
  title: "Youngje Park",
  description: "Portfolio of Youngje Park — designer, engineer, game maker.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Active palette is injected as inline CSS variables on <html> so it
  // overrides the defaults defined in globals.css :root. Kept server-side
  // so the public site renders with the chosen palette before any JS runs.
  // Both colors and font role bindings come from the palette; the per-font
  // variables (--font-karepefx, --font-playfair-display, …) are bound by
  // next/font's `.variable` className and stay constant across palettes.
  const theme = await loadTheme();
  const active =
    theme.palettes.find((p) => p.id === theme.activePaletteId) ??
    theme.palettes[0];
  const paletteVars = {
    ...paletteToCssVars(active.colors),
    ...paletteToFontVars(active.fonts),
    ...paletteToSizeVars(active.sizes),
  };

  return (
    <html
      lang="en"
      className={cn(
        "antialiased",
        karepefx.variable,
        playfairDisplay.variable,
        newsreader.variable,
        crimsonPro.variable,
        bricolage.variable,
        dmSans.variable,
        plexMono.variable,
        jetbrainsMono.variable,
      )}
      style={paletteVars}
    >
      <body className="relative min-h-screen bg-background text-foreground font-body">
        {children}
        <div aria-hidden className="grain" />
        <div aria-hidden className="vignette" />
      </body>
    </html>
  );
}
