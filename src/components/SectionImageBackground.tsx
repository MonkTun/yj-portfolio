"use client";

import NextImage from "next/image";

import type { Section } from "@/lib/schema";
import { cn } from "@/lib/utils";
import {
  imageFilterAndBlurCss,
  imageTintBgClass,
  imageTintMaskStyle,
  imageTransformCss,
  isOptimizableImageSrc,
} from "@/components/atoms/imageStyles";
import {
  MediaSkeleton,
  useMediaLoaded,
} from "@/components/atoms/MediaSkeleton";

/**
 * Renders a section's image background as an absolute-positioned <img> so
 * the same non-destructive effects (focal/filter/rotate/flip) used by the
 * Image atom apply the same way here. Sits behind everything in the
 * section; the overlay is a separate div on top of it.
 */
export function SectionImageBackground({ bg }: { bg: Section["background"] }) {
  const src = bg.type === "image" ? bg.src : "";
  const { loaded, mediaProps } = useMediaLoaded(src);
  if (bg.type !== "image" || !bg.src) return null;
  const tintClass = imageTintBgClass[bg.tint];
  const showTint = tintClass !== null && bg.tintOpacity > 0;
  const baseTransform = imageTransformCss({
    rotate: bg.rotate,
    flipX: bg.flipX,
    flipY: bg.flipY,
    zoom: bg.zoom,
  });
  // Single-axis fits size the img on that axis and let the other follow the
  // image's own aspect ratio. The focal-% offset + translate reproduces
  // object-position's alignment rule on the free axis (focal% of the image
  // meets focal% of the section); `bottom`/`right: auto` undo the inset-0 /
  // next-image-fill stretch so `auto` resolves to the intrinsic ratio
  // instead of the section box.
  const axisStyle: React.CSSProperties =
    bg.fit === "x"
      ? {
          height: "auto",
          bottom: "auto",
          top: `${bg.focalY}%`,
          transform: [`translateY(-${bg.focalY}%)`, baseTransform]
            .filter(Boolean)
            .join(" "),
        }
      : bg.fit === "y"
        ? {
            width: "auto",
            right: "auto",
            left: `${bg.focalX}%`,
            transform: [`translateX(-${bg.focalX}%)`, baseTransform]
              .filter(Boolean)
              .join(" "),
          }
        : { transform: baseTransform };
  const imgStyle: React.CSSProperties = {
    objectPosition: `${bg.focalX}% ${bg.focalY}%`,
    filter: imageFilterAndBlurCss(bg.filter, bg.blur),
    transformOrigin: `${bg.focalX}% ${bg.focalY}%`,
    ...axisStyle,
  };
  return (
    <>
      {isOptimizableImageSrc(bg.src) ? (
        // Full-bleed section backdrop — always viewport-wide, so let the
        // optimizer pick the variant from the actual viewport.
        <NextImage
          {...mediaProps}
          src={bg.src}
          alt=""
          aria-hidden
          fill
          sizes="100vw"
          className="object-cover pointer-events-none"
          style={imgStyle}
        />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          {...mediaProps}
          src={bg.src}
          alt=""
          aria-hidden
          loading="lazy"
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={imgStyle}
        />
      )}
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
          style={{
            opacity: bg.tintOpacity / 100,
            ...imageTintMaskStyle({
              src: bg.src,
              fit:
                bg.fit === "x"
                  ? "match-x"
                  : bg.fit === "y"
                    ? "match-y"
                    : "cover",
              focalX: bg.focalX,
              focalY: bg.focalY,
              rotate: bg.rotate,
              flipX: bg.flipX,
              flipY: bg.flipY,
              zoom: bg.zoom,
            }),
          }}
        />
      )}
      {/* Above the overlay/tint: it stands in for the media, so it
          shouldn't be dimmed like the media is. */}
      <MediaSkeleton loaded={loaded} />
    </>
  );
}
