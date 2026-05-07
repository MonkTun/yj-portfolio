import type { Block, Section } from "@/lib/schema";

/**
 * Section templates — preset compositions you can drop in via the
 * "+ Section" picker. Each is a complete `Section` minus the `id`s
 * (filled in at insert time so duplicates can be generated cleanly).
 *
 * Keep these tightly-curated — too many templates makes the picker
 * noisy. Each should have a clear use case.
 */

/**
 * A Block snapshot without its `id` — discriminated unions and `Omit`
 * combine awkwardly, so we re-spell the shape with a permissive `props`
 * here. Validation against the canonical `blockSchema` happens at save
 * time anyway.
 */
export type BlockSeed = Omit<Block, "id" | "props"> & {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
};

export type SectionTemplate = {
  id: string;
  label: string;
  description: string;
  preview: {
    w: number;
    h: number;
    blocks: Array<{
      x: number;
      y: number;
      w: number;
      h: number;
      tone?: "fg" | "muted" | "accent";
    }>;
  };
  /** A deep-cloneable Section snapshot (without ids — regenerated at insert). */
  build: () => Omit<Section, "id" | "blocks"> & { blocks: BlockSeed[] };
};

export const sectionTemplates: SectionTemplate[] = [
  {
    id: "blank",
    label: "Blank",
    description: "An empty 12-col section.",
    preview: { w: 12, h: 6, blocks: [] },
    build: () => ({
      background: { type: "transparent" },
      padding: "lg",
      minHeight: "auto",
      align: "top",
      blocks: [],
    }),
  },
  {
    id: "editorial-hero",
    label: "Editorial hero",
    description: "Massive H1 + supporting body text. Magazine cover energy.",
    preview: {
      w: 12,
      h: 12,
      blocks: [
        { x: 1, y: 0, w: 10, h: 5, tone: "fg" },
        { x: 4, y: 6, w: 7, h: 3, tone: "muted" },
      ],
    },
    build: () => ({
      background: { type: "transparent" },
      padding: "xl",
      minHeight: "screen",
      align: "center",
      blocks: [
        {
          type: "text",
          layout: { col: 2, colSpan: 6, row: 1, rowSpan: 4 },
          props: {
            content: "§ 00 — Index",
            variant: "kicker",
            align: "left",
            color: "foreground",
          },
        },
        {
          type: "text",
          layout: { col: 2, colSpan: 11, row: 6, rowSpan: 24 },
          props: {
            content: "Your<br>Name.",
            variant: "h1",
            align: "left",
            color: "foreground",
          },
        },
        {
          type: "text",
          layout: { col: 5, colSpan: 7, row: 32, rowSpan: 8 },
          props: {
            content: "A short, opinionated sentence about what you do.",
            variant: "body",
            align: "left",
            color: "foreground",
          },
        },
      ],
    }),
  },
  {
    id: "section-title",
    label: "Section title",
    description: "Numbered kicker + hairline rule + big H2.",
    preview: {
      w: 12,
      h: 6,
      blocks: [
        { x: 1, y: 0, w: 2, h: 1, tone: "muted" },
        { x: 1, y: 2, w: 10, h: 3, tone: "fg" },
      ],
    },
    build: () => ({
      background: { type: "transparent" },
      padding: "lg",
      minHeight: "auto",
      align: "top",
      blocks: [
        {
          type: "text",
          layout: { col: 2, colSpan: 3, row: 1, rowSpan: 3 },
          props: {
            content: "§ 01",
            variant: "kicker",
            align: "left",
            color: "muted",
          },
        },
        {
          type: "line",
          layout: { col: 5, colSpan: 7, row: 2, rowSpan: 1 },
          props: { thickness: 1, color: "border" },
        },
        {
          type: "text",
          layout: { col: 2, colSpan: 10, row: 5, rowSpan: 12 },
          props: {
            content: "Section title.",
            variant: "h2",
            align: "left",
            color: "foreground",
          },
        },
      ],
    }),
  },
  {
    id: "two-column",
    label: "Two-column intro",
    description: "Kicker on the left, body paragraph on the right.",
    preview: {
      w: 12,
      h: 8,
      blocks: [
        { x: 1, y: 0, w: 4, h: 2, tone: "muted" },
        { x: 6, y: 0, w: 6, h: 6, tone: "fg" },
      ],
    },
    build: () => ({
      background: { type: "transparent" },
      padding: "lg",
      minHeight: "auto",
      align: "top",
      blocks: [
        {
          type: "text",
          layout: { col: 2, colSpan: 4, row: 1, rowSpan: 4 },
          props: {
            content: "On making.",
            variant: "kicker",
            align: "left",
            color: "muted",
          },
        },
        {
          type: "text",
          layout: { col: 7, colSpan: 5, row: 1, rowSpan: 18 },
          props: {
            content:
              "Write the body of this section here. The opening paragraph carries weight — keep it precise and a touch unexpected.",
            variant: "body",
            align: "left",
            color: "foreground",
          },
        },
      ],
    }),
  },
  {
    id: "image-caption",
    label: "Image with caption",
    description: "Wide image + caption beside it.",
    preview: {
      w: 12,
      h: 10,
      blocks: [
        { x: 1, y: 0, w: 7, h: 8, tone: "fg" },
        { x: 9, y: 6, w: 3, h: 2, tone: "muted" },
      ],
    },
    build: () => ({
      background: { type: "transparent" },
      padding: "lg",
      minHeight: "auto",
      align: "top",
      blocks: [
        {
          type: "image",
          layout: { col: 2, colSpan: 7, row: 1, rowSpan: 40 },
          props: { src: "", alt: "", fit: "cover", aspect: "4/3" },
        },
        {
          type: "text",
          layout: { col: 9, colSpan: 4, row: 32, rowSpan: 6 },
          props: {
            content: "Caption goes here, italic and small.",
            variant: "caption",
            align: "left",
            color: "muted",
          },
        },
      ],
    }),
  },
  {
    id: "pull-quote",
    label: "Pull quote",
    description: "A centered, oversized quotation.",
    preview: {
      w: 12,
      h: 6,
      blocks: [{ x: 2, y: 1, w: 8, h: 4, tone: "fg" }],
    },
    build: () => ({
      background: { type: "transparent" },
      padding: "xl",
      minHeight: "auto",
      align: "center",
      blocks: [
        {
          type: "quote",
          layout: { col: 3, colSpan: 8, row: 1, rowSpan: 18 },
          props: {
            quote: "A quote that earns the spread.",
            attribution: "Note to self",
          },
        },
      ],
    }),
  },
  {
    id: "footer",
    label: "Footer",
    description: "Email lockup + link list + colophon.",
    preview: {
      w: 12,
      h: 8,
      blocks: [
        { x: 1, y: 1, w: 6, h: 4, tone: "fg" },
        { x: 8, y: 1, w: 3, h: 4, tone: "muted" },
      ],
    },
    build: () => ({
      background: { type: "transparent" },
      padding: "lg",
      minHeight: "auto",
      align: "top",
      blocks: [
        {
          type: "text",
          layout: { col: 2, colSpan: 6, row: 1, rowSpan: 3 },
          props: {
            content: "Get in touch",
            variant: "kicker",
            align: "left",
            color: "muted",
          },
        },
        {
          type: "text",
          layout: { col: 2, colSpan: 7, row: 4, rowSpan: 12 },
          props: {
            content: "you@example.com",
            variant: "h2",
            align: "left",
            color: "foreground",
          },
        },
        {
          type: "text",
          layout: { col: 9, colSpan: 3, row: 4, rowSpan: 8 },
          props: {
            content: "GitHub ↗<br>LinkedIn ↗<br>Resume ↗",
            variant: "kicker",
            align: "left",
            color: "foreground",
          },
        },
      ],
    }),
  },
];
