import type { LayoutItem } from "react-grid-layout";
import type { Block, BlockLayout } from "@/lib/schema";
import { mergeBlockForMobile, type Device } from "@/lib/responsive";

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
 * Find the lowest empty row to drop a new block at. Device-aware so a
 * mobile-mode insert doesn't collide with desktop layouts that have been
 * shifted in the merged view.
 */
export function nextFreeRow(
  blocks: Block[],
  device: Device = "desktop",
): number {
  if (blocks.length === 0) return 1;
  return Math.max(
    ...blocks.map((b) => {
      const layout =
        device === "mobile" ? mergeBlockForMobile(b).layout : b.layout;
      return (layout.row ?? 1) + (layout.rowSpan ?? 1);
    }),
  );
}
