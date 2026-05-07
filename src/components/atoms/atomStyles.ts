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
 *
 * The clamp max of body / h1-3 binds to the active palette's `sizes` knobs
 * (--text-body, --text-header) so the editor's Sizes section can scale the
 * whole site. h2/h3 are derived as fractions of --text-header to keep the
 * headline cascade in proportion.
 */
export const textVariantClass: Record<TextProps["variant"], string> = {
  h1: "font-display font-black [font-size:clamp(3rem,10vw,var(--text-header))] leading-[0.92] tracking-[-0.02em]",
  h2: "font-display font-extrabold [font-size:clamp(2rem,6vw,calc(var(--text-header)*0.5))] leading-[1.0] tracking-[-0.02em]",
  h3: "font-display font-bold [font-size:clamp(1.5rem,3.2vw,calc(var(--text-header)*0.25))] leading-[1.1]",
  body: "[font-size:clamp(1rem,1.4vw,var(--text-body))] leading-[1.55]",
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
