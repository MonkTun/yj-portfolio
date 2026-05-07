"use client";

import { cn } from "@/lib/utils";
import { DupeIcon, MoveIcon, TrashIcon } from "./icons";

type Props = {
  visible: boolean;
  onDuplicate: () => void;
  onDelete: () => void;
};

/**
 * The block's editor affordances. Two floating pieces, both visible only
 * when the block is selected:
 *
 *   1. A centered "move" pill on the top edge of the block — RGL's drag
 *      handle (`.rgl-handle`). The user grabs this to reposition.
 *   2. A small actions row at the top-right with duplicate / delete.
 *
 * The block's TYPE (Text / Image / etc.) is shown in the right-hand
 * properties panel, not on the block itself.
 */
export function BlockToolbar({ visible, onDuplicate, onDelete }: Props) {
  return (
    <>
      {/* Move pill — overlaps the top edge so it reads as part of the block.
          The accent border + grab cursor give it a clear "drag me" affordance. */}
      <button
        type="button"
        title="Drag to move"
        aria-label="Drag block to move"
        className={cn(
          "rgl-handle absolute -top-3 left-1/2 -translate-x-1/2 z-20",
          "h-6 w-12 rounded-full flex items-center justify-center",
          "bg-accent text-accent-foreground shadow-[0_4px_14px_-4px_rgba(92,138,58,0.6)]",
          "transition-opacity duration-150 cursor-grab active:cursor-grabbing pointer-events-auto",
          visible ? "opacity-100" : "opacity-0"
        )}
      >
        <MoveIcon />
      </button>

      {/* Actions — duplicate / delete only. The type label lives in the
          right-side properties panel. */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute -top-9 right-0 z-20 flex items-stretch gap-0.5 transition-opacity duration-150 pointer-events-auto",
          visible ? "opacity-100" : "opacity-0"
        )}
      >
        <button
          type="button"
          title="Duplicate"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="glass-strong rounded-sm h-7 w-7 flex items-center justify-center text-foreground/85 hover:text-accent transition-colors cursor-pointer"
        >
          <DupeIcon />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          className="glass-strong rounded-sm h-7 w-7 flex items-center justify-center text-foreground/85 hover:text-accent transition-colors cursor-pointer"
        >
          <TrashIcon />
        </button>
      </div>
    </>
  );
}
