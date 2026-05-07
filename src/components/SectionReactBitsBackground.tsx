"use client";

import { useEffect, useState, type ComponentType } from "react";
import dynamic from "next/dynamic";

import type { Section } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { imageTintBgClass } from "@/components/atoms/imageStyles";
import { MobileFallback } from "@/components/bits/MobileFallback";
import type { BitsBackgroundProps } from "@/components/bits/_types";

/**
 * One lazy chunk per kind. The wrapper file path determines the chunk;
 * Next/Turbopack splits these into separate JS files. A page that doesn't
 * render any reactbits bg fetches none of them; a page with one renders
 * exactly one.
 *
 * `ssr: false` keeps WebGL out of the server render so first paint isn't
 * blocked by code that needs `window`.
 */
const REGISTRY: Record<
  RBKind,
  ComponentType<BitsBackgroundProps>
> = {
  "prismatic-burst": dynamic(
    () => import("@/components/bits/PrismaticBurst"),
    { ssr: false, loading: () => null }
  ),
  "grid-scan": dynamic(() => import("@/components/bits/GridScan"), {
    ssr: false,
    loading: () => null,
  }),
  grainient: dynamic(() => import("@/components/bits/Grainient"), {
    ssr: false,
    loading: () => null,
  }),
  "light-pillar": dynamic(() => import("@/components/bits/LightPillar"), {
    ssr: false,
    loading: () => null,
  }),
  "liquid-ether": dynamic(() => import("@/components/bits/LiquidEther"), {
    ssr: false,
    loading: () => null,
  }),
};

type RBKind =
  | "prismatic-burst"
  | "grid-scan"
  | "grainient"
  | "light-pillar"
  | "liquid-ether";

export function SectionReactBitsBackground({
  bg,
}: {
  bg: Section["background"];
}) {
  const [mounted, setMounted] = useState(false);
  const [vw, setVw] = useState<number>(0);

  useEffect(() => {
    setMounted(true);
    const update = () => setVw(window.innerWidth);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  if (bg.type !== "reactbits") return null;

  // Until we know the viewport size we render nothing — that way mobile
  // visitors don't end up downloading the WebGL chunk only to be replaced
  // by the CSS fallback a tick later.
  if (!mounted) return null;

  const isMobile =
    bg.mobileFallbackBreakpoint > 0 && vw > 0 && vw < bg.mobileFallbackBreakpoint;
  const tintClass = imageTintBgClass[bg.tint];
  const showTint = tintClass !== null && bg.tintOpacity > 0;

  let layer: React.ReactNode;
  if (isMobile && bg.mobileFallbackKind !== "none") {
    layer = (
      <MobileFallback
        kind={bg.mobileFallbackKind}
        colorA={bg.colorA}
        colorB={bg.colorB}
      />
    );
  } else {
    const Component = REGISTRY[bg.kind];
    layer = (
      <div className="absolute inset-0 pointer-events-none">
        <Component
          intensity={bg.intensity}
          speed={bg.speed}
          colorA={bg.colorA}
          colorB={bg.colorB}
        />
      </div>
    );
  }

  return (
    <>
      {layer}
      {bg.overlay > 0 && (
        <div
          aria-hidden
          className="absolute inset-0 bg-background pointer-events-none"
          style={{ opacity: bg.overlay / 100 }}
        />
      )}
      {showTint && (
        <div
          aria-hidden
          className={cn("absolute inset-0 pointer-events-none", tintClass)}
          style={{ opacity: bg.tintOpacity / 100 }}
        />
      )}
    </>
  );
}
