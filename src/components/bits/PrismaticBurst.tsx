"use client";

import type { BitsBackgroundProps } from "./_types";
// Upstream lives at src/components/PrismaticBurst.jsx (shadcn install
// dropped it there). Adapter maps our shared editor knobs onto its
// actual prop names: `intensity` is doubled (upstream default is 2 so
// our 1 ≈ default-bright), `speed` is halved (upstream default is 0.5),
// and `colorA/colorB` are the two stops in the gradient ramp.
import PrismaticBurstUpstream from "@/components/PrismaticBurst";

export default function PrismaticBurst({
  intensity,
  speed,
  colorA,
  colorB,
}: BitsBackgroundProps) {
  return (
    <div className="absolute inset-0">
      <PrismaticBurstUpstream
        intensity={intensity * 2}
        speed={speed * 0.5}
        colors={[colorA, colorB]}
        rayCount={8}
      />
    </div>
  );
}
