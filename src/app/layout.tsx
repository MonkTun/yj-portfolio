import type { Metadata } from "next";
import localFont from "next/font/local";
import { Newsreader, IBM_Plex_Mono, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


// Karepefx — display face for headlines, hero, drop caps, kickers when bold.
// Local OTFs in src/fonts/karepefx, six weights.
const karepefx = localFont({
  variable: "--font-display",
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

const newsreader = Newsreader({
  variable: "--font-body",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Youngje Park",
  description: "Portfolio of Youngje Park — designer, engineer, game maker.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn("antialiased", karepefx.variable, newsreader.variable, plexMono.variable, "font-sans", geist.variable)}
    >
      <body className="relative min-h-screen bg-background text-foreground font-body">
        {children}
        <div aria-hidden className="grain" />
        <div aria-hidden className="vignette" />
      </body>
    </html>
  );
}
