/**
 * GPU capability detection for the WebGL backgrounds.
 *
 * Why this exists: the reactbits backgrounds are full-screen fragment shaders
 * (raymarchers / heavy noise). On macOS WebGL runs on Metal, which absorbs that
 * cost; on Windows it runs through ANGLE → Direct3D11, which is dramatically
 * slower for the same shader. The components used to gate quality on
 * `navigator.hardwareConcurrency` (CPU core count) — a terrible proxy for GPU
 * power, since a typical Windows laptop has 8+ cores but a weak Intel iGPU and
 * sailed straight into the heaviest path.
 *
 * Instead we read the real GPU renderer string via WEBGL_debug_renderer_info
 * and bucket it into a tier. Components clamp their requested quality and pixel
 * ratio to the tier, so a discrete-GPU / Apple-Silicon machine keeps full
 * fidelity while an Intel-iGPU Windows box drops to something it can run.
 */

export type GpuTier = "high" | "medium" | "low";

let cachedTier: GpuTier | null = null;

/**
 * Best-effort GPU tier. Result is cached for the page lifetime (it cannot
 * change). Returns "medium" during SSR / when detection is inconclusive.
 */
export function detectGpuTier(): GpuTier {
  if (cachedTier) return cachedTier;
  if (typeof window === "undefined") return "medium";

  let tier: GpuTier = "medium";
  try {
    const canvas = document.createElement("canvas");
    const gl = (canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;

    if (!gl) {
      cachedTier = "low";
      return "low";
    }

    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = ext
      ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) || "")
      : "";
    const r = renderer.toLowerCase();

    if (/swiftshader|software|llvmpipe|basic render|warp/.test(r)) {
      // Pure-software rasterisers — the worst case.
      tier = "low";
    } else if (/metal|apple m\d/.test(r)) {
      // Any Mac: ANGLE reports a Metal backend ("ANGLE (Apple, ... Metal ...)").
      // Metal handles the heavy shaders fine, so never downgrade a Mac.
      tier = "high";
    } else if (/nvidia|geforce|rtx|gtx|quadro|radeon|\barc\b/.test(r)) {
      // Discrete GPUs (incl. on Windows) — full fidelity.
      tier = "high";
    } else if (/intel|hd graphics|uhd graphics|iris/.test(r)) {
      // Integrated GPUs running through ANGLE/D3D — the slow Windows case.
      tier = "low";
    } else {
      tier = "medium";
    }

    // Release the probe context promptly so it doesn't count against the
    // browser's small WebGL-context budget.
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  } catch {
    tier = "medium";
  }

  cachedTier = tier;
  return tier;
}

/**
 * Device pixel ratio capped for the detected tier. High-end GPUs render at up
 * to 2×; weaker ones render fewer pixels (near-linear cost saving, the single
 * biggest lever on these shaders) at a barely perceptible sharpness cost.
 */
export function dprForTier(tier: GpuTier = detectGpuTier(), hardCap = 2): number {
  const cap = tier === "high" ? 2 : tier === "medium" ? 1.5 : 1;
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Math.min(dpr, cap, hardCap);
}
