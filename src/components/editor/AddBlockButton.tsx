"use client";

import { useEffect, useRef, useState } from "react";
import { atomRegistry } from "@/lib/atom-registry";
import type { BlockType } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./icons";

type Props = {
  onAdd: (type: BlockType) => void;
  visible: boolean;
};

/**
 * Floating "+ Add block" button that appears at the bottom-center of a
 * selected/hovered section. Click to open a glass picker with the atomic
 * block types.
 */
export function AddBlockButton({ onAdd, visible }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
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

      {open && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 z-40 bg-surface border border-border rounded-md p-2 w-72 shadow-2xl">
          <p className="kicker px-2 pt-1 pb-2">Block type</p>
          <ul className="grid grid-cols-2 gap-1">
            {Object.values(atomRegistry).map((entry) => (
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
        </div>
      )}
    </div>
  );
}
