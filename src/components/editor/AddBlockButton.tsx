"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { atomRegistry } from "@/lib/atom-registry";
import { useMirrorLibrary } from "@/components/MirrorLibraryContext";
import type { BlockType } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./icons";

type Props = {
  /** `props` seeds the new block on top of the registry defaults — used to
   *  spawn a mirror instance already pointed at a library source. */
  onAdd: (type: BlockType, props?: Record<string, unknown>) => void;
  visible: boolean;
};

/**
 * Floating "+ Add block" button that appears at the bottom-center of a
 * selected/hovered section. Click to open a glass picker with the atomic
 * block types, plus one entry per mirror in the site library — picking a
 * mirror spawns an instance of it. The picker renders in a body portal — the section and the
 * canvas device frame are both overflow-hidden, so an in-tree popover
 * opening upward gets clipped by the section boundary.
 */
export function AddBlockButton({ onAdd, visible }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const { mirrors } = useMirrorLibrary();
  // The bare "Mirror" type is only useful pointed at a source, so the grid
  // lists sources by name instead of the generic entry.
  const atomEntries = Object.values(atomRegistry).filter(
    (entry) => entry.type !== "mirror",
  );

  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const rect = ref.current?.getBoundingClientRect();
      if (!rect) return;
      setPos({
        left: rect.left + rect.width / 2,
        bottom: window.innerHeight - rect.top + 12,
      });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (ref.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "absolute bottom-3 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-200 pointer-events-auto",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="kicker glass-strong rounded-full h-9 px-4 flex items-center gap-2 text-foreground hover:text-accent transition-colors shadow-2xl"
      >
        <PlusIcon /> Add block
      </button>

      {open &&
        pos &&
        createPortal(
          <div
            ref={panelRef}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ left: pos.left, bottom: pos.bottom }}
            className="fixed -translate-x-1/2 z-100 bg-surface border border-border rounded-md p-2 w-72 shadow-2xl"
          >
          <p className="kicker px-2 pt-1 pb-2">Block type</p>
          <ul className="grid grid-cols-2 gap-1">
            {atomEntries.map((entry) => (
              <li key={entry.type}>
                <button
                  type="button"
                  onClick={() => {
                    onAdd(entry.type);
                    setOpen(false);
                  }}
                  className="w-full text-left px-2 py-2 rounded-sm hover:bg-foreground/10 group transition-colors"
                >
                  <span className="block text-sm text-foreground leading-tight">
                    {entry.label}
                  </span>
                  <span className="kicker text-foreground/40 group-hover:text-accent">
                    {entry.type}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="kicker px-2 pt-3 pb-2 border-t border-border mt-2">
            Mirrors
          </p>
          {mirrors.length === 0 ? (
            <p className="px-2 pb-1 text-xs text-foreground/40 italic">
              None yet — select a block and press “Make mirror” in the panel.
            </p>
          ) : (
            <ul className="grid grid-cols-2 gap-1">
              {mirrors.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onAdd("mirror", { mirrorId: m.id });
                      setOpen(false);
                    }}
                    className="w-full text-left px-2 py-2 rounded-sm hover:bg-foreground/10 group transition-colors"
                  >
                    <span className="block text-sm text-foreground leading-tight truncate">
                      {m.name}
                    </span>
                    <span className="kicker text-foreground/40 group-hover:text-accent">
                      mirror · {atomRegistry[m.source.type].label}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          </div>,
          document.body
        )}
    </div>
  );
}
