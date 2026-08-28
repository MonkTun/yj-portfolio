"use client";

import { createContext, useContext } from "react";
import type { TagDef } from "@/lib/schema";

/**
 * Project-wide tag library (name → pill color), sourced from
 * content/site.json. The public renderer provides the deploy-frozen list
 * (PageRenderer); the editor provides its live working copy so a color
 * edit previews instantly on the canvas. The Tags atom resolves its
 * stored names against this.
 */
const TagLibraryContext = createContext<TagDef[]>([]);

export function TagLibraryProvider({
  tags,
  children,
}: {
  tags: TagDef[];
  children: React.ReactNode;
}) {
  return (
    <TagLibraryContext.Provider value={tags}>
      {children}
    </TagLibraryContext.Provider>
  );
}

export function useTagLibrary(): TagDef[] {
  return useContext(TagLibraryContext);
}
