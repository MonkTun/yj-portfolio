"use client";

import { createContext, useContext } from "react";
import type { Block } from "@/lib/schema";
import type { Device } from "@/lib/responsive";

/**
 * Provided by the editor canvas around every block. Atom components read
 * this to know whether they're being rendered in the editor (interactive)
 * or on the public site (plain output). The provider is absent on the
 * public site, so `useEdit()` returns null there.
 */
export type EditCtxValue = {
  blockId: string;
  block: Block;
  selected: boolean;
  /** Active device — `mobile` means edits scope to `block.mobile.*`. */
  device: Device;
  /** Patch the block's props (merged onto current props for the active
   *  device). */
  updateProps: (patch: Record<string, unknown>) => void;
  /**
   * Patch a prop that should always live on desktop (`block.props`),
   * even when the editor is in mobile mode. Used by inline content
   * editing (Text atom's contentEditable) — copy lives on desktop, only
   * style/layout overrides scope per-breakpoint.
   */
  updateDesktopProps: (patch: Record<string, unknown>) => void;
};

const Ctx = createContext<EditCtxValue | null>(null);
export const EditProvider = Ctx.Provider;
export function useEdit() {
  return useContext(Ctx);
}
