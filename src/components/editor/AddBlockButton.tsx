"use client";

import { useState } from "react";
import { atomRegistry } from "@/lib/atom-registry";
import { useMirrorLibrary } from "@/components/MirrorLibraryContext";
import type { BlockType } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./icons";
import { Modal } from "./Modal";

type Props = {
  /** `props` seeds the new block on top of the registry defaults — used to
   *  spawn a mirror instance already pointed at a library source. */
  onAdd: (type: BlockType, props?: Record<string, unknown>) => void;
  visible: boolean;
};

const pickCls =
  "w-full text-left px-2 py-2 rounded-sm hover:bg-foreground/10 group transition-colors";

/**
 * Floating "+ Add block" button that appears at the bottom-center of a
 * selected/hovered section. Click to open a centered picker with the atomic
 * block types, plus one entry per mirror in the site library — picking a
 * mirror spawns an instance of it. The picker is a viewport-centered modal
 * rather than a popover anchored to the button: anchored, it grew upward off
 * the top of the screen once the type + mirror lists got long.
 */
export function AddBlockButton({ onAdd, visible }: Props) {
  const [open, setOpen] = useState(false);
  const { mirrors } = useMirrorLibrary();
  // The bare "Mirror" type is only useful pointed at a source, so the grid
  // lists sources by name instead of the generic entry.
  const atomEntries = Object.values(atomRegistry).filter(
    (entry) => entry.type !== "mirror",
  );

  function add(type: BlockType, props?: Record<string, unknown>) {
    onAdd(type, props);
    setOpen(false);
  }

  // The modal portals to <body>, but React events still bubble through the
  // component tree — stopping them on this wrapper keeps picks and backdrop
  // clicks from also selecting / deselecting the section behind the overlay.
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "absolute bottom-3 left-1/2 -translate-x-1/2 z-30 transition-opacity duration-200 pointer-events-auto",
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
    >
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="kicker glass-strong rounded-full h-9 px-4 flex items-center gap-2 text-foreground hover:text-accent transition-colors shadow-2xl"
      >
        <PlusIcon /> Add block
      </button>

      {open && (
        <Modal title="Add block" size="lg" onClose={() => setOpen(false)}>
          <p className="kicker px-2 pb-2">Block type</p>
          <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {atomEntries.map((entry) => (
              <li key={entry.type}>
                <button
                  type="button"
                  onClick={() => add(entry.type)}
                  className={pickCls}
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
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {mirrors.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => add("mirror", { mirrorId: m.id })}
                    className={pickCls}
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
        </Modal>
      )}
    </div>
  );
}
