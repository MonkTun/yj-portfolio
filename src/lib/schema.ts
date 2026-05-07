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
  /** Open the link in a new tab (target="_blank" + rel="noopener noreferrer"). */
  newTab: z.boolean().default(false),
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
  // Inverse section. Foreground becomes the background, background becomes
  // the text color — so on a dark page this paints a section in the warm
  // cream (--foreground) with dark text. Descendants reading --background
  // / --foreground (Tailwind text-foreground, bg-surface, etc.) pick up
  // the swapped values via an inner wrapper; see sectionBackgroundStyle.
  z.object({ type: z.literal("reverse") }),
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
    /** Playback speed. YouTube's IFrame API only accepts a fixed set of
     *  rates — 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2 — so the editor UI
     *  exposes those discretely; off-list values are coerced server-side. */
    playbackRate: z.number().min(0.25).max(2).default(1),
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
    colorA: z.string().default("#5C8A3A"),
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

/* ----- Site config -----
   Maps page slugs onto routing roles. Lives at content/site.json.
   When constructionMode is true, "/" renders constructionSlug — otherwise
   "/" renders homeSlug. notFoundSlug feeds the not-found route. ----- */

export const siteConfigSchema = z.object({
  homeSlug: z.string().min(1).default("home"),
  constructionSlug: z.string().min(1).default("construction"),
  notFoundSlug: z.string().min(1).default("404"),
  constructionMode: z.boolean().default(true),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;

/* ----- Theme / palettes -----
   A palette is a named bundle of the seven core color tokens. Many can be
   saved; one is active and gets injected as CSS variables on <html> in
   src/app/layout.tsx. Lives at content/theme.json. */

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Use a 6-digit hex like #5C8A3A");

export const paletteColorsSchema = z.object({
  background: hexColor,
  foreground: hexColor,
  mutedForeground: hexColor,
  surface: hexColor,
  border: hexColor,
  accent: hexColor,
  accentForeground: hexColor,
});

// Font choice per role. Defaults are filled in by zod when the field is
// missing on disk so older theme.json files (no `fonts` block) keep parsing.
// Validation that an id actually maps to a known font in the registry is
// done in the API route — keeping the runtime registry out of the schema
// avoids importing client-side font config into shared types.
const fontId = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]*$/, "Lowercase letters, digits and dashes");

export const paletteFontsSchema = z.object({
  display: fontId.default("karepefx"),
  body: fontId.default("playfair-display"),
  sans: fontId.default("bricolage"),
});

// Type scale knobs. Two values:
//   - body: the body variant's clamp() max AND the body element's
//     inherited font-size. So this knob shrinks running text everywhere.
//   - header: the h1 variant's clamp() max. h2 = header × 0.5,
//     h3 = header × 0.25, so the headline cascade scales together.
// Both expressed in rem; mins and the viewport-scale factor inside clamp()
// stay fixed in atomStyles.ts so the fluid behavior at small viewports
// doesn't change with the knob.
export const paletteSizesSchema = z.object({
  body: z.number().min(0.75).max(2).default(1.125),
  header: z.number().min(2).max(20).default(12),
});

export const paletteSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9][a-z0-9-]*$/, "Lowercase letters, digits and dashes"),
  name: z.string().min(1).max(60),
  colors: paletteColorsSchema,
  fonts: paletteFontsSchema.default({
    display: "karepefx",
    body: "playfair-display",
    sans: "bricolage",
  }),
  sizes: paletteSizesSchema.default({
    body: 1.125,
    header: 12,
  }),
});

export const themeSchema = z.object({
  activePaletteId: z.string().min(1),
  palettes: z.array(paletteSchema).min(1),
});

export type PaletteColors = z.infer<typeof paletteColorsSchema>;
export type PaletteFonts = z.infer<typeof paletteFontsSchema>;
export type PaletteSizes = z.infer<typeof paletteSizesSchema>;
export type Palette = z.infer<typeof paletteSchema>;
export type Theme = z.infer<typeof themeSchema>;

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
