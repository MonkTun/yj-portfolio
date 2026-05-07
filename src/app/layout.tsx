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
import { paletteToCssVars, paletteToFontVars } from "@/lib/theme";

// ============================================================
// Font registry — every font listed in src/lib/fonts.ts must be
// loaded here under its `cssVar` name. The active palette picks
// which of these fills each role variable below.
// ============================================================

// Karepefx — display face for headlines, hero, drop caps.
// Local OTFs in src/fonts/karepefx, six weights.
const karepefx = localFont({
  variable: "--font-karepefx",
  display: "swap",
  src: [
    { path: "../fonts/karepefx/Karepefx-Light.otf", weight: "300", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Regular.otf", weight: "400", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Medium.otf", weight: "500", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Bold.otf", weight: "700", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Extrabold.otf", weight: "800", style: "normal" },
    { path: "../fonts/karepefx/Karepefx-Black.otf", weight: "900", style: "normal" },
  ],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
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
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
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
