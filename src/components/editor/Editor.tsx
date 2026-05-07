"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import type {
  Block,
  BlockLayout,
  BlockType,
  Page,
  Section,
} from "@/lib/schema";
import { atomRegistry, defaultsForBlock } from "@/lib/atom-registry";
import { nextFreeRow } from "@/lib/rgl";
import type { SectionTemplate } from "@/lib/section-templates";

import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { LayersPanel } from "./LayersPanel";

const HISTORY_LIMIT = 50;
type Status = "idle" | "saving" | "saved" | "error";

export type Selection =
  | { type: "page" }
  | { type: "section"; sectionId: string }
  | { type: "block"; sectionId: string; blockId: string };

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

type Props = {
  slug: string;
  initialPage: Page;
  /** Other page slugs in the project — used by the Button block's link picker. */
  availablePages?: string[];
};

export function Editor({ slug, initialPage, availablePages = [] }: Props) {
  const router = useRouter();

  const [savedPage, setSavedPage] = useState<Page>(initialPage);
  const [page, setPage] = useState<Page>(initialPage);
  const [past, setPast] = useState<Page[]>([]);
  const [future, setFuture] = useState<Page[]>([]);
  const [selection, setSelection] = useState<Selection>({ type: "page" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string>();
  // dnd-kit generates announcer IDs from a counter that ticks differently
  // on the server vs. client when we mount multiple DndContexts in one tree
  // (LayersPanel + Canvas), causing hydration mismatches on the
  // aria-describedby attribute. Since the editor is admin-only and runs
  // entirely client-side anyway, we just defer the real render until after
  // mount and SSR a tiny placeholder.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const dirty = useMemo(
    () => JSON.stringify(page) !== JSON.stringify(savedPage),
    [page, savedPage]
  );

  /* ---------------- mutations + history ---------------- */

  const commit = useCallback(
    (next: Page) => {
      setPast((p) => {
        const out = [...p, page];
        if (out.length > HISTORY_LIMIT) out.shift();
        return out;
      });
      setFuture([]);
      setPage(next);
      if (status === "saved") setStatus("idle");
    },
    [page, status]
  );

  /* ---------------- section ops ---------------- */

  const updateSection = useCallback(
    (sectionId: string, patch: Partial<Section>) => {
      const next = clone(page);
      const i = next.sections.findIndex((s) => s.id === sectionId);
      if (i === -1) return;
      next.sections[i] = { ...next.sections[i], ...patch };
      commit(next);
    },
    [page, commit]
  );

  const addSection = useCallback(
    (template: SectionTemplate, atIndex?: number) => {
      const built = template.build();
      const sectionId = newId("sec");
      const newSection: Section = {
        id: sectionId,
        background: built.background,
        padding: built.padding,
        minHeight: built.minHeight,
        align: built.align,
        blocks: built.blocks.map((b) => ({
          ...b,
          id: newId("blk"),
        })) as Block[],
      };
      const next = clone(page);
      const idx = atIndex === undefined ? next.sections.length : atIndex;
      next.sections.splice(idx, 0, newSection);
      commit(next);
      setSelection({ type: "section", sectionId });
    },
    [page, commit]
  );

  const duplicateSection = useCallback(
    (sectionId: string) => {
      const i = page.sections.findIndex((s) => s.id === sectionId);
      if (i === -1) return;
      const next = clone(page);
      const orig = next.sections[i];
      const dup: Section = {
        ...clone(orig),
        id: newId("sec"),
        blocks: orig.blocks.map((b) => ({ ...clone(b), id: newId("blk") })),
      };
      next.sections.splice(i + 1, 0, dup);
      commit(next);
      setSelection({ type: "section", sectionId: dup.id });
    },
    [page, commit]
  );

  const deleteSection = useCallback(
    (sectionId: string) => {
      const next = clone(page);
      next.sections = next.sections.filter((s) => s.id !== sectionId);
      commit(next);
      setSelection({ type: "page" });
    },
    [page, commit]
  );

  const moveSection = useCallback(
    (sectionId: string, direction: -1 | 1) => {
      const next = clone(page);
      const i = next.sections.findIndex((s) => s.id === sectionId);
      const j = i + direction;
      if (i < 0 || j < 0 || j >= next.sections.length) return;
      [next.sections[i], next.sections[j]] = [next.sections[j], next.sections[i]];
      commit(next);
    },
    [page, commit]
  );

  const reorderSections = useCallback(
    (orderedIds: string[]) => {
      const next = clone(page);
      const byId = new Map(next.sections.map((s) => [s.id, s]));
      next.sections = orderedIds.map((id) => byId.get(id)!).filter(Boolean);
      commit(next);
    },
    [page, commit]
  );

  /* ---------------- block ops ---------------- */

  const findSection = (sectionId: string) =>
    page.sections.find((s) => s.id === sectionId);

  const updateBlockProps = useCallback(
    (sectionId: string, blockId: string, patch: Record<string, unknown>) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const block = sec.blocks.find((b) => b.id === blockId);
      if (!block) return;
      block.props = { ...block.props, ...patch } as Block["props"];
      commit(next);
    },
    [page, commit]
  );

  const updateBlockLayout = useCallback(
    (sectionId: string, blockId: string, layout: BlockLayout) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const block = sec.blocks.find((b) => b.id === blockId);
      if (!block) return;
      block.layout = layout;
      commit(next);
    },
    [page, commit]
  );

  const addBlock = useCallback(
    (sectionId: string, type: BlockType) => {
      const sec = findSection(sectionId);
      if (!sec) return;
      const entry = atomRegistry[type];
      const next = clone(page);
      const targetSec = next.sections.find((s) => s.id === sectionId)!;
      const newBlock: Block = {
        id: newId("blk"),
        type,
        layout: {
          col: 1,
          colSpan: entry.defaultLayout.colSpan,
          row: nextFreeRow(targetSec.blocks),
          rowSpan: entry.defaultLayout.rowSpan,
        },
        props: defaultsForBlock(type),
      } as Block;
      targetSec.blocks.push(newBlock);
      commit(next);
      setSelection({ type: "block", sectionId, blockId: newBlock.id });
    },
    [page, commit, findSection]
  );

  const duplicateBlock = useCallback(
    (sectionId: string, blockId: string) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const i = sec.blocks.findIndex((b) => b.id === blockId);
      if (i === -1) return;
      const dup = {
        ...clone(sec.blocks[i]),
        id: newId("blk"),
        layout: {
          ...sec.blocks[i].layout,
          row: nextFreeRow(sec.blocks),
        },
      };
      sec.blocks.splice(i + 1, 0, dup);
      commit(next);
      setSelection({ type: "block", sectionId, blockId: dup.id });
    },
    [page, commit]
  );

  const deleteBlock = useCallback(
    (sectionId: string, blockId: string) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      sec.blocks = sec.blocks.filter((b) => b.id !== blockId);
      commit(next);
      setSelection({ type: "section", sectionId });
    },
    [page, commit]
  );

  /**
   * Move a block to a position inside any section. Within the same section
   * this is a reorder; across sections we also reset the block's row to the
   * next free row in the destination so it doesn't overlap.
   */
  const moveBlock = useCallback(
    (
      fromSectionId: string,
      blockId: string,
      toSectionId: string,
      targetIndex: number
    ) => {
      const next = clone(page);
      const fromSec = next.sections.find((s) => s.id === fromSectionId);
      const toSec = next.sections.find((s) => s.id === toSectionId);
      if (!fromSec || !toSec) return;
      const fromIdx = fromSec.blocks.findIndex((b) => b.id === blockId);
      if (fromIdx === -1) return;

      if (fromSectionId === toSectionId) {
        // Same array — splice out, then splice in at the (shift-corrected) index.
        const [block] = fromSec.blocks.splice(fromIdx, 1);
        const adjusted =
          fromIdx < targetIndex ? targetIndex - 1 : targetIndex;
        const insertAt = Math.max(0, Math.min(adjusted, fromSec.blocks.length));
        fromSec.blocks.splice(insertAt, 0, block);
      } else {
        const [block] = fromSec.blocks.splice(fromIdx, 1);
        block.layout = {
          ...block.layout,
          row: nextFreeRow(toSec.blocks),
        };
        const insertAt = Math.max(
          0,
          Math.min(targetIndex, toSec.blocks.length)
        );
        toSec.blocks.splice(insertAt, 0, block);
      }
      commit(next);
      setSelection({ type: "block", sectionId: toSectionId, blockId });
    },
    [page, commit]
  );

  /* ---------------- meta ---------------- */

  const updateMeta = useCallback(
    (meta: Page["meta"]) => commit({ ...page, meta }),
    [page, commit]
  );

  /* ---------------- history ---------------- */

  const undo = useCallback(() => {
    setPast((prev) => {
      if (prev.length === 0) return prev;
      const previous = prev[prev.length - 1];
      setFuture((f) => [page, ...f]);
      setPage(previous);
      return prev.slice(0, -1);
    });
  }, [page]);

  const redo = useCallback(() => {
    setFuture((prev) => {
      if (prev.length === 0) return prev;
      const next = prev[0];
      setPast((p) => [...p, page]);
      setPage(next);
      return prev.slice(1);
    });
  }, [page]);

  /* ---------------- save ---------------- */

  const save = useCallback(async () => {
    setStatus("saving");
    setErrorMessage(undefined);
    try {
      const res = await fetch("/api/admin/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, page }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.detail ?? `HTTP ${res.status}`);
      }
      setSavedPage(page);
      setStatus("saved");
      router.refresh();
      setTimeout(
        () => setStatus((s) => (s === "saved" ? "idle" : s)),
        1500
      );
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [slug, page, router]);

  /* ---------------- keyboard ---------------- */

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      if (target?.isContentEditable) return; // let browser handle inside edit
      if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && status !== "saving") void save();
      } else if (e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (
        (e.key.toLowerCase() === "z" && e.shiftKey) ||
        e.key.toLowerCase() === "y"
      ) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, save, undo, redo, status]);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  /* ---------------- render ---------------- */

  if (!mounted) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="kicker text-foreground/50">Loading editor…</p>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <Toolbar
        slug={slug}
        dirty={dirty}
        status={status}
        errorMessage={errorMessage}
        canUndo={past.length > 0}
        canRedo={future.length > 0}
        // Preview deep-links to the current selection: a block id wins over a
        // section id; nothing for page-level. The public renderer puts the
        // matching id on each section/block.
        previewAnchor={
          selection.type === "block"
            ? selection.blockId
            : selection.type === "section"
              ? selection.sectionId
              : null
        }
        onUndo={undo}
        onRedo={redo}
        onSave={save}
      />

      <div className="flex-1 grid grid-cols-[260px_minmax(0,1fr)_360px] min-h-0">
        <aside className="glass-panel border-r border-border overflow-y-auto">
          <LayersPanel
            page={page}
            selection={selection}
            onSelect={setSelection}
            onReorderSections={reorderSections}
            onMoveBlock={moveBlock}
            onDeleteSection={deleteSection}
            onDeleteBlock={deleteBlock}
          />
        </aside>

        <Canvas
          page={page}
          selection={selection}
          onSelect={setSelection}
          onAddSection={addSection}
          onUpdateSection={updateSection}
          onDuplicateSection={duplicateSection}
          onDeleteSection={deleteSection}
          onMoveSection={moveSection}
          onReorderSections={reorderSections}
          onAddBlock={addBlock}
          onUpdateBlockProps={updateBlockProps}
          onUpdateBlockLayout={updateBlockLayout}
          onDuplicateBlock={duplicateBlock}
          onDeleteBlock={deleteBlock}
        />

        <aside className="glass-panel border-l border-border overflow-y-auto">
          <PropertiesPanel
            page={page}
            selection={selection}
            availablePages={availablePages}
            currentSlug={slug}
            onUpdateMeta={updateMeta}
            onUpdateSection={updateSection}
            onUpdateBlockProps={updateBlockProps}
          />
        </aside>
      </div>
    </div>
  );
}
