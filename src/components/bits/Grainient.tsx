"use client";

import type { BitsBackgroundProps } from "./_types";
import GrainientUpstream from "@/components/Grainient";

export default function Grainient({
  intensity,
  speed,
  colorA,
  colorB,
}: BitsBackgroundProps) {
  return (
    <div className="absolute inset-0">
      <GrainientUpstream
        color1={colorA}
        color2={colorB}
        timeSpeed={0.25 * speed}
        contrast={1.5 * intensity}
        grainAmount={Math.min(0.3, 0.1 * intensity)}
      />
    </div>
  );
}
