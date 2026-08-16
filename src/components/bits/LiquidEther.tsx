"use client";

import { useMemo } from "react";

import type { BitsBackgroundProps } from "./_types";
import LiquidEtherUpstream from "@/components/LiquidEther";

export default function LiquidEther({
  intensity,
  speed,
  colorA,
  colorB,
}: BitsBackgroundProps) {
  // Stable identity matters: the upstream sim's creation effect lists
  // `colors` in its deps, so a fresh array per render would tear down and
  // rebuild the whole fluid sim (WebGL context, FBOs, shader compiles) on
  // every parent re-render.
  const colors = useMemo(() => [colorA, colorB], [colorA, colorB]);
  return (
    <div className="absolute inset-0">
      <LiquidEtherUpstream
        colors={colors}
        autoSpeed={0.5 * speed}
        autoIntensity={2.2 * intensity}
      />
    </div>
  );
}
