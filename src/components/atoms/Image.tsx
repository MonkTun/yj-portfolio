"use client";

import NextImage from "next/image";

import type { ImageProps } from "@/lib/schema";
import { cn } from "@/lib/utils";

import {
  imageFilterAndBlurCss,
  imageTintBgClass,
  imageTintMaskStyle,
  imageTransformCss,
  isOptimizableImageSrc,
} from "./imageStyles";

/** Content column is max-w-7xl, so no block image ever renders wider. */
const BLOCK_IMAGE_SIZES = "(max-width: 768px) 100vw, 1280px";

export function Image(props: ImageProps) {
  const {
    src,
    alt,
    fit,
    href,
    aspect,
    radius,
    filter,
    focalX,
    focalY,
    rotate,
    flipX,
    flipY,
    blur,
    zoom,
    tint,
    tintOpacity,
  } = props;

  const wrapperStyle: React.CSSProperties = {
    aspectRatio: aspect || undefined,
    borderRadius: radius ? `${radius}px` : undefined,
  };

  const imgStyle: React.CSSProperties = {
    objectPosition: `${focalX}% ${focalY}%`,
    filter: imageFilterAndBlurCss(filter, blur),
    transform: imageTransformCss({ rotate, flipX, flipY, zoom }),
    transformOrigin: `${focalX}% ${focalY}%`,
  };

  const tintClass = imageTintBgClass[tint];
  const showTint = tintClass !== null && tintOpacity > 0;

  const inner = (
    <div
      className={cn(
        "relative w-full h-full overflow-hidden",
        radius === 0 && "rounded-sm",
        // Only show the surface fill / border when there's no image — otherwise
        // a transparent PNG would render against the grey instead of the page.
        !src && "bg-surface border border-border"
      )}
      style={wrapperStyle}
    >
      {src ? (
        <>
          {isOptimizableImageSrc(src) ? (
            // Local assets go through next/image so Vercel serves resized
            // WebP variants instead of the raw multi-MB originals. `fill`
            // keeps the exact absolute-positioning contract of the old
            // <img>, and the focal/filter/transform styles pass through.
            <NextImage
              src={src}
              alt={alt}
              fill
              sizes={BLOCK_IMAGE_SIZES}
              style={imgStyle}
              className={fit === "cover" ? "object-cover" : "object-contain"}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              loading="lazy"
              decoding="async"
              style={imgStyle}
              className={cn(
                "absolute inset-0 h-full w-full",
                fit === "cover" ? "object-cover" : "object-contain"
              )}
            />
          )}
          {showTint && (
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 pointer-events-none",
                tintClass
              )}
              style={{
                opacity: tintOpacity / 100,
                ...imageTintMaskStyle({
                  src,
                  fit,
                  focalX,
                  focalY,
                  rotate,
                  flipX,
                  flipY,
                  zoom,
                }),
              }}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-foreground/30 italic kicker">
          No image
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block w-full h-full">
        {inner}
      </a>
    );
  }
  return inner;
}
