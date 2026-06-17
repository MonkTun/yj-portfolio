import type { Block, Section } from "@/lib/schema";

/**
 * Editor copy/paste clipboard. Backed by `localStorage` rather than an
 * in-memory ref so a copy survives navigation between pages in the admin —
 * copy a block on one page, paste it on another. The system clipboard is
 * deliberately not used: it's async, permission-gated, and can't round-trip
 * our structured block/section payloads without lossy serialization.
 */

const KEY = "yj-editor-clipboard";

export type EditorClipboard =
  | { kind: "blocks"; blocks: Block[] }
  | { kind: "section"; section: Section };

export function writeClipboard(data: EditorClipboard): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // localStorage can throw (private mode, quota, disabled). Copy is
    // best-effort — a failed write just means the next paste is a no-op.
  }
}

export function readClipboard(): EditorClipboard | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EditorClipboard;
    if (parsed?.kind === "blocks" && Array.isArray(parsed.blocks)) {
      return parsed.blocks.length > 0 ? parsed : null;
    }
    if (parsed?.kind === "section" && parsed.section) return parsed;
    return null;
  } catch {
    return null;
  }
}
