import type { LayoutItem } from "react-grid-layout";
import type { LayoutConstraint } from "react-grid-layout/core";
import type { Block, BlockLayout } from "@/lib/schema";
import { mergeBlockForMobile, type Device } from "@/lib/responsive";
import {
  ROWS_PER_MODULE,
  fitRowSpan,
  snapRowOffset,
  snapRowSpan,
} from "@/lib/grid";

/**
 * react-grid-layout uses 0-indexed coordinates; we keep our schema
 * 1-indexed for human authoring of JSON. Conversions happen here so
 * everything else can talk in human coords.
 *
 * The `device` parameter routes through the merged layout when mobile is
 * active so RGL renders, drag-diffs, and commits against the SAME baseline.
 */

export function blockToLayoutItem(
  block: Block,
  device: Device = "desktop",
): LayoutItem {
  const layout =
    device === "mobile" ? mergeBlockForMobile(block).layout : block.layout;
  return layoutToLayoutItem(block.id, layout);
}

function layoutToLayoutItem(id: string, layout: BlockLayout): LayoutItem {
  return {
    i: id,
    x: layout.col - 1,
    y: (layout.row ?? 1) - 1,
    w: layout.colSpan,
    h: layout.rowSpan ?? 4,
  };
}

export function layoutItemToBlockLayout(item: LayoutItem): BlockLayout {
  return {
    col: item.x + 1,
    colSpan: item.w,
    row: item.y + 1,
    rowSpan: item.h,
  };
}

/**
 * Snap-to-module constraint — the vertical counterpart of the 12 columns.
 *
 * `x` / `w` are left alone: the column grid already quantises the horizontal
 * axis. `y` and `h` are pulled onto `ROWS_PER_MODULE`, so a block steps in
 * whole modules under the cursor and the guides `SectionFrame` draws describe
 * exactly where it will land.
 *
 * Both are constrained, which is what keeps a north-edge resize honest: RGL
 * derives the new `y` from the height delta, so an on-module `y` plus an
 * on-module `h` leaves both edges on the grid.
 *
 * At ROWS_PER_MODULE = 1 (a row IS the module) this is an identity beyond the
 * minimum-height clamp — it stays wired up so raising the module to a coarser
 * step is a one-constant change rather than a rewrite.
 */
export const moduleSnap: LayoutConstraint = {
  name: `moduleSnap(${ROWS_PER_MODULE})`,
  constrainPosition(_item, x, y) {
    return { x, y: snapRowOffset(y) };
  },
  constrainSize(_item, w, h) {
    return { w, h: snapRowSpan(h) };
  },
};

/**
 * Find the lowest empty row to drop a new block at, rounded up to the next
 * module boundary so an inserted block starts on the grid. Device-aware so a
 * mobile-mode insert doesn't collide with desktop layouts that have been
 * shifted in the merged view.
 */
export function nextFreeRow(
  blocks: Block[],
  device: Device = "desktop",
): number {
  if (blocks.length === 0) return 1;
  const lowest = Math.max(
    ...blocks.map((b) => {
      const layout =
        device === "mobile" ? mergeBlockForMobile(b).layout : b.layout;
      return (layout.row ?? 1) + (layout.rowSpan ?? 1);
    }),
  );
  // `fitRowSpan` on the 0-indexed offset rounds UP, so the new block never
  // overlaps the one above it the way a nearest-module round could.
  return fitRowSpan(lowest - 1) + 1;
}
