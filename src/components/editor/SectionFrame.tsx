"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";

import type {
  BlockLayout,
  BlockType,
  Section,
} from "@/lib/schema";
import {
  SectionImageBackground,
  sectionBackgroundStyle,
  sectionEditorClasses,
} from "@/components/SectionRenderer";
import { SectionReactBitsBackground } from "@/components/SectionReactBitsBackground";
import { SectionVideoBackground } from "@/components/SectionVideoBackground";
import { mergeSectionForMobile, type Device } from "@/lib/responsive";
import { cn } from "@/lib/utils";

import { SectionGrid } from "./SectionGrid";
import { SectionToolbar } from "./SectionToolbar";
import { AddBlockButton } from "./AddBlockButton";

type Props = {
  section: Section;
  index: number;
  total: number;
  device: Device;
  selectedBlockId: string | null;
  active: boolean;
  onSelectSection: () => void;
  onSelectBlock: (blockId: string) => void;
  onUpdateSection: (patch: Partial<Section>) => void;
  onDuplicateSection: () => void;
  onDeleteSection: () => void;
  onMoveSection: (direction: -1 | 1) => void;
  onAddBlock: (type: BlockType) => void;
  onUpdateBlockProps: (
    blockId: string,
    patch: Record<string, unknown>,
    target?: Device,
  ) => void;
  onUpdateBlockLayout: (blockId: string, layout: BlockLayout) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
};

export function SectionFrame({
  section,
  index,
  total,
  device,
  selectedBlockId,
  active,
  onSelectSection,
  onSelectBlock,
  onUpdateSection,
  onDuplicateSection,
  onDeleteSection,
  onMoveSection,
  onAddBlock,
  onUpdateBlockProps,
  onUpdateBlockLayout,
  onDuplicateBlock,
  onDeleteBlock,
}: Props) {
  const { setNodeRef, transform, transition, isDragging, listeners, attributes } =
    useSortable({ id: section.id });

  const sortableStyle: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const {
    className: bgClass,
    style: bgStyle,
    innerStyle: bgInnerStyle,
  } = sectionBackgroundStyle(section.background);

  // Mobile mode renders the merged section so padding/minHeight/align
  // overrides preview accurately on the canvas.
  const visualSection =
    device === "mobile" ? mergeSectionForMobile(section) : section;

  return (
    <div
      ref={setNodeRef}
      style={sortableStyle}
      className="relative group/section"
    >
      <section
        onClick={(e) => {
          e.stopPropagation();
          onSelectSection();
        }}
        style={bgStyle}
        className={cn(
          "relative w-full flex overflow-hidden",
          sectionEditorClasses(visualSection, device),
          bgClass,
          active
            ? "outline-2 outline-accent"
            : "outline-1 outline-transparent group-hover/section:outline-foreground/15"
        )}
      >
        <SectionImageBackground bg={section.background} />
        <SectionVideoBackground bg={section.background} />
        <SectionReactBitsBackground bg={section.background} />

        <div
          className={cn(
            "relative w-full max-w-7xl mx-auto",
            // The 425px mobile canvas is too narrow for `md:px-10`; drop to
            // a phone-tight gutter so blocks have realistic horizontal room.
            device === "mobile" ? "px-4" : "px-6 md:px-10",
          )}
          style={bgInnerStyle}
        >
          {/* 12-col grid guide — appears whenever this section is the focus
              so the user understands where blocks snap. Sits behind the
              actual grid at z-0; SectionGrid renders on top. */}
          {active && (
            <div
              aria-hidden
              className={cn(
                "absolute inset-0 pointer-events-none z-0",
                device === "mobile" ? "px-4" : "px-6 md:px-10",
              )}
            >
              <div className="relative h-full w-full grid grid-cols-12 gap-x-4">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="border-l border-r border-dashed border-accent/20"
                  />
                ))}
              </div>
            </div>
          )}

          <div className="relative z-10">
            <SectionGrid
              section={section}
              device={device}
              selectedBlockId={selectedBlockId}
              onSelectBlock={onSelectBlock}
              onUpdateBlockProps={(blockId, patch, target) =>
                onUpdateBlockProps(blockId, patch, target)
              }
              onUpdateBlockLayout={onUpdateBlockLayout}
              onDuplicateBlock={onDuplicateBlock}
              onDeleteBlock={onDeleteBlock}
            />

            {section.blocks.length === 0 && (
              <div className="h-32 flex items-center justify-center text-foreground/40 italic">
                Empty section — click <span className="mx-1">+</span> to add a
                block
              </div>
            )}
          </div>
        </div>

        {/* Section drag handle for vertical reordering — uses dnd-kit, sits
            on the LEFT edge to avoid colliding with the section toolbar. */}
        <button
          type="button"
          {...attributes}
          {...(listeners ?? {})}
          aria-label="Drag section to reorder"
          className={cn(
            "absolute top-3 left-3 z-30 glass-strong rounded-sm h-8 px-2 flex items-center kicker text-foreground/85 cursor-grab active:cursor-grabbing transition-opacity",
            active ? "opacity-100" : "opacity-0 group-hover/section:opacity-100"
          )}
        >
          ⋮⋮ §{index + 1}
        </button>

        <SectionToolbar
          section={section}
          active={active}
          canMoveUp={index > 0}
          canMoveDown={index < total - 1}
          onUpdate={onUpdateSection}
          onDuplicate={onDuplicateSection}
          onDelete={onDeleteSection}
          onMoveUp={() => onMoveSection(-1)}
          onMoveDown={() => onMoveSection(1)}
        />

        <AddBlockButton
          onAdd={onAddBlock}
          visible={active}
        />
      </section>
    </div>
  );
}
