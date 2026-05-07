"use client";

import type { BitsBackgroundProps } from "./_types";
import LiquidEtherUpstream from "@/components/LiquidEther";

export default function LiquidEther({
  intensity,
  speed,
  colorA,
  colorB,
}: BitsBackgroundProps) {
  return (
    <div className="absolute inset-0">
      <LiquidEtherUpstream
        colors={[colorA, colorB]}
        autoSpeed={0.5 * speed}
        autoIntensity={2.2 * intensity}
      />
    </div>
  );
}
