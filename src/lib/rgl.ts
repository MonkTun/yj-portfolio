import type { LayoutItem } from "react-grid-layout";
import type { Block, BlockLayout } from "@/lib/schema";

/**
 * react-grid-layout uses 0-indexed coordinates; we keep our schema
 * 1-indexed for human authoring of JSON. Conversions happen here so
 * everything else can talk in human coords.
 */

export function blockToLayoutItem(block: Block): LayoutItem {
  return {
    i: block.id,
    x: block.layout.col - 1,
    y: (block.layout.row ?? 1) - 1,
    w: block.layout.colSpan,
    h: block.layout.rowSpan ?? 4,
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

/** Find the lowest empty row to drop a new block at. */
export function nextFreeRow(blocks: Block[]): number {
  if (blocks.length === 0) return 1;
  return (
    Math.max(
      ...blocks.map(
        (b) => (b.layout.row ?? 1) + (b.layout.rowSpan ?? 1)
      )
    )
  );
}
