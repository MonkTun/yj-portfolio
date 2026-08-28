import type {
  Block,
  BlockLayout,
  MobileBlockOverride,
  Section,
  SectionMobileOverride,
} from "@/lib/schema";
import { MOBILE_OVERRIDABLE_KEYS } from "@/lib/mobile-overrides";
import {
  DESKTOP_CONTENT_PX,
  GRID_COLS,
  MOBILE_CONTENT_PX,
  ROW_HEIGHT_PX,
  ROWS_PER_MODULE,
  colSpanForPx,
  colSpanPx,
  fitRowSpan,
  snapRowOffset,
} from "@/lib/grid";

export type Device = "desktop" | "mobile";

/* ============================================================
   Block-level merge / prune
   ============================================================ */

export function hasMobileOverrides(block: Block): boolean {
  const m = block.mobile;
  if (!m) return false;
  if (m.hidden) return true;
  if (m.layout && Object.keys(m.layout).length > 0) return true;
  if (m.props && Object.keys(m.props).length > 0) return true;
  return false;
}

/**
 * Returns a Block with desktop and mobile values merged for rendering on
 * mobile viewports. `mobile.layout` patches `layout`; `mobile.props`
 * patches `props` after filtering against the override allow-list (so a
 * stale key in saved JSON can't break the render).
 *
 * Pure function — does not mutate `block`.
 */
export function mergeBlockForMobile(block: Block): Block {
  const m = block.mobile;
  if (!m) return block;

  const mergedLayout: BlockLayout = m.layout
    ? { ...block.layout, ...m.layout }
    : block.layout;

  const mergedProps = m.props
    ? mergeFilteredProps(block.type, block.props, m.props)
    : block.props;

  // Keep the discriminant key intact via a per-type spread. The
  // discriminated-union typing means we can't just `{ ...block, layout, props }`
  // generically without TS losing the discriminant.
  return {
    ...block,
    layout: mergedLayout,
    props: mergedProps,
  } as Block;
}

function mergeFilteredProps(
  type: Block["type"],
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = MOBILE_OVERRIDABLE_KEYS[type];
  const out: Record<string, unknown> = { ...base };
  for (const key of allowed) {
    if (key in override) {
      const value = override[key];
      // `undefined` in the override means "clear and inherit" — skip the
      // copy so the desktop value stays.
      if (value !== undefined) out[key] = value;
    }
  }
  return out;
}

/* ============================================================
   Section-level merge
   ============================================================ */

export function hasSectionMobileOverrides(section: Section): boolean {
  const m = section.mobile;
  if (!m) return false;
  return (
    m.padding !== undefined ||
    m.minHeight !== undefined ||
    m.align !== undefined
  );
}

export function mergeSectionForMobile(section: Section): Section {
  const m = section.mobile;
  if (!m) return section;
  return {
    ...section,
    padding: m.padding ?? section.padding,
    minHeight: m.minHeight ?? section.minHeight,
    align: m.align ?? section.align,
  };
}

/* ============================================================
   Pruning — keep saved JSON minimal
   ============================================================ */

/**
 * After every mobile-scoped mutation we run pruneMobile so the JSON only
 * holds keys that genuinely differ from desktop. Empty `mobile.layout` /
 * `mobile.props` get dropped; a fully empty `mobile` becomes undefined.
 *
 * Pure — returns a new Block.
 */
export function pruneMobile(block: Block): Block {
  const m = block.mobile;
  if (!m) return block;

  const next: MobileBlockOverride = {};

  if (m.hidden) next.hidden = true;

  if (m.layout) {
    const layout: NonNullable<MobileBlockOverride["layout"]> = {};
    if (m.layout.col !== undefined) layout.col = m.layout.col;
    if (m.layout.colSpan !== undefined) layout.colSpan = m.layout.colSpan;
    if (m.layout.row !== undefined) layout.row = m.layout.row;
    if (m.layout.rowSpan !== undefined) layout.rowSpan = m.layout.rowSpan;
    if (Object.keys(layout).length > 0) next.layout = layout;
  }

  if (m.props) {
    const allowed = MOBILE_OVERRIDABLE_KEYS[block.type];
    const props: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = m.props[key];
      if (value !== undefined) props[key] = value;
    }
    if (Object.keys(props).length > 0) next.props = props;
  }

  const isEmpty =
    !next.hidden &&
    !next.layout &&
    !next.props;

  return { ...block, mobile: isEmpty ? undefined : next } as Block;
}

export function pruneSectionMobile(section: Section): Section {
  const m = section.mobile;
  if (!m) return section;
  const next: SectionMobileOverride = {};
  if (m.padding !== undefined) next.padding = m.padding;
  if (m.minHeight !== undefined) next.minHeight = m.minHeight;
  if (m.align !== undefined) next.align = m.align;
  const isEmpty = Object.keys(next).length === 0;
  return { ...section, mobile: isEmpty ? undefined : next };
}

/* ============================================================
   Auto-stack — derive a mobile layout from the desktop layout

   When the user authors a side-by-side desktop layout (media left,
   text right) the mobile rendering looks broken: blocks crash into
   each other in a 12-col grid that's only ~400px wide. The auto-stack
   pass rebuilds every block's mobile layout from the desktop one.

   It is layout-aware, not just a flat sort:

   1. ORDER — recursive XY-cut. The section is split at clean
      horizontal gaps into bands (top → bottom), each band at clean
      vertical gaps into columns, recursing — so a left column stacks
      completely before the right column starts, instead of the two
      interleaving row-by-row. At a media|text split the media-only
      column leads (the mobile "card" pattern: media, then copy) —
      unless the text column opens with a section heading level with
      the media, which peels to the very top. Overlapping clusters
      fall back to reading order (row, then col).

   2. SIZE — aspect-aware. Media keeps its rendered desktop aspect
      ratio: a 1:1 image stays 1:1 (rowSpan is recomputed from the
      mobile rendered width), and small media keeps roughly its
      desktop pixel size instead of stretching full-width. Videos
      derive height from their `aspect` prop, which is what the Video
      atom actually renders. Long-form text grows by an estimated
      reflow factor (narrower column → more lines), clamped between
      its desktop height and the raw width ratio.

   3. PLACE — consecutive small media from the same desktop band pack
      side by side (e.g. a pair of award badges); desktop vertical
      rhythm within a column is preserved (capped) and a standard gap
      separates blocks that came from different columns. Desktop-
      centered small blocks stay centered. `mobile.hidden` blocks are
      skipped so they don't leave holes in the stack.

   Existing `mobile.layout` overrides are WIPED (style/props overrides
   are kept) — the caller is expected to confirm with the user before
   invoking this.
   ============================================================ */

/** Fallback height (in rows) for blocks with no desktop rowSpan. */
const DEFAULT_STACK_ROWSPAN = 3;

/** Vertical gap (rows) between stacked blocks that came from different
 *  desktop columns — one module of air between the stacked halves. */
const STACK_GAP_ROWS = 2 * ROWS_PER_MODULE;

/** Cap on preserved same-column desktop gaps, so a dramatic desktop
 *  offset doesn't punch a huge hole in the mobile stack. */
const MAX_KEPT_GAP_ROWS = 4 * ROWS_PER_MODULE;

const HEADING_VARIANTS: ReadonlySet<string> = new Set(["h1", "h2", "h3"]);

/**
 * Per-variant metrics for the text reflow estimate, matching the mobile
 * end of each variant's clamp() in atomStyles.ts. `charEm` is the average
 * glyph advance as a fraction of the font size (display face runs wider;
 * kickers are uppercase + tracked out).
 */
const TEXT_METRICS: Record<
  string,
  { size: number; leading: number; charEm: number }
> = {
  h1: { size: 48, leading: 0.92, charEm: 0.55 },
  h2: { size: 32, leading: 1.0, charEm: 0.55 },
  h3: { size: 24, leading: 1.1, charEm: 0.55 },
  body: { size: 16, leading: 1.55, charEm: 0.5 },
  caption: { size: 13, leading: 1.4, charEm: 0.5 },
  kicker: { size: 12, leading: 1.4, charEm: 0.74 },
};

/** A block plus its desktop footprint in half-open grid coordinates. */
type StackRect = {
  block: Block;
  col: number;
  colEnd: number;
  row: number;
  rowEnd: number;
  isMedia: boolean;
};

function toRect(block: Block): StackRect {
  const row = block.layout.row ?? 1;
  const rowSpan = block.layout.rowSpan ?? DEFAULT_STACK_ROWSPAN;
  return {
    block,
    col: block.layout.col,
    colEnd: block.layout.col + block.layout.colSpan,
    row,
    rowEnd: row + rowSpan,
    isMedia: block.type === "image" || block.type === "video",
  };
}

const rowsOverlap = (a: StackRect, b: StackRect) =>
  a.row < b.rowEnd && b.row < a.rowEnd;
const colsOverlap = (a: StackRect, b: StackRect) =>
  a.col < b.colEnd && b.col < a.colEnd;

/**
 * Partition rects into groups separated by clean gaps along one axis.
 * A boundary splits when no rect crosses it (touching edges do split).
 * Returns groups in axis order; single group = no clean cut exists.
 */
function splitAtGaps(
  rects: StackRect[],
  start: (r: StackRect) => number,
  end: (r: StackRect) => number,
): StackRect[][] {
  const sorted = [...rects].sort(
    (a, b) => start(a) - start(b) || end(a) - end(b),
  );
  const groups: StackRect[][] = [];
  let current: StackRect[] = [];
  let maxEnd = -Infinity;
  for (const r of sorted) {
    if (current.length > 0 && start(r) >= maxEnd) {
      groups.push(current);
      current = [];
    }
    current.push(r);
    maxEnd = Math.max(maxEnd, end(r));
  }
  if (current.length > 0) groups.push(current);
  return groups;
}

/** Stable reading order for clusters no cut can separate. */
function readingOrder(rects: StackRect[]): StackRect[] {
  return [...rects].sort(
    (a, b) =>
      a.row - b.row || a.col - b.col || a.rowEnd - b.rowEnd || a.colEnd - b.colEnd,
  );
}

/** Recursive XY-cut: horizontal bands first, then columns within a band. */
function xyOrder(rects: StackRect[]): StackRect[] {
  if (rects.length <= 1) return rects;
  const bands = splitAtGaps(rects, (r) => r.row, (r) => r.rowEnd);
  if (bands.length > 1) return bands.flatMap(xyOrder);
  return orderColumns(rects);
}

function isHeadingRect(r: StackRect): boolean {
  return (
    r.block.type === "text" && HEADING_VARIANTS.has(r.block.props.variant)
  );
}

/**
 * Order the column groups of one band. Media-only columns stack first
 * (the mobile card pattern — YJ's hand-made overrides put the project
 * video above the kicker/title/copy regardless of which side it sat on),
 * except that a section heading level with the media peels to the top:
 * the title introduces, the media follows, the copy closes.
 */
function orderColumns(rects: StackRect[]): StackRect[] {
  const groups = splitAtGaps(rects, (r) => r.col, (r) => r.colEnd);
  if (groups.length <= 1) return readingOrder(rects);

  const isMediaGroup = (g: StackRect[]) => g.every((r) => r.isMedia);
  const media = groups.filter(isMediaGroup);
  const text = groups.filter((g) => !isMediaGroup(g));

  // All media or all text → plain left-to-right.
  if (media.length === 0 || text.length === 0) return groups.flatMap(xyOrder);

  const lead = readingOrder(text[0])[0];
  const mediaTop = Math.min(...media.flat().map((r) => r.row));
  const peeled = isHeadingRect(lead) && lead.row <= mediaTop ? lead : null;
  const firstText = peeled ? text[0].filter((r) => r !== peeled) : text[0];

  return [
    ...(peeled ? [peeled] : []),
    ...media.flatMap(xyOrder),
    ...xyOrder(firstText),
    ...text.slice(1).flatMap(xyOrder),
  ];
}

/** Parse a CSS aspect-ratio string ("16/9", "1:1", "1.5") to width/height. */
function parseAspectRatio(value: string | undefined): number | null {
  if (!value) return null;
  const parts = value.split(/[/:]/).map((p) => Number.parseFloat(p.trim()));
  if (parts.length < 1 || parts.length > 2) return null;
  if (parts.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  return parts.length === 2 ? parts[0] / parts[1] : parts[0];
}

/**
 * The aspect ratio a media block actually renders at. Images fill their
 * grid box, so the desktop box IS the rendered aspect; the Video atom
 * sizes itself from its `aspect` prop (fills the block width, derives
 * height), so for video the prop is authoritative.
 */
function mediaAspect(rect: StackRect): number {
  const b = rect.block;
  if (b.type === "video") return parseAspectRatio(b.props.aspect) ?? 16 / 9;
  const boxAspect =
    b.layout.rowSpan !== undefined
      ? colSpanPx(b.layout.colSpan, DESKTOP_CONTENT_PX) /
        ((rect.rowEnd - rect.row) * ROW_HEIGHT_PX)
      : null;
  if (boxAspect !== null) return boxAspect;
  const propAspect = b.type === "image" ? parseAspectRatio(b.props.aspect) : null;
  return propAspect ?? 3 / 2;
}

/**
 * Estimate how many grid rows a text block needs at `widthPx`, from its
 * variant metrics and character count. Rough by design — the result is
 * clamped between the desktop height and the raw width-ratio scale, so a
 * bad estimate degrades to those bounds rather than breaking the stack.
 */
function estimateTextRows(rect: StackRect, widthPx: number): number {
  const b = rect.block;
  if (b.type !== "text") return rect.rowEnd - rect.row;
  const metrics = TEXT_METRICS[b.props.variant] ?? TEXT_METRICS.body;
  const mobileFontSize = b.mobile?.props?.fontSize;
  const size =
    (typeof mobileFontSize === "number" ? mobileFontSize : undefined) ??
    b.props.fontSize ??
    metrics.size;
  const leading = b.props.lineHeight ?? metrics.leading;
  const upper = b.props.transform === "upper" ? 1.15 : 1;
  const charPx = size * metrics.charEm * upper;
  const perLine = Math.max(4, Math.floor(widthPx / charPx));

  let lines = 0;
  for (const chunk of b.props.content.split(/<br\s*\/?>/i)) {
    // Tags vanish; an HTML entity renders as a single glyph.
    const chars = chunk
      .replace(/<[^>]+>/g, "")
      .replace(/&[a-zA-Z]+;|&#\d+;/g, "x").length;
    lines += Math.max(1, Math.ceil(chars / perLine));
  }
  return Math.ceil((lines * size * leading) / ROW_HEIGHT_PX);
}

/** The mobile colSpan/rowSpan for one block. */
function mobileSize(rect: StackRect): { colSpan: number; rowSpan: number } {
  const b = rect.block;
  const desktopRowSpan = rect.rowEnd - rect.row;
  const desktopWidth = colSpanPx(b.layout.colSpan, DESKTOP_CONTENT_PX);

  if (rect.isMedia) {
    // Keep the desktop rendered size when it fits the phone — an 85px
    // badge should not blow up to full-bleed — and keep the rendered
    // aspect ratio either way: 1:1 stays 1:1.
    const colSpan =
      desktopWidth >= MOBILE_CONTENT_PX
        ? GRID_COLS
        : colSpanForPx(desktopWidth, MOBILE_CONTENT_PX);
    const width = colSpanPx(colSpan, MOBILE_CONTENT_PX);
    const rowSpan = Math.max(
      1,
      Math.ceil(width / mediaAspect(rect) / ROW_HEIGHT_PX),
    );
    return { colSpan, rowSpan: fitRowSpan(rowSpan) };
  }

  if (b.type === "text" || b.type === "quote") {
    // Text reflows in the narrower column. Grow the box toward the
    // estimated height, never shrinking below desktop and never past
    // the raw width ratio.
    const ratio = Math.max(1, desktopWidth / MOBILE_CONTENT_PX);
    const cap = Math.ceil(desktopRowSpan * ratio);
    const estimated =
      b.type === "quote" ? cap : estimateTextRows(rect, MOBILE_CONTENT_PX);
    const rowSpan = Math.min(cap, Math.max(desktopRowSpan, estimated));
    return { colSpan: GRID_COLS, rowSpan: fitRowSpan(rowSpan) };
  }

  return { colSpan: GRID_COLS, rowSpan: fitRowSpan(desktopRowSpan) };
}

/**
 * Vertical gap before `next`. Blocks that shared a desktop column keep
 * their authored rhythm (capped); blocks arriving from a different
 * column get one standard gap.
 */
function stackGap(prev: StackRect, next: StackRect): number {
  if (colsOverlap(prev, next)) {
    const kept = Math.min(Math.max(next.row - prev.rowEnd, 0), MAX_KEPT_GAP_ROWS);
    return snapRowOffset(kept);
  }
  return STACK_GAP_ROWS;
}

/** Column for a lone block: desktop-centered stays centered, else left. */
function stackCol(rect: StackRect, colSpan: number): number {
  if (colSpan >= GRID_COLS) return 1;
  const left = rect.col - 1;
  const right = GRID_COLS + 1 - rect.colEnd;
  if (Math.abs(left - right) > 1) return 1;
  return Math.floor((GRID_COLS - colSpan) / 2) + 1;
}

/** Place the ordered rects into the mobile stack. */
function placeStack(ordered: StackRect[]): Map<string, BlockLayout> {
  const out = new Map<string, BlockLayout>();
  let cursor = 1;
  let prev: StackRect | null = null;
  let i = 0;

  while (i < ordered.length) {
    const first = ordered[i];
    const run = [{ rect: first, size: mobileSize(first) }];

    // Pack consecutive small media from the same desktop band into one
    // mobile row (badge pairs, thumbnail strips).
    if (first.isMedia) {
      let width = run[0].size.colSpan;
      while (i + run.length < ordered.length) {
        const next = ordered[i + run.length];
        if (!next.isMedia || !rowsOverlap(first, next)) break;
        const size = mobileSize(next);
        if (width + size.colSpan > GRID_COLS) break;
        run.push({ rect: next, size });
        width += size.colSpan;
      }
    }

    if (prev) cursor += stackGap(prev, first);

    let col = run.length === 1 ? stackCol(first, run[0].size.colSpan) : 1;
    let tallest = 0;
    for (const { rect, size } of run) {
      out.set(rect.block.id, {
        col,
        colSpan: size.colSpan,
        row: cursor,
        rowSpan: size.rowSpan,
      });
      col += size.colSpan;
      tallest = Math.max(tallest, size.rowSpan);
    }

    cursor += tallest;
    prev = run[run.length - 1].rect;
    i += run.length;
  }

  return out;
}

export function autoStackSection(section: Section): Section {
  // Blocks hidden on mobile don't render — stacking them would leave a
  // hole in the flow, so they're excluded (their stale layout override
  // is wiped; `hidden` and style overrides survive).
  const visible = section.blocks.filter((b) => !b.mobile?.hidden);
  const ordered = xyOrder(visible.map(toRect));
  const placed = placeStack(ordered);

  return {
    ...section,
    blocks: section.blocks.map((b) => {
      const layout = placed.get(b.id);
      const patch = layout ? diffMobileLayout(b.layout, layout) : undefined;
      const currentMobile = b.mobile ?? {};
      return pruneMobile({
        ...b,
        mobile: { ...currentMobile, layout: patch },
      } as Block);
    }),
  };
}

/** Apply auto-stack to every section in the page. */
export function autoStackPage<P extends { sections: Section[] }>(page: P): P {
  return { ...page, sections: page.sections.map(autoStackSection) };
}

/* ============================================================
   Layout patch diff — only persist what differs from desktop
   ============================================================ */

/**
 * Compute the sparse mobile layout patch from a fresh layout snapshot
 * (e.g. what RGL gave us after a drag) versus the desktop baseline.
 * Keys that match the desktop baseline are dropped from the patch.
 */
export function diffMobileLayout(
  desktop: BlockLayout,
  next: BlockLayout,
): NonNullable<MobileBlockOverride["layout"]> | undefined {
  const patch: NonNullable<MobileBlockOverride["layout"]> = {};
  if (next.col !== desktop.col) patch.col = next.col;
  if (next.colSpan !== desktop.colSpan) patch.colSpan = next.colSpan;
  if ((next.row ?? undefined) !== (desktop.row ?? undefined)) {
    if (next.row !== undefined) patch.row = next.row;
  }
  if ((next.rowSpan ?? undefined) !== (desktop.rowSpan ?? undefined)) {
    if (next.rowSpan !== undefined) patch.rowSpan = next.rowSpan;
  }
  return Object.keys(patch).length > 0 ? patch : undefined;
}
