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
  // Media-query state instead of a raw resize listener: the component only
  // re-renders when the breakpoint or reduced-motion preference actually
  // flips, not once per pixel of a window drag (which used to re-render —
  // and for LiquidEther, fully rebuild — the WebGL sim per resize tick).
  // `ready: false` until the queries are read so mobile visitors never
  // download a WebGL chunk that a fallback replaces a tick later.
  const [mq, setMq] = useState({ ready: false, mobile: false, reduced: false });

  const breakpoint = bg.type === "reactbits" ? bg.mobileFallbackBreakpoint : 0;

  useEffect(() => {
    const bpQuery =
      breakpoint > 0
        ? window.matchMedia(`(max-width: ${breakpoint - 1}px)`)
        : null;
    const rmQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () =>
      setMq({
        ready: true,
        mobile: bpQuery?.matches ?? false,
        reduced: rmQuery.matches,
      });
    update();
    bpQuery?.addEventListener("change", update);
    rmQuery.addEventListener("change", update);
    return () => {
      bpQuery?.removeEventListener("change", update);
      rmQuery.removeEventListener("change", update);
    };
  }, [breakpoint]);

  if (bg.type !== "reactbits") return null;
  if (!mq.ready) return null;

  const isMobile = breakpoint > 0 && mq.mobile;
  const tintClass = imageTintBgClass[bg.tint];
  const showTint = tintClass !== null && bg.tintOpacity > 0;

  // prefers-reduced-motion collapses the WebGL layer to the static CSS
  // fallback (its keyframes are already gated in globals.css), or to
  // nothing when no fallback kind is configured. Non-negotiable per the
  // design contract — and it also skips the WebGL chunk download entirely.
  const useFallback = isMobile || mq.reduced;

  let layer: React.ReactNode;
  if (useFallback && bg.mobileFallbackKind !== "none") {
    layer = (
      <MobileFallback
        kind={bg.mobileFallbackKind}
        colorA={bg.colorA}
        colorB={bg.colorB}
      />
    );
  } else if (mq.reduced) {
    layer = null;
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
