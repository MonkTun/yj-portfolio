import { z } from "zod";

/* ============================================================
   New schema — page is a list of Sections; each section is a
   12-column fluid grid containing atomic Blocks. Both the public
   renderer and the admin editor consume this schema directly.

   Coordinate system:
     - col: 1..12  (1-indexed for human-friendliness in JSON)
     - colSpan: 1..12
     - row: 1..N   (1-indexed; auto-flow if omitted)
     - rowSpan: positive integer in 8px row-height units
   ============================================================ */

export const blockLayoutSchema = z.object({
  col: z.number().int().min(1).max(12),
  colSpan: z.number().int().min(1).max(12),
  row: z.number().int().min(1).optional(),
  rowSpan: z.number().int().min(1).optional(),
});

export const mobileLayoutSchema = z
  .object({
    hidden: z.boolean().optional(),
  })
  .optional();

/* ----- Atomic blocks (TEXT, IMAGE, BUTTON, SPACER, LINE, QUOTE) ----- */

export const textVariantSchema = z.enum([
  "h1",
  "h2",
  "h3",
  "body",
  "caption",
  "kicker",
]);

export const textColorSchema = z.enum(["foreground", "muted", "accent"]);

export const textTransformSchema = z.enum(["none", "upper", "lower"]);

export const textPropsSchema = z.object({
  /** HTML string. Allowed inline tags: <strong>, <em>, <br>. */
  content: z.string(),
  variant: textVariantSchema,
  align: z.enum(["left", "center", "right"]).default("left"),
  color: textColorSchema.default("foreground"),
  /** Force uppercase / lowercase. Independent of the user's typed casing. */
  transform: textTransformSchema.default("none"),
  /** Optional pixel-size override. When set, beats the variant's clamp(). */
  fontSize: z.number().int().min(8).max(512).optional(),
  /** Optional line-height multiplier. Overrides the variant's leading. */
  lineHeight: z.number().min(0.6).max(3).optional(),
  /** Optional letter-spacing in em. Overrides the variant's tracking. */
  letterSpacing: z.number().min(-0.2).max(1).optional(),
});

export const imageFilterSchema = z.enum([
  "none",
  "bw",
  "sepia",
  "noir",
  "faded",
  "warm",
  "cool",
]);

/** Color token used for tint overlays. */
export const imageTintSchema = z.enum([
  "none",
  "background",
  "foreground",
  "accent",
]);

export const imagePropsSchema = z.object({
  src: z.string(),
  alt: z.string().default(""),
  fit: z.enum(["cover", "contain"]).default("cover"),
  /** Optional href — wraps the image in a link. */
  href: z.string().optional(),
  /** Optional aspect ratio override (CSS aspect-ratio). */
  aspect: z.string().optional(),
  /** Corner radius in px. 0 = sharp. */
  radius: z.number().int().min(0).max(200).default(0),
  /** Non-destructive CSS filter preset. */
  filter: imageFilterSchema.default("none"),
  /** Focal point as 0–100% of the image. Drives object-position so
   *  fit:cover crops around the chosen point. */
  focalX: z.number().min(0).max(100).default(50),
  focalY: z.number().min(0).max(100).default(50),
  /** Visual-only rotation in degrees. Source file is untouched. */
  rotate: z.number().min(-360).max(360).default(0),
  /** Mirror across the vertical axis. */
  flipX: z.boolean().default(false),
  /** Mirror across the horizontal axis. */
  flipY: z.boolean().default(false),
  /** Gaussian blur in px. */
  blur: z.number().int().min(0).max(50).default(0),
  /** Color overlay token; rendered as an absolute div on top of the image. */
  tint: imageTintSchema.default("none"),
  /** 0–100; opacity of the tint overlay. */
  tintOpacity: z.number().int().min(0).max(100).default(0),
});

export const buttonPropsSchema = z.object({
  label: z.string(),
  href: z.string(),
  variant: z.enum(["primary", "ghost"]).default("primary"),
  align: z.enum(["left", "center", "right"]).default("left"),
});

export const spacerPropsSchema = z.object({
  height: z.number().int().min(1).max(400).default(48),
});

export const linePropsSchema = z.object({
  thickness: z.union([z.literal(1), z.literal(2)]).default(1),
  color: z.enum(["border", "foreground", "accent"]).default("border"),
});

export const quotePropsSchema = z.object({
  quote: z.string(),
  attribution: z.string().optional(),
});

/** YouTube video embed. */
export const videoPropsSchema = z.object({
  /** Any supported YouTube URL form, or a bare 11-char video id. */
  url: z.string(),
  autoplay: z.boolean().default(false),
  muted: z.boolean().default(false),
  loop: z.boolean().default(false),
  controls: z.boolean().default(true),
  /** Start offset in seconds. */
  start: z.number().int().min(0).optional(),
  /** CSS aspect-ratio for the wrapper, e.g. "16/9" or "9/16". */
  aspect: z.string().default("16/9"),
  /** Corner radius in px. */
  radius: z.number().int().min(0).max(200).default(0),
});

/* ----- Discriminated union of block types ----- */

const blockBase = {
  id: z.string(),
  layout: blockLayoutSchema,
  mobile: mobileLayoutSchema,
};

export const blockSchema = z.discriminatedUnion("type", [
  z.object({ ...blockBase, type: z.literal("text"), props: textPropsSchema }),
  z.object({ ...blockBase, type: z.literal("image"), props: imagePropsSchema }),
  z.object({ ...blockBase, type: z.literal("button"), props: buttonPropsSchema }),
  z.object({ ...blockBase, type: z.literal("spacer"), props: spacerPropsSchema }),
  z.object({ ...blockBase, type: z.literal("line"), props: linePropsSchema }),
  z.object({ ...blockBase, type: z.literal("quote"), props: quotePropsSchema }),
  z.object({ ...blockBase, type: z.literal("video"), props: videoPropsSchema }),
]);

/* ----- Section ----- */

export const sectionBackgroundSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("transparent") }),
  z.object({
    type: z.literal("color"),
    token: z.enum(["background", "surface", "accent"]),
  }),
  z.object({
    type: z.literal("image"),
    src: z.string(),
    /** 0-100, % darkening overlay (legacy field — prefer tint+tintOpacity). */
    overlay: z.number().min(0).max(100).default(0),
    /** Same non-destructive effects as the Image atom. */
    filter: imageFilterSchema.default("none"),
    focalX: z.number().min(0).max(100).default(50),
    focalY: z.number().min(0).max(100).default(50),
    rotate: z.number().min(-360).max(360).default(0),
    flipX: z.boolean().default(false),
    flipY: z.boolean().default(false),
    blur: z.number().int().min(0).max(50).default(0),
    tint: imageTintSchema.default("none"),
    tintOpacity: z.number().int().min(0).max(100).default(0),
  }),
  z.object({
    type: z.literal("video"),
    /** YouTube URL or video id. */
    url: z.string(),
    /** 0-100, % overlay darken for legibility. */
    overlay: z.number().min(0).max(100).default(40),
    muted: z.boolean().default(true),
    loop: z.boolean().default(true),
    start: z.number().int().min(0).optional(),
    /** Color tint overlay (no mask — videos are opaque, full rect). */
    tint: imageTintSchema.default("none"),
    tintOpacity: z.number().int().min(0).max(100).default(0),
  }),
  z.object({
    type: z.literal("reactbits"),
    kind: z.enum([
      "prismatic-burst",
      "grid-scan",
      "grainient",
      "light-pillar",
      "liquid-ether",
    ]),
    /** Shared simple controls; per-kind components map them to their own
     *  prop names. Keeping them shared keeps the panel UI manageable. */
    intensity: z.number().min(0).max(2).default(1),
    speed: z.number().min(0).max(3).default(1),
    /** Two color stops — used as primary/secondary by every kind. */
    colorA: z.string().default("#C45A3A"),
    colorB: z.string().default("#0F0D0B"),
    overlay: z.number().min(0).max(100).default(0),
    tint: imageTintSchema.default("none"),
    tintOpacity: z.number().int().min(0).max(100).default(0),
    /** Below this viewport px width, swap to the cheap CSS fallback so
     *  mobile devices skip the WebGL chunk entirely. 0 disables. */
    mobileFallbackBreakpoint: z.number().int().min(0).max(2000).default(768),
    mobileFallbackKind: z
      .enum(["none", "gradient", "blur-dark", "blur-accent"])
      .default("gradient"),
  }),
]);

export const sectionPaddingSchema = z.enum(["none", "sm", "md", "lg", "xl"]);

export const sectionMinHeightSchema = z.enum([
  "auto",
  "half",
  "screen",
]);

export const sectionAlignSchema = z.enum(["top", "center", "bottom"]);

export const sectionSchema = z.object({
  id: z.string(),
  background: sectionBackgroundSchema.default({ type: "transparent" }),
  padding: sectionPaddingSchema.default("lg"),
  minHeight: sectionMinHeightSchema.default("auto"),
  align: sectionAlignSchema.default("top"),
  blocks: z.array(blockSchema),
});

/* ----- Page ----- */

export const pageSchema = z.object({
  meta: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
  sections: z.array(sectionSchema),
});

/* ----- Inferred types ----- */

export type BlockLayout = z.infer<typeof blockLayoutSchema>;
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

export type TextProps = z.infer<typeof textPropsSchema>;
export type ImageProps = z.infer<typeof imagePropsSchema>;
export type ButtonProps = z.infer<typeof buttonPropsSchema>;
export type SpacerProps = z.infer<typeof spacerPropsSchema>;
export type LineProps = z.infer<typeof linePropsSchema>;
export type QuoteProps = z.infer<typeof quotePropsSchema>;
export type VideoProps = z.infer<typeof videoPropsSchema>;

export type Section = z.infer<typeof sectionSchema>;
export type SectionBackground = z.infer<typeof sectionBackgroundSchema>;
export type SectionPadding = z.infer<typeof sectionPaddingSchema>;
export type SectionMinHeight = z.infer<typeof sectionMinHeightSchema>;
export type SectionAlign = z.infer<typeof sectionAlignSchema>;

export type Page = z.infer<typeof pageSchema>;
