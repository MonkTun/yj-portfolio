"use client";

import { useCallback, useEffect, useState } from "react";
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
import {
  autoStackPage,
  autoStackSection,
  diffMobileLayout,
  pruneMobile,
  pruneSectionMobile,
  type Device,
} from "@/lib/responsive";
import type { SectionTemplate } from "@/lib/section-templates";
import { readClipboard, writeClipboard } from "@/lib/editor-clipboard";

import { Toolbar } from "./Toolbar";
import { Canvas } from "./Canvas";
import { PropertiesPanel } from "./PropertiesPanel";
import { LayersPanel } from "./LayersPanel";

const HISTORY_LIMIT = 50;
type Status = "idle" | "saving" | "saved" | "error";

export type Selection =
  | { type: "page" }
  | { type: "section"; sectionId: string }
  | {
      type: "block";
      sectionId: string;
      /** The anchor block — the one the properties panel edits. Always a
       *  member of `blockIds`. */
      blockId: string;
      /** Every selected block in this section, including `blockId`. Multi-
       *  select is scoped to a single section (the grid is per-section). */
      blockIds: string[];
    };

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

/** Build a single-block selection. */
function blockSel(sectionId: string, blockId: string): Selection {
  return { type: "block", sectionId, blockId, blockIds: [blockId] };
}

/**
 * Clone blocks with fresh ids, re-rowed to start at `baseRow` while keeping
 * their relative vertical offsets (so a multi-block paste/duplicate lands as
 * a coherent cluster, not a stack). Used by duplicate-many and paste.
 */
function cloneBlocksRebased(blocks: Block[], baseRow: number): Block[] {
  const minRow = Math.min(...blocks.map((b) => b.layout.row ?? 1));
  return blocks.map((b) => {
    const next = clone(b);
    next.id = newId("blk");
    next.layout = {
      ...next.layout,
      row: baseRow + ((next.layout.row ?? 1) - minRow),
    };
    return next;
  });
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
  const [device, setDevice] = useState<Device>("desktop");
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

  // Identity check, not serialization: every commit produces a fresh page
  // object, save() stores the exact object it posted, and undo/redo restore
  // the exact objects history captured — so reference equality tracks
  // dirtiness correctly without double-stringifying the whole page on every
  // keystroke-triggered render.
  const dirty = page !== savedPage;

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

  /**
   * Section patch — desktop edits the canonical fields, mobile edits the
   * section's `mobile` override bag (and prunes empty entries so saved
   * JSON stays minimal). The `patch` keys must align with their target
   * (e.g. `padding` lives at the top level on desktop, but inside `mobile`
   * on mobile).
   */
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

  /**
   * Patch the mobile override bag on a section. Pass `undefined` for a key
   * to clear that override (lets the desktop value show through).
   */
  const updateSectionMobile = useCallback(
    (
      sectionId: string,
      patch: {
        padding?: Section["padding"] | undefined;
        minHeight?: Section["minHeight"] | undefined;
        align?: Section["align"] | undefined;
      },
    ) => {
      const next = clone(page);
      const i = next.sections.findIndex((s) => s.id === sectionId);
      if (i === -1) return;
      const sec = next.sections[i];
      const currentMobile = sec.mobile ?? {};
      const mergedMobile = { ...currentMobile };
      // Apply each key — `undefined` means clear-and-inherit.
      for (const [k, v] of Object.entries(patch)) {
        if (v === undefined) delete (mergedMobile as Record<string, unknown>)[k];
        else (mergedMobile as Record<string, unknown>)[k] = v;
      }
      next.sections[i] = pruneSectionMobile({ ...sec, mobile: mergedMobile });
      commit(next);
    },
    [page, commit],
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

  /**
   * Patch a block's props at the active device. Desktop writes to
   * `block.props`; mobile writes a sparse override into `block.mobile.props`
   * and prunes the bag so empty overrides don't litter the JSON. A
   * `undefined` value means "remove this mobile override key".
   */
  const updateBlockProps = useCallback(
    (
      sectionId: string,
      blockId: string,
      patch: Record<string, unknown>,
      target: Device = device,
    ) => {
      // This is the properties panel's per-keystroke path, so it copies
      // only the mutated section/block spine instead of deep-cloning the
      // whole page. Untouched sections/blocks keep their identity (nothing
      // downstream ever mutates in place — every other op clones first).
      const sec = page.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      if (!sec.blocks.some((b) => b.id === blockId)) return;
      const next: Page = {
        ...page,
        sections: page.sections.map((s) => {
          if (s.id !== sectionId) return s;
          return {
            ...s,
            blocks: s.blocks.map((b) => {
              if (b.id !== blockId) return b;
              if (target === "desktop") {
                return {
                  ...b,
                  props: { ...b.props, ...patch },
                } as Block;
              }
              const currentMobile = b.mobile ?? {};
              const currentProps = currentMobile.props ?? {};
              const mergedProps: Record<string, unknown> = { ...currentProps };
              for (const [k, v] of Object.entries(patch)) {
                if (v === undefined) delete mergedProps[k];
                else mergedProps[k] = v;
              }
              return pruneMobile({
                ...b,
                mobile: { ...currentMobile, props: mergedProps },
              } as Block);
            }),
          };
        }),
      };
      commit(next);
    },
    [page, commit, device]
  );

  const setBlockMobileHidden = useCallback(
    (sectionId: string, blockId: string, hidden: boolean) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const block = sec.blocks.find((b) => b.id === blockId);
      if (!block) return;
      const idx = sec.blocks.findIndex((b) => b.id === blockId);
      sec.blocks[idx] = pruneMobile({
        ...block,
        mobile: {
          ...(block.mobile ?? {}),
          hidden: hidden ? true : undefined,
        },
      } as Block);
      commit(next);
    },
    [page, commit],
  );

  /**
   * Replace every block's mobile layout with a vertical-stack derived
   * from the desktop layout (top-to-bottom, then left-to-right reading
   * order). Optionally scoped to a single section. The Toolbar prompts
   * the user before calling because existing mobile layout overrides
   * are wiped.
   */
  const autoStackForMobile = useCallback(
    (sectionId?: string) => {
      const next = clone(page);
      if (sectionId) {
        const i = next.sections.findIndex((s) => s.id === sectionId);
        if (i === -1) return;
        next.sections[i] = autoStackSection(next.sections[i]);
      } else {
        Object.assign(next, autoStackPage(next));
      }
      commit(next);
    },
    [page, commit],
  );

  const clearBlockMobileOverrides = useCallback(
    (sectionId: string, blockId: string) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const idx = sec.blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return;
      const block = sec.blocks[idx];
      sec.blocks[idx] = { ...block, mobile: undefined } as Block;
      commit(next);
    },
    [page, commit],
  );

  const updateBlockLayout = useCallback(
    (
      sectionId: string,
      blockId: string,
      layout: BlockLayout,
      target: Device = device,
    ) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const block = sec.blocks.find((b) => b.id === blockId);
      if (!block) return;
      if (target === "desktop") {
        // Drags rebuild the layout from grid coords and don't carry `bleed`,
        // so preserve the existing bleed setting unless the caller set one.
        block.layout = { ...layout, bleed: layout.bleed ?? block.layout.bleed };
      } else {
        // Persist only what differs from desktop. If everything matches,
        // diff returns undefined and we drop the layout key entirely so
        // the block falls back to desktop placement.
        const patch = diffMobileLayout(block.layout, layout);
        const currentMobile = block.mobile ?? {};
        const idx = sec.blocks.findIndex((b) => b.id === blockId);
        sec.blocks[idx] = pruneMobile({
          ...block,
          mobile: { ...currentMobile, layout: patch },
        } as Block);
      }
      commit(next);
    },
    [page, commit, device]
  );

  const setBlockBleed = useCallback(
    (sectionId: string, blockId: string, bleed: BlockLayout["bleed"]) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const block = sec.blocks.find((b) => b.id === blockId);
      if (!block) return;
      block.layout = {
        ...block.layout,
        bleed: bleed && bleed !== "none" ? bleed : undefined,
      };
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
      // Always seed the desktop layout — a mobile-only block would be
      // invisible on desktop, which is confusing. nextFreeRow uses the
      // active-device merge so we don't collide with whatever the user
      // is actually looking at on the canvas.
      const layout: BlockLayout = {
        col: 1,
        colSpan: entry.defaultLayout.colSpan,
        row: nextFreeRow(targetSec.blocks, device),
        rowSpan: entry.defaultLayout.rowSpan,
      };
      const newBlock: Block = {
        id: newId("blk"),
        type,
        layout,
        // If the user is in mobile mode, also seed the same coordinates
        // as a mobile override so the block lands where they expect *and*
        // the desktop fallback isn't broken.
        ...(device === "mobile" ? { mobile: { layout } } : {}),
        props: defaultsForBlock(type),
      } as Block;
      targetSec.blocks.push(newBlock);
      commit(next);
      setSelection(blockSel(sectionId, newBlock.id));
    },
    [page, commit, findSection, device]
  );

  /**
   * Select a block. With `additive` (Shift / ⌘ / Ctrl-click) toggle it in
   * the current section's multi-selection; otherwise replace the selection.
   * Additive only extends a selection already rooted in the SAME section —
   * clicking into another section starts fresh there.
   */
  const selectBlock = useCallback(
    (sectionId: string, blockId: string, additive: boolean) => {
      setSelection((prev) => {
        if (!additive || prev.type !== "block" || prev.sectionId !== sectionId) {
          return blockSel(sectionId, blockId);
        }
        const set = new Set(prev.blockIds);
        if (set.has(blockId)) {
          set.delete(blockId);
          const remaining = [...set];
          // Removing the last block falls back to selecting the section.
          if (remaining.length === 0) return { type: "section", sectionId };
          // If we dropped the anchor, hand the role to whatever's left.
          const blockIdNext =
            prev.blockId === blockId
              ? remaining[remaining.length - 1]
              : prev.blockId;
          return { type: "block", sectionId, blockId: blockIdNext, blockIds: remaining };
        }
        // Newly added block becomes the anchor.
        return { type: "block", sectionId, blockId, blockIds: [...set, blockId] };
      });
    },
    [],
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
      setSelection(blockSel(sectionId, dup.id));
    },
    [page, commit]
  );

  /** Duplicate several blocks at once as one history step. The copies are
   *  appended below the section's content and become the new selection. */
  const duplicateBlocks = useCallback(
    (sectionId: string, blockIds: string[]) => {
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      const originals = sec.blocks.filter((b) => blockIds.includes(b.id));
      if (originals.length === 0) return;
      const dupes = cloneBlocksRebased(originals, nextFreeRow(sec.blocks));
      sec.blocks.push(...dupes);
      commit(next);
      setSelection({
        type: "block",
        sectionId,
        blockId: dupes[dupes.length - 1].id,
        blockIds: dupes.map((d) => d.id),
      });
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

  /** Delete several blocks at once as one history step. */
  const deleteBlocks = useCallback(
    (sectionId: string, blockIds: string[]) => {
      const ids = new Set(blockIds);
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === sectionId);
      if (!sec) return;
      sec.blocks = sec.blocks.filter((b) => !ids.has(b.id));
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
        const [block] = fromSec.blocks.splice(fromIdx, 1);
        const adjusted =
          fromIdx < targetIndex ? targetIndex - 1 : targetIndex;
        const insertAt = Math.max(0, Math.min(adjusted, fromSec.blocks.length));
        fromSec.blocks.splice(insertAt, 0, block);
      } else {
        const [block] = fromSec.blocks.splice(fromIdx, 1);
        block.layout = {
          ...block.layout,
          row: nextFreeRow(toSec.blocks, device),
        };
        const insertAt = Math.max(
          0,
          Math.min(targetIndex, toSec.blocks.length)
        );
        toSec.blocks.splice(insertAt, 0, block);
      }
      commit(next);
      setSelection(blockSel(toSectionId, blockId));
    },
    [page, commit, device]
  );

  /* ---------------- meta ---------------- */

  const updateMeta = useCallback(
    (meta: Page["meta"]) => commit({ ...page, meta }),
    [page, commit]
  );

  /* ---------------- clipboard ---------------- */

  /** Copy the current selection (block(s) or section) to the cross-page
   *  clipboard. Page-level selections have nothing to copy. */
  const copySelection = useCallback(() => {
    if (selection.type === "block") {
      const sec = page.sections.find((s) => s.id === selection.sectionId);
      if (!sec) return;
      // Preserve section order rather than click order so a paste reads
      // top-to-bottom the way the blocks were arranged.
      const ids = new Set(selection.blockIds);
      const blocks = sec.blocks.filter((b) => ids.has(b.id)).map(clone);
      if (blocks.length === 0) return;
      writeClipboard({ kind: "blocks", blocks });
    } else if (selection.type === "section") {
      const sec = page.sections.find((s) => s.id === selection.sectionId);
      if (!sec) return;
      writeClipboard({ kind: "section", section: clone(sec) });
    }
  }, [selection, page]);

  const cutSelection = useCallback(() => {
    copySelection();
    if (selection.type === "block") {
      deleteBlocks(selection.sectionId, selection.blockIds);
    } else if (selection.type === "section") {
      deleteSection(selection.sectionId);
    }
  }, [copySelection, selection, deleteBlocks, deleteSection]);

  /**
   * Paste the clipboard. Blocks land in the currently-targeted section (or
   * the last section if nothing block/section-level is selected); a section
   * is inserted right after the current one. Everything gets fresh ids.
   */
  const pasteClipboard = useCallback(() => {
    const data = readClipboard();
    if (!data) return;

    if (data.kind === "blocks") {
      const targetId =
        selection.type === "block" || selection.type === "section"
          ? selection.sectionId
          : page.sections[page.sections.length - 1]?.id;
      if (!targetId) return;
      const next = clone(page);
      const sec = next.sections.find((s) => s.id === targetId);
      if (!sec) return;
      const pasted = cloneBlocksRebased(data.blocks, nextFreeRow(sec.blocks));
      sec.blocks.push(...pasted);
      commit(next);
      setSelection({
        type: "block",
        sectionId: targetId,
        blockId: pasted[pasted.length - 1].id,
        blockIds: pasted.map((b) => b.id),
      });
      return;
    }

    const next = clone(page);
    const dup: Section = {
      ...clone(data.section),
      id: newId("sec"),
      blocks: data.section.blocks.map((b) => ({ ...clone(b), id: newId("blk") })),
    };
    let idx = next.sections.length;
    if (selection.type === "section" || selection.type === "block") {
      const i = next.sections.findIndex((s) => s.id === selection.sectionId);
      if (i !== -1) idx = i + 1;
    }
    next.sections.splice(idx, 0, dup);
    commit(next);
    setSelection({ type: "section", sectionId: dup.id });
  }, [selection, page, commit]);

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
      const target = e.target as HTMLElement | null;
      // Don't hijack keys while the user is typing in a field or editing
      // inline text — the browser's native copy/paste/delete belong there.
      const editing =
        !!target &&
        (target.isContentEditable ||
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT");

      const meta = e.metaKey || e.ctrlKey;

      // Delete / Backspace removes the current selection.
      if (!meta && (e.key === "Delete" || e.key === "Backspace")) {
        if (editing) return;
        if (selection.type === "block") {
          e.preventDefault();
          deleteBlocks(selection.sectionId, selection.blockIds);
        } else if (selection.type === "section") {
          e.preventDefault();
          deleteSection(selection.sectionId);
        }
        return;
      }

      if (!meta || editing) return;

      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        if (dirty && status !== "saving") void save();
      } else if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || key === "y") {
        e.preventDefault();
        redo();
      } else if (key === "c") {
        if (selection.type === "block" || selection.type === "section") {
          e.preventDefault();
          copySelection();
        }
      } else if (key === "x") {
        if (selection.type === "block" || selection.type === "section") {
          e.preventDefault();
          cutSelection();
        }
      } else if (key === "v") {
        e.preventDefault();
        pasteClipboard();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    dirty,
    save,
    undo,
    redo,
    status,
    selection,
    deleteBlocks,
    deleteSection,
    copySelection,
    cutSelection,
    pasteClipboard,
  ]);

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
        device={device}
        onDeviceChange={setDevice}
        onAutoStack={() => autoStackForMobile()}
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
            onSelectBlock={selectBlock}
            onReorderSections={reorderSections}
            onMoveBlock={moveBlock}
            onDeleteSection={deleteSection}
            onDeleteBlock={deleteBlock}
          />
        </aside>

        <Canvas
          page={page}
          selection={selection}
          device={device}
          onSelect={setSelection}
          onSelectBlock={selectBlock}
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
            device={device}
            availablePages={availablePages}
            currentSlug={slug}
            onUpdateMeta={updateMeta}
            onUpdateSection={updateSection}
            onUpdateSectionMobile={updateSectionMobile}
            onUpdateBlockProps={updateBlockProps}
            onSetBlockBleed={setBlockBleed}
            onSetBlockMobileHidden={setBlockMobileHidden}
            onClearBlockMobileOverrides={clearBlockMobileOverrides}
            onDuplicateBlocks={duplicateBlocks}
            onDeleteBlocks={deleteBlocks}
          />
        </aside>
      </div>
    </div>
  );
}
