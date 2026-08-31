"use client";

import { createContext, useContext } from "react";
import type { MirrorDef } from "@/lib/schema";

/**
 * Site-wide mirror library (content/site.json `mirrors`) — the sources that
 * `mirror` instances render. Same shape of arrangement as the tag library:
 * the public renderer provides the deploy-frozen list (PageRenderer), the
 * editor provides its live working copy plus an updater so editing any
 * instance on the canvas (inline text, panel fields) writes through to the
 * source and every other instance re-renders immediately.
 */
export type MirrorLibraryValue = {
  mirrors: MirrorDef[];
  /** Editor only — patch a source's props. Absent on the public site. */
  updateMirrorProps?: (id: string, patch: Record<string, unknown>) => void;
};

const MirrorLibraryContext = createContext<MirrorLibraryValue>({ mirrors: [] });

export function MirrorLibraryProvider({
  value,
  children,
}: {
  value: MirrorLibraryValue;
  children: React.ReactNode;
}) {
  return (
    <MirrorLibraryContext.Provider value={value}>
      {children}
    </MirrorLibraryContext.Provider>
  );
}

export function useMirrorLibrary(): MirrorLibraryValue {
  return useContext(MirrorLibraryContext);
}

export function findMirror(
  mirrors: MirrorDef[],
  id: string,
): MirrorDef | undefined {
  return id ? mirrors.find((m) => m.id === id) : undefined;
}
