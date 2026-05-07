"use client";

import type { BitsBackgroundProps } from "./_types";
// Named export upstream (the only one of the five that isn't default).
import { GridScan as GridScanUpstream } from "@/components/GridScan";

export default function GridScan({
  intensity,
  speed,
  colorA,
  colorB,
}: BitsBackgroundProps) {
  return (
    <div className="absolute inset-0">
      <GridScanUpstream
        scanColor={colorA}
        linesColor={colorB}
        scanGlow={0.5 * intensity}
        scanOpacity={Math.min(1, 0.4 * intensity)}
        // Upstream uses scanDuration (seconds) — invert speed so a higher
        // editor "speed" means a faster scan.
        scanDuration={Math.max(0.5, 2 / Math.max(speed, 0.1))}
        bloomIntensity={0.4 * intensity}
        chromaticAberration={0.002 * intensity}
        className=""
        style={{}}
      />
    </div>
  );
}
