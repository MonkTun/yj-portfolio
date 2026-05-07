"use client";

import type { ImageProps } from "@/lib/schema";
import { cn } from "@/lib/utils";

import {
  imageFilterAndBlurCss,
  imageTintBgClass,
  imageTintMaskStyle,
  imageTransformCss,
} from "./imageStyles";

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
    transform: imageTransformCss({ rotate, flipX, flipY }),
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            style={imgStyle}
            className={cn(
              "absolute inset-0 h-full w-full",
              fit === "cover" ? "object-cover" : "object-contain"
            )}
          />
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
