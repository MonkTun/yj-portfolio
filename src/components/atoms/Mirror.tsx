"use client";

import { useMemo } from "react";

import type { Block, MirrorProps } from "@/lib/schema";
import { atomRegistry } from "@/lib/atom-registry";
import { EditProvider, useEdit } from "@/components/EditContext";
import {
  findMirror,
  useMirrorLibrary,
} from "@/components/MirrorLibraryContext";

/**
 * Mirror instance — renders the source block a `MirrorDef` holds, looked up
 * by id in the mirror library. Nothing about the source is copied into the
 * page JSON, so editing the source (from any instance, on any page) changes
 * every placement at once.
 *
 * In the editor the source atom is re-wrapped in an EditProvider whose
 * update functions write to the mirror library instead of this instance's
 * own props — so inline edits (a mirrored Text's contentEditable) land on
 * the source too, and `mirrorId` never gets clobbered by a source prop.
 *
 * Imports `atomRegistry` (which imports this file) — a deliberate cycle that
 * is safe because the registry is only read at render time, never at module
 * evaluation.
 */
export function Mirror({ mirrorId }: MirrorProps) {
  const { mirrors, updateMirrorProps } = useMirrorLibrary();
  const edit = useEdit();
  const def = findMirror(mirrors, mirrorId);

  const ctxValue = useMemo(() => {
    if (!edit || !def) return null;
    const patchSource = (patch: Record<string, unknown>) =>
      updateMirrorProps?.(def.id, patch);
    return {
      ...edit,
      block: {
        ...edit.block,
        type: def.source.type,
        props: def.source.props,
      } as Block,
      updateProps: patchSource,
      updateDesktopProps: patchSource,
    };
  }, [edit, def, updateMirrorProps]);

  if (!def) {
    // Public site: an unlinked mirror renders nothing rather than a broken
    // frame. Editor: show what's wrong so it can be re-pointed in the panel.
    if (!edit) return null;
    return (
      <div className="flex h-full min-h-10 w-full items-center justify-center rounded-sm border border-dashed border-border bg-surface/40 px-3">
        <span className="kicker text-foreground/40 italic text-center">
          {mirrorId
            ? `Mirror source "${mirrorId}" no longer exists — pick another in the panel`
            : "Mirror — pick a source in the panel"}
        </span>
      </div>
    );
  }

  const Source = atomRegistry[def.source.type].component;
  const rendered = <Source {...(def.source.props as object)} />;
  if (!ctxValue) return rendered;
  return <EditProvider value={ctxValue}>{rendered}</EditProvider>;
}
