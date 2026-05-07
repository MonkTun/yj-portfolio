/**
 * Shared CSS filter strings for the Image atom's filter presets. The same
 * map is used by both the renderer (to apply the filter on the image) and
 * the editor's library/preset thumbnails (so previews match output).
 */

import type { ImageProps } from "@/lib/schema";

export const imageFilterCss: Record<ImageProps["filter"], string> = {
  none: "none",
  bw: "grayscale(1)",
  sepia: "sepia(0.6)",
  noir: "grayscale(1) contrast(1.3) brightness(0.95)",
  faded: "contrast(0.85) brightness(1.05) saturate(0.9)",
  warm: "sepia(0.3) saturate(1.15)",
  cool: "saturate(1.1) hue-rotate(-12deg) brightness(0.98)",
};

export const imageFilterLabel: Record<ImageProps["filter"], string> = {
  none: "Original",
  bw: "B & W",
  sepia: "Sepia",
  noir: "Noir",
  faded: "Faded",
  warm: "Warm",
  cool: "Cool",
};

/** Compose rotate + flips into a single CSS transform string, or undefined. */
export function imageTransformCss({
  rotate,
  flipX,
  flipY,
}: {
  rotate: number;
  flipX: boolean;
  flipY: boolean;
}): string | undefined {
  const parts = [
    rotate ? `rotate(${rotate}deg)` : null,
    flipX ? "scaleX(-1)" : null,
    flipY ? "scaleY(-1)" : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/** Compose color filter + blur into one CSS `filter` string. */
export function imageFilterAndBlurCss(
  filter: ImageProps["filter"],
  blur: number
): string | undefined {
  const parts: string[] = [];
  if (filter !== "none") parts.push(imageFilterCss[filter]);
  if (blur > 0) parts.push(`blur(${blur}px)`);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

/** Background-color class for each tint token; null = render no overlay. */
export const imageTintBgClass: Record<ImageProps["tint"], string | null> = {
  none: null,
  background: "bg-background",
  foreground: "bg-foreground",
  accent: "bg-accent",
};

export const imageTintLabel: Record<ImageProps["tint"], string> = {
  none: "None",
  background: "Dark",
  foreground: "Cream",
  accent: "Accent",
};

/**
 * Style for a tint overlay div that *follows the image's alpha*. Uses the
 * image as a CSS mask so transparent pixels (e.g. after bg removal) stay
 * transparent — only the visible image gets coloured.
 *
 * Mirrors the img element's fit / object-position / transform so the mask
 * covers exactly the same region as the image itself.
 */
export function imageTintMaskStyle({
  src,
  fit,
  focalX,
  focalY,
  rotate,
  flipX,
  flipY,
}: {
  src: string;
  fit: ImageProps["fit"];
  focalX: number;
  focalY: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
}): React.CSSProperties {
  // Single-quote the URL so most safe filename characters survive; we
  // generate slugified filenames in /api/admin/upload, so quotes are not
  // expected.
  const url = `url('${src}')`;
  const size = fit === "cover" ? "cover" : "contain";
  const position = `${focalX}% ${focalY}%`;
  // mask-mode defaults to `match-source`, which uses the alpha channel for
  // raster image masks — exactly what we want, so no need to set it.
  return {
    maskImage: url,
    WebkitMaskImage: url,
    maskSize: size,
    WebkitMaskSize: size,
    maskPosition: position,
    WebkitMaskPosition: position,
    maskRepeat: "no-repeat",
    WebkitMaskRepeat: "no-repeat",
    transform: imageTransformCss({ rotate, flipX, flipY }),
  };
}
