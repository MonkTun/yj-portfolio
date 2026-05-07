"use client";

import type { BitsBackgroundProps } from "./_types";
import LightPillarUpstream from "@/components/LightPillar";

export default function LightPillar({
  intensity,
  speed,
  colorA,
  colorB,
}: BitsBackgroundProps) {
  return (
    <div className="absolute inset-0">
      <LightPillarUpstream
        topColor={colorA}
        bottomColor={colorB}
        intensity={intensity}
        rotationSpeed={0.3 * speed}
      />
    </div>
  );
}
