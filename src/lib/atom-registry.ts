import type { ComponentType } from "react";
import type { Block, BlockType } from "@/lib/schema";
import { CAROUSEL_ITEM_EFFECT_DEFAULTS } from "@/lib/schema";

import { Text } from "@/components/atoms/Text";
import { Image } from "@/components/atoms/Image";
import { Button } from "@/components/atoms/Button";
import { Spacer } from "@/components/atoms/Spacer";
import { Line } from "@/components/atoms/Line";
import { Quote } from "@/components/atoms/Quote";
import { Video } from "@/components/atoms/Video";
import { ProjectCarousel } from "@/components/atoms/ProjectCarousel";
import { SocialLinks } from "@/components/atoms/SocialLinks";

type AtomEntry<P = unknown> = {
  type: BlockType;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: ComponentType<any>;
  /** Default props applied when this atom is added via "+ Add block". */
  defaultProps: P;
  /** Default size when newly inserted: `colSpan` in columns, `rowSpan` in
   *  ROW_HEIGHT_PX rows (lib/grid.ts). If ROWS_PER_MODULE is ever raised above
   *  1, these have to be whole modules too — otherwise a freshly added block
   *  jumps the first time it's dragged. */
  defaultLayout: { colSpan: number; rowSpan: number };
};

/**
 * Single source of truth for atomic blocks. Both the public renderer and
 * the editor consume this map. To add a new block type:
 *   1. Define a schema variant in `lib/schema.ts`
 *   2. Implement the component in `components/atoms/`
 *   3. Register here.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const atomRegistry: Record<BlockType, AtomEntry<any>> = {
  text: {
    type: "text",
    label: "Text",
    component: Text,
    defaultProps: {
      content: "Type something",
      variant: "body",
      align: "left",
      color: "foreground",
    },
    defaultLayout: { colSpan: 12, rowSpan: 3 },
  },
  image: {
    type: "image",
    label: "Image",
    component: Image,
    defaultProps: {
      src: "",
      alt: "",
      fit: "cover",
      radius: 0,
      filter: "none",
      focalX: 50,
      focalY: 50,
      rotate: 0,
      flipX: false,
      flipY: false,
      blur: 0,
      zoom: 1,
      tint: "none",
      tintOpacity: 0,
    },
    defaultLayout: { colSpan: 6, rowSpan: 15 },
  },
  button: {
    type: "button",
    label: "Button",
    component: Button,
    defaultProps: {
      label: "Click me",
      href: "#",
      variant: "primary",
      align: "left",
    },
    defaultLayout: { colSpan: 4, rowSpan: 3 },
  },
  spacer: {
    type: "spacer",
    label: "Spacer",
    component: Spacer,
    defaultProps: { height: 48 },
    defaultLayout: { colSpan: 12, rowSpan: 3 },
  },
  line: {
    type: "line",
    label: "Line",
    component: Line,
    defaultProps: { thickness: 1, color: "border" },
    defaultLayout: { colSpan: 12, rowSpan: 1 },
  },
  quote: {
    type: "quote",
    label: "Quote",
    component: Quote,
    defaultProps: {
      quote: "A quote that earns the spread.",
      attribution: "",
    },
    defaultLayout: { colSpan: 8, rowSpan: 9 },
  },
  video: {
    type: "video",
    label: "Video",
    component: Video,
    defaultProps: {
      url: "",
      autoplay: false,
      muted: false,
      loop: false,
      controls: true,
      aspect: "16/9",
      fit: "width",
      radius: 0,
    },
    defaultLayout: { colSpan: 8, rowSpan: 18 },
  },
  projectCarousel: {
    type: "projectCarousel",
    label: "Project Carousel",
    component: ProjectCarousel,
    defaultProps: {
      items: [
        {
          src: "",
          alt: "",
          title: "Project one",
          meta: "2024 — Role",
          description: "A short line about the work.",
          starred: false,
          ...CAROUSEL_ITEM_EFFECT_DEFAULTS,
        },
        {
          src: "",
          alt: "",
          title: "Project two",
          meta: "2023 — Role",
          description: "A short line about the work.",
          starred: false,
          ...CAROUSEL_ITEM_EFFECT_DEFAULTS,
        },
      ],
      variant: "cards",
      cardWidth: 320,
      gap: 24,
      aspect: "4/5",
      radius: 8,
      edgeFade: true,
      showArrows: true,
      newTab: false,
      autoScrollSpeed: 40,
      pauseOnHover: true,
    },
    defaultLayout: { colSpan: 12, rowSpan: 33 },
  },
  socialLinks: {
    type: "socialLinks",
    label: "Social Links",
    component: SocialLinks,
    defaultProps: {
      items: [
        { platform: "linkedin", href: "" },
        { platform: "discord", href: "" },
      ],
      variant: "icons",
      size: 20,
      gap: 20,
      align: "left",
      color: "foreground",
      newTab: true,
    },
    defaultLayout: { colSpan: 3, rowSpan: 3 },
  },
};

export function isBlockType(s: string): s is BlockType {
  return s in atomRegistry;
}

export function defaultsForBlock(type: BlockType): Block["props"] {
  return JSON.parse(
    JSON.stringify(atomRegistry[type].defaultProps)
  ) as Block["props"];
}
