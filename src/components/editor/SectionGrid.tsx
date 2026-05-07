"use client";

import { useMemo } from "react";
import GridLayout, {
  useContainerWidth,
  type Layout,
  type LayoutItem,
} from "react-grid-layout";
// noOverlapCompactor lives in the `core` entry, not the main one.
import { noOverlapCompactor } from "react-grid-layout/core";

import type { Block, BlockLayout, Section } from "@/lib/schema";
import { atomRegistry } from "@/lib/atom-registry";
import { blockToLayoutItem, layoutItemToBlockLayout } from "@/lib/rgl";
import { cn } from "@/lib/utils";
import { EditProvider } from "@/components/EditContext";

import { BlockToolbar } from "./BlockToolbar";

const ROW_HEIGHT_PX = 8;

type Props = {
  section: Section;
  selectedBlockId: string | null;
  /** True when this section (or one of its blocks) is the editor focus. */
  active: boolean;
  onSelectBlock: (blockId: string) => void;
  onUpdateBlockProps: (blockId: string, patch: Record<string, unknown>) => void;
  onUpdateBlockLayout: (blockId: string, layout: BlockLayout) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
};

export function SectionGrid({
  section,
  selectedBlockId,
  active,
  onSelectBlock,
  onUpdateBlockProps,
  onUpdateBlockLayout,
  onDuplicateBlock,
  onDeleteBlock,
}: Props) {
  // Only the selected block is resizable — that way the 8 resize grips
  // mount only on the focused block, not on every block in the section.
  // Drag stays available on every block via its toolbar move icon.
  const layout = useMemo(
    () =>
      section.blocks.map((b) => ({
        ...blockToLayoutItem(b),
        isResizable: b.id === selectedBlockId,
      })),
    [section.blocks, selectedBlockId]
  );

  // useContainerWidth replaces the v1 `WidthProvider` HOC. It measures the
  // wrapper div and returns its width — required since GridLayout needs an
  // explicit pixel width to map the 12-col grid to.
  const { width, containerRef, mounted } = useContainerWidth({
    initialWidth: 1024,
  });

  function commitLayout(newLayout: Layout) {
    for (const item of newLayout as readonly LayoutItem[]) {
      const block = section.blocks.find((b) => b.id === item.i);
      if (!block) continue;
      const existing = blockToLayoutItem(block);
      if (
        existing.x !== item.x ||
        existing.y !== item.y ||
        existing.w !== item.w ||
        existing.h !== item.h
      ) {
        onUpdateBlockLayout(item.i, layoutItemToBlockLayout(item));
      }
    }
  }

  return (
    <div ref={containerRef} className="w-full">
      {mounted && (
        <GridLayout
          className="layout w-full"
          width={width}
          layout={layout}
          gridConfig={{
            cols: 12,
            rowHeight: ROW_HEIGHT_PX,
            margin: [16, 0],
            containerPadding: [0, 0],
            maxRows: Infinity,
          }}
          dragConfig={{
            enabled: true,
            bounded: false,
            // Whole block is the drag target. Cancel selectors stop drag
            // when the user is interacting with the toolbar or editing text.
            handle: ".rgl-handle",
            cancel: "[data-no-drag], [contenteditable='true']",
            threshold: 4,
          }}
          resizeConfig={{
            // No "n" handle — the top edge is reserved for the centered
            // move pill in BlockToolbar.
            enabled: true,
            handles: ["s", "e", "w", "se", "sw", "ne", "nw"],
          }}
          // `noOverlapCompactor` = no auto-compaction AND allowOverlap:true.
          // Blocks stay where you drop them; dragging one onto another stacks
          // them instead of pushing the other away.
          compactor={noOverlapCompactor}
          onDragStop={(l) => commitLayout(l)}
          onResizeStop={(l) => commitLayout(l)}
        >
          {section.blocks.map((block) => (
            <div
              key={block.id}
              className={cn(
                "group/block",
                block.id === selectedBlockId && "is-selected"
              )}
            >
              <CanvasBlock
                block={block}
                selected={block.id === selectedBlockId}
                sectionActive={active}
                onSelect={() => onSelectBlock(block.id)}
                onUpdateProps={(patch) => onUpdateBlockProps(block.id, patch)}
                onDuplicate={() => onDuplicateBlock(block.id)}
                onDelete={() => onDeleteBlock(block.id)}
              />
            </div>
          ))}
        </GridLayout>
      )}
    </div>
  );
}

/* ---------------- the block, inside an RGL grid item ---------------- */

type CanvasBlockProps = {
  block: Block;
  selected: boolean;
  sectionActive: boolean;
  onSelect: () => void;
  onUpdateProps: (patch: Record<string, unknown>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
};

function CanvasBlock({
  block,
  selected,
  sectionActive,
  onSelect,
  onUpdateProps,
  onDuplicate,
  onDelete,
}: CanvasBlockProps) {
  const entry = atomRegistry[block.type];
  const Component = entry.component;

  // EditContext bound to this block. Atom components read this to know
  // they're in editor mode (interactive) and to push prop updates back.
  const ctxValue = useMemo(
    () => ({
      blockId: block.id,
      block,
      selected,
      updateProps: onUpdateProps,
    }),
    [block, selected, onUpdateProps]
  );

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={cn(
        "relative h-full w-full transition-colors rounded-sm",
        selected
          ? "outline-2 outline-accent"
          : "outline-1 outline-transparent group-hover/block:outline-foreground/20"
      )}
    >
      <div className="h-full w-full pointer-events-none">
        <EditProvider value={ctxValue}>
          <Component {...(block.props as object)} />
        </EditProvider>
      </div>
      <BlockToolbar
        // Toolbar appears only when this specific block is selected — not
        // when its parent section is selected. Hover discovery is handled
        // by the outline below.
        visible={selected}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
      />
    </div>
  );
}
