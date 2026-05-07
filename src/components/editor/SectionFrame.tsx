"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";

import type {
  Block,
  BlockLayout,
  BlockType,
  Section,
} from "@/lib/schema";
import {
  SECTION_ALIGN_CLASS,
  SECTION_MIN_HEIGHT_CLASS,
  SECTION_PADDING_CLASS,
  SectionImageBackground,
  SectionVideoBackground,
  sectionBackgroundStyle,
} from "@/components/SectionRenderer";
import { SectionReactBitsBackground } from "@/components/SectionReactBitsBackground";
import { cn } from "@/lib/utils";

import { SectionGrid } from "./SectionGrid";
import { SectionToolbar } from "./SectionToolbar";
import { AddBlockButton } from "./AddBlockButton";

type Props = {
  section: Section;
  index: number;
  total: number;
  selectedBlockId: string | null;
  active: boolean;
  onSelectSection: () => void;
  onSelectBlock: (blockId: string) => void;
  onUpdateSection: (patch: Partial<Section>) => void;
  onDuplicateSection: () => void;
  onDeleteSection: () => void;
  onMoveSection: (direction: -1 | 1) => void;
  onAddBlock: (type: BlockType) => void;
  onUpdateBlockProps: (blockId: string, patch: Record<string, unknown>) => void;
  onUpdateBlockLayout: (blockId: string, layout: BlockLayout) => void;
  onDuplicateBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
};

export function SectionFrame({
  section,
  index,
  total,
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

  const { className: bgClass } = sectionBackgroundStyle(section.background);

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
        className={cn(
          "relative w-full flex overflow-hidden",
          SECTION_PADDING_CLASS[section.padding],
          SECTION_MIN_HEIGHT_CLASS[section.minHeight],
          SECTION_ALIGN_CLASS[section.align],
          bgClass,
          // outline behaviour matches blocks: thin on hover, accent on select
          active
            ? "outline-2 outline-accent"
            : "outline-1 outline-transparent group-hover/section:outline-foreground/15"
        )}
      >
        <SectionImageBackground bg={section.background} />
        <SectionVideoBackground bg={section.background} />
        <SectionReactBitsBackground bg={section.background} />

        <div className="relative w-full max-w-7xl mx-auto px-6 md:px-10">
          {/* 12-col grid guide — appears whenever this section is the focus
              so the user understands where blocks snap. Sits behind the
              actual grid at z-0; SectionGrid renders on top. */}
          {active && (
            <div
              aria-hidden
              className="absolute inset-0 px-6 md:px-10 pointer-events-none z-0"
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
              selectedBlockId={selectedBlockId}
              active={active}
              onSelectBlock={onSelectBlock}
              onUpdateBlockProps={onUpdateBlockProps}
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
