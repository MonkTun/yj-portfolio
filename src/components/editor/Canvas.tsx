"use client";

import { Fragment } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import type {
  BlockLayout,
  BlockType,
  Page,
  Section,
} from "@/lib/schema";
import type { SectionTemplate } from "@/lib/section-templates";

import { SectionFrame } from "./SectionFrame";
import { AddSectionInline } from "./SectionTemplatePicker";
import type { Selection } from "./Editor";

type Props = {
  page: Page;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onAddSection: (template: SectionTemplate, atIndex?: number) => void;
  onUpdateSection: (sectionId: string, patch: Partial<Section>) => void;
  onDuplicateSection: (sectionId: string) => void;
  onDeleteSection: (sectionId: string) => void;
  onMoveSection: (sectionId: string, direction: -1 | 1) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onAddBlock: (sectionId: string, type: BlockType) => void;
  onUpdateBlockProps: (
    sectionId: string,
    blockId: string,
    patch: Record<string, unknown>
  ) => void;
  onUpdateBlockLayout: (
    sectionId: string,
    blockId: string,
    layout: BlockLayout
  ) => void;
  onDuplicateBlock: (sectionId: string, blockId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
};

export function Canvas({
  page,
  selection,
  onSelect,
  onAddSection,
  onUpdateSection,
  onDuplicateSection,
  onDeleteSection,
  onMoveSection,
  onReorderSections,
  onAddBlock,
  onUpdateBlockProps,
  onUpdateBlockLayout,
  onDuplicateBlock,
  onDeleteBlock,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = page.sections.map((s) => s.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex === -1 || newIndex === -1) return;
    onReorderSections(arrayMove(ids, oldIndex, newIndex));
  }

  return (
    <div
      className="flex-1 min-w-0 overflow-y-auto bg-background"
      onClick={() => onSelect({ type: "page" })}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={page.sections.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <AddSectionInline onSelect={(tpl) => onAddSection(tpl, 0)} />
          {page.sections.map((section, i) => {
            const sectionActive =
              (selection.type === "section" &&
                selection.sectionId === section.id) ||
              (selection.type === "block" &&
                selection.sectionId === section.id);
            const selectedBlockId =
              selection.type === "block" &&
              selection.sectionId === section.id
                ? selection.blockId
                : null;

            return (
              <Fragment key={section.id}>
                <SectionFrame
                  section={section}
                  index={i}
                  total={page.sections.length}
                  selectedBlockId={selectedBlockId}
                  active={sectionActive}
                  onSelectSection={() =>
                    onSelect({ type: "section", sectionId: section.id })
                  }
                  onSelectBlock={(blockId) =>
                    onSelect({
                      type: "block",
                      sectionId: section.id,
                      blockId,
                    })
                  }
                  onUpdateSection={(patch) =>
                    onUpdateSection(section.id, patch)
                  }
                  onDuplicateSection={() => onDuplicateSection(section.id)}
                  onDeleteSection={() => onDeleteSection(section.id)}
                  onMoveSection={(dir) => onMoveSection(section.id, dir)}
                  onAddBlock={(type) => onAddBlock(section.id, type)}
                  onUpdateBlockProps={(blockId, patch) =>
                    onUpdateBlockProps(section.id, blockId, patch)
                  }
                  onUpdateBlockLayout={(blockId, layout) =>
                    onUpdateBlockLayout(section.id, blockId, layout)
                  }
                  onDuplicateBlock={(blockId) =>
                    onDuplicateBlock(section.id, blockId)
                  }
                  onDeleteBlock={(blockId) =>
                    onDeleteBlock(section.id, blockId)
                  }
                />
                <AddSectionInline
                  onSelect={(tpl) => onAddSection(tpl, i + 1)}
                />
              </Fragment>
            );
          })}
        </SortableContext>
      </DndContext>

      {page.sections.length === 0 && (
        <div className="h-[60vh] flex items-center justify-center pointer-events-none">
          <p className="text-foreground/40 italic">
            Empty page — click <span className="text-accent">+</span> above to
            insert a section.
          </p>
        </div>
      )}
    </div>
  );
}
