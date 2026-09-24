import type { Block, Page, PostListItem, PostListProps } from "@/lib/schema";
import { ROW_HEIGHT_PX, fitRowSpan } from "@/lib/grid";
import { pruneMobile } from "@/lib/responsive";

/**
 * Post List height, in grid rows.
 *
 * The grid is fixed-height boxes (16px rows inside `overflow-hidden`
 * sections), so every entry added to a post list outgrows each block that
 * holds it — the blog index and every post's outro — and the new row gets
 * clipped or runs over the button below. The create-post flow uses these
 * helpers to grow those boxes instead of leaving them to be resized by hand.
 *
 * Metrics are measured off `atoms/PostList.tsx` at 1280px and 390px
 * (Sep 2026) — keep them in step with its classes. Glyph widths are rounded
 * up so the estimate errs tall: slack under the last row is invisible, a
 * clipped row isn't.
 */

type Metrics = {
  /** Row padding, top + bottom (`py-8` / `py-6`). */
  pad: number;
  /** Number · date line stacked above the title (phones only — on md+ it
   *  sits beside the title) plus the `gap-3` under it. */
  meta: number;
  /** Title column width, px. */
  width: number;
  /** Summary width, px (`max-w-2xl` caps it on desktop). */
  summaryWidth: number;
  title: Record<PostListProps["size"], { size: number; line: number }>;
  summary: { size: number; line: number; gap: number };
};

const DESKTOP: Metrics = {
  pad: 64,
  meta: 0,
  // 1200px content box minus the number, date and arrow columns and gaps.
  width: 926,
  summaryWidth: 672,
  title: { lg: { size: 48, line: 48 }, md: { size: 30, line: 36 } },
  summary: { size: 18, line: 27, gap: 12 },
};

const PHONE: Metrics = {
  pad: 48,
  meta: 30,
  // A 375px phone minus the section's `px-6` — narrower than the editor's
  // 425px canvas, so a title that fits there still fits a real phone.
  width: 327,
  summaryWidth: 327,
  title: { lg: { size: 30, line: 36 }, md: { size: 24, line: 30 } },
  summary: { size: 16, line: 24, gap: 12 },
};

/** Average glyph advance in em, a notch over the widest measured —
 *  0.28–0.31 for Karepefx titles, 0.38–0.46 for Newsreader summaries. */
const GLYPH_EM = { title: 0.33, summary: 0.46 };

/** `min-h-32` on the empty-list placeholder. */
const EMPTY_PX = 128;

function lineCount(text: string, sizePx: number, em: number, widthPx: number) {
  const perLine = Math.max(1, Math.floor(widthPx / (sizePx * em)));
  return Math.max(1, Math.ceil(text.length / perLine));
}

function entryPx(item: PostListItem, props: PostListProps, m: Metrics) {
  const title = m.title[props.size];
  let px =
    m.pad +
    m.meta +
    lineCount(item.title || "Untitled", title.size, GLYPH_EM.title, m.width) *
      title.line;
  if (props.showSummary && item.summary) {
    px +=
      m.summary.gap +
      lineCount(item.summary, m.summary.size, GLYPH_EM.summary, m.summaryWidth) *
        m.summary.line;
  }
  return px + 1; // hairline between rows
}

function listRows(props: PostListProps, m: Metrics) {
  const px =
    props.items.length === 0
      ? EMPTY_PX
      : 2 + props.items.reduce((sum, item) => sum + entryPx(item, props, m), 0);
  return fitRowSpan(Math.ceil(px / ROW_HEIGHT_PX));
}

export type ListRows = { desktop: number; mobile: number };

/** Rows a post list needs to show every entry, per breakpoint. */
export function postListRows(props: PostListProps): ListRows {
  return { desktop: listRows(props, DESKTOP), mobile: listRows(props, PHONE) };
}

/**
 * Grow every instance of mirror `mirrorId` on `page` to at least `rows`, and
 * push whatever sits below it in the same section down by the same amount,
 * so nothing ends up underneath the list. Never shrinks — slack already
 * authored is kept.
 *
 * Each breakpoint is sized on its own: phone rows wrap and run taller, so
 * the phone height goes in as a mobile override (the same sparse overrides
 * the editor writes) rather than stretching the desktop box to cover it.
 *
 * Returns the updated page, or `null` when nothing needed to move.
 */
export function growMirrorInstances(
  page: Page,
  mirrorId: string,
  rows: ListRows,
): Page | null {
  let changed = false;
  const sections = page.sections.map((section) => {
    let blocks = section.blocks;
    for (const inst of section.blocks) {
      if (inst.type !== "mirror" || inst.props.mirrorId !== mirrorId) continue;
      const grown = growInstance(blocks, inst.id, rows);
      if (grown) {
        blocks = grown;
        changed = true;
      }
    }
    return blocks === section.blocks ? section : { ...section, blocks };
  });
  return changed ? { ...page, sections } : null;
}

/** A block's rows on each breakpoint — mobile falls back to desktop. */
function rowsOf(b: Block) {
  const m = b.mobile?.layout;
  const span = b.layout.rowSpan ?? 1;
  return {
    row: b.layout.row,
    span,
    mobileRow: m?.row ?? b.layout.row,
    mobileSpan: m?.rowSpan ?? span,
  };
}

function growInstance(
  blocks: Block[],
  id: string,
  rows: ListRows,
): Block[] | null {
  const inst = blocks.find((b) => b.id === id);
  if (!inst) return null;
  const before = rowsOf(inst);
  const span = Math.max(before.span, rows.desktop);
  const mobileSpan = Math.max(before.mobileSpan, rows.mobile);
  const delta = span - before.span;
  const mobileDelta = mobileSpan - before.mobileSpan;
  if (delta === 0 && mobileDelta === 0) return null;

  const bottom =
    before.row === undefined ? undefined : before.row + before.span;
  const mobileBottom =
    before.mobileRow === undefined
      ? undefined
      : before.mobileRow + before.mobileSpan;
  const shift = (row: number | undefined, edge: number | undefined, by: number) =>
    row !== undefined && edge !== undefined && row >= edge ? row + by : row;

  return blocks.map((b) => {
    if (b.id === id) return place(b, "rowSpan", span, mobileSpan);
    const r = rowsOf(b);
    return place(
      b,
      "row",
      shift(r.row, bottom, delta),
      shift(r.mobileRow, mobileBottom, mobileDelta),
    );
  });
}

/** Set a row key on desktop, and on mobile only where it differs. */
function place(
  b: Block,
  key: "row" | "rowSpan",
  desktop: number | undefined,
  mobile: number | undefined,
): Block {
  if (desktop === undefined) return b;
  const layout = { ...b.layout, [key]: desktop };
  const mobileLayout = { ...b.mobile?.layout };
  if (mobile === undefined || mobile === desktop) delete mobileLayout[key];
  else mobileLayout[key] = mobile;
  return pruneMobile({
    ...b,
    layout,
    mobile: { ...b.mobile, layout: mobileLayout },
  } as Block);
}
