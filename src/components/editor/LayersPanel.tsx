"use client";

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
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Block, Page, Section } from "@/lib/schema";
import { atomRegistry } from "@/lib/atom-registry";
import { cn } from "@/lib/utils";
import { TrashIcon } from "./icons";
import type { Selection } from "./Editor";

type Props = {
  page: Page;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onReorderSections: (orderedIds: string[]) => void;
  onMoveBlock: (
    fromSectionId: string,
    blockId: string,
    toSectionId: string,
    targetIndex: number
  ) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
};

/**
 * Layers panel — Figma/Photoshop-style outline. Sections are sortable
 * top-level items. Blocks inside each section are sortable AND can be
 * dragged across sections (cross-container DnD).
 *
 * All sections always render their block lists so every container is a
 * valid drop target — even an empty section receives drops via its own
 * SortableContext.
 */
export function LayersPanel({
  page,
  selection,
  onSelect,
  onReorderSections,
  onMoveBlock,
  onDeleteSection,
  onDeleteBlock,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current as
      | { type: "section" | "block"; sectionId?: string }
      | undefined;
    const overData = over.data.current as
      | { type: "section" | "block"; sectionId?: string }
      | undefined;

    // ---------- section reorder ----------
    if (activeData?.type === "section" && overData?.type === "section") {
      if (active.id === over.id) return;
      const ids = page.sections.map((s) => s.id);
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      if (oldIndex === -1 || newIndex === -1) return;
      onReorderSections(arrayMove(ids, oldIndex, newIndex));
      return;
    }

    // ---------- block move/reorder ----------
    if (activeData?.type === "block") {
      const fromSectionId = activeData.sectionId;
      if (!fromSectionId) return;

      // Dropping on another block — insert at that block's index in its
      // section (could be the same section as a reorder, or a different
      // section as a cross-container move).
      if (overData?.type === "block") {
        const toSectionId = overData.sectionId;
        if (!toSectionId) return;
        if (active.id === over.id) return;
        const toSection = page.sections.find((s) => s.id === toSectionId);
        if (!toSection) return;
        const targetIndex = toSection.blocks.findIndex(
          (b) => b.id === over.id
        );
        if (targetIndex === -1) return;
        onMoveBlock(
          fromSectionId,
          String(active.id),
          toSectionId,
          targetIndex
        );
        return;
      }

      // Dropping on a section header — append to the end of that section.
      if (overData?.type === "section") {
        const toSectionId = String(over.id);
        const toSection = page.sections.find((s) => s.id === toSectionId);
        if (!toSection) return;
        onMoveBlock(
          fromSectionId,
          String(active.id),
          toSectionId,
          toSection.blocks.length
        );
        return;
      }
    }
  }

  return (
    <div className="p-3">
      <button
        type="button"
        onClick={() => onSelect({ type: "page" })}
        className={cn(
          "w-full text-left px-2 py-2 rounded-sm transition-colors mb-2",
          selection.type === "page"
            ? "bg-accent text-accent-foreground"
            : "hover:bg-foreground/5"
        )}
      >
        <p className="kicker">Page</p>
        <p className="text-sm">{page.meta.title}</p>
      </button>

      <p className="kicker px-2 py-1 text-foreground/50">Sections</p>

      {page.sections.length === 0 ? (
        <p className="kicker px-2 py-3 text-foreground/40 italic">
          No sections.
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={page.sections.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-0.5">
              {page.sections.map((section, i) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  index={i}
                  selection={selection}
                  onSelect={onSelect}
                  onDeleteSection={onDeleteSection}
                  onDeleteBlock={onDeleteBlock}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

function SectionRow({
  section,
  index,
  selection,
  onSelect,
  onDeleteSection,
  onDeleteBlock,
}: {
  section: Section;
  index: number;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onDeleteSection: (sectionId: string) => void;
  onDeleteBlock: (sectionId: string, blockId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: section.id,
      data: { type: "section" },
    });

  const sectionSelected =
    selection.type === "section" && selection.sectionId === section.id;

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
      }}
    >
      <div
        className={cn(
          "flex items-center gap-1 rounded-sm transition-colors",
          sectionSelected
            ? "bg-accent text-accent-foreground"
            : "hover:bg-foreground/5"
        )}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="px-2 py-2 cursor-grab active:cursor-grabbing text-current/50 hover:text-current"
          title="Drag to reorder section"
        >
          ⋮⋮
        </button>
        <button
          type="button"
          onClick={() => onSelect({ type: "section", sectionId: section.id })}
          className="flex-1 text-left py-2 pr-2"
        >
          <span className="block text-sm">§ {index + 1}</span>
          <span className="kicker text-current/50">
            {section.blocks.length} block
            {section.blocks.length === 1 ? "" : "s"}
          </span>
        </button>
        <button
          type="button"
          onClick={() => onDeleteSection(section.id)}
          className="px-2 py-2 text-current/50 hover:text-accent transition-colors"
          title="Delete section"
        >
          <TrashIcon />
        </button>
      </div>

      <SortableContext
        items={section.blocks.map((b) => b.id)}
        strategy={verticalListSortingStrategy}
      >
        <ul
          className={cn(
            "ml-3 pl-3 border-l border-border space-y-0.5 my-1",
            // A min-height keeps the empty list's drop target tappable.
            section.blocks.length === 0 && "min-h-6"
          )}
        >
          {section.blocks.map((block) => (
            <BlockRow
              key={block.id}
              section={section}
              block={block}
              selection={selection}
              onSelect={onSelect}
              onDelete={() => onDeleteBlock(section.id, block.id)}
            />
          ))}
          {section.blocks.length === 0 && (
            <li className="kicker text-foreground/30 italic px-2 py-1">
              empty
            </li>
          )}
        </ul>
      </SortableContext>
    </li>
  );
}

function BlockRow({
  section,
  block,
  selection,
  onSelect,
  onDelete,
}: {
  section: Section;
  block: Block;
  selection: Selection;
  onSelect: (sel: Selection) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: block.id,
      data: { type: "block", sectionId: section.id },
    });

  const blockSelected =
    selection.type === "block" &&
    selection.sectionId === section.id &&
    selection.blockId === block.id;
  const entry = atomRegistry[block.type];

  return (
    <li
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      className={cn(
        "flex items-center gap-1 rounded-sm transition-colors",
        blockSelected
          ? "bg-accent text-accent-foreground"
          : "hover:bg-foreground/5"
      )}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="px-1.5 py-1.5 cursor-grab active:cursor-grabbing text-current/40 hover:text-current"
        title="Drag to move block"
      >
        ⋮⋮
      </button>
      <button
        type="button"
        onClick={() =>
          onSelect({
            type: "block",
            sectionId: section.id,
            blockId: block.id,
          })
        }
        className="flex-1 text-left py-1.5 pr-2 truncate"
      >
        <span className="block text-xs">{entry.label}</span>
      </button>
      <button
        type="button"
        onClick={onDelete}
        className="px-2 py-1 text-current/50 hover:text-accent transition-colors"
        title="Delete block"
      >
        <TrashIcon />
      </button>
    </li>
  );
}
