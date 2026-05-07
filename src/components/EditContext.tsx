"use client";

import { createContext, useContext } from "react";
import type { Block } from "@/lib/schema";

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
  /** Patch the block's props (merged onto current props). */
  updateProps: (patch: Record<string, unknown>) => void;
};

const Ctx = createContext<EditCtxValue | null>(null);
export const EditProvider = Ctx.Provider;
export function useEdit() {
  return useContext(Ctx);
}
