/**
 * Class maps shared between the public renderer and the editor's inline
 * editor for atomic blocks. Centralising them keeps the two surfaces
 * visually identical.
 */

import type { TextProps } from "@/lib/schema";

/**
 * Text sizes are viewport-based (vw / static rem), NOT container-based.
 * That means resizing a block in the editor doesn't shrink the type — only
 * changing the viewport (i.e. responsive breakpoints) does. If you make a
 * block narrower than the text needs at its variant, the text wraps or
 * overflows; change the variant if you want smaller type.
 */
export const textVariantClass: Record<TextProps["variant"], string> = {
  h1: "font-display font-black [font-size:clamp(3rem,10vw,12rem)] leading-[0.92] tracking-[-0.02em]",
  h2: "font-display font-extrabold [font-size:clamp(2rem,6vw,6rem)] leading-[1.0] tracking-[-0.02em]",
  h3: "font-display font-bold [font-size:clamp(1.5rem,3.2vw,3rem)] leading-[1.1]",
  body: "[font-size:clamp(1rem,1.4vw,1.375rem)] leading-[1.55]",
  caption: "[font-size:clamp(0.8125rem,1vw,1rem)] leading-[1.4] text-foreground/65",
  kicker: "kicker",
};

export const textVariantTag: Record<TextProps["variant"], "h1" | "h2" | "h3" | "p" | "span"> = {
  h1: "h1",
  h2: "h2",
  h3: "h3",
  body: "p",
  caption: "p",
  kicker: "span",
};

export const textAlignClass = {
  left: "text-left",
  center: "text-center",
  right: "text-right",
} as const;

export const textColorClass = {
  foreground: "text-foreground",
  muted: "text-foreground/65",
  accent: "text-accent",
} as const;

export const textTransformClass = {
  none: "",
  upper: "uppercase",
  lower: "lowercase",
} as const;
