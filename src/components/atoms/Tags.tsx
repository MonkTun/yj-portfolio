"use client";

import type { TagsProps } from "@/lib/schema";
import { useTagLibrary } from "@/components/TagLibraryContext";
import { useEdit } from "@/components/EditContext";
import { cn } from "@/lib/utils";

const ALIGN = {
  left: "justify-start",
  center: "justify-center",
  right: "justify-end",
} as const;

/**
 * Row of tag pills — white label on a fully-rounded colored chip. Each
 * pill's background comes from the project-wide tag library (site.json)
 * via TagLibraryProvider; the per-tag hex is data, which is why it's an
 * inline style rather than a token class. A name missing from the library
 * falls back to the accent token so it still renders on-palette.
 */
export function Tags({ tags, size, gap, align }: TagsProps) {
  const library = useTagLibrary();
  const edit = useEdit();

  if (tags.length === 0) {
    // Invisible blocks can't be clicked on the canvas — show a hint in the
    // editor only; the public site renders nothing.
    if (!edit) return null;
    return (
      <div className="flex h-full min-h-6 w-full items-center rounded-sm border border-dashed border-border px-3">
        <span className="kicker text-foreground/40">
          No tags — add some in the panel
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full flex-wrap content-center items-center",
        ALIGN[align]
      )}
      style={{ gap }}
    >
      {tags.map((name) => {
        const def = library.find((t) => t.name === name);
        return (
          <span
            key={name}
            className="inline-flex items-center whitespace-nowrap rounded-full font-sans font-medium uppercase tracking-[0.12em] text-accent-foreground"
            style={{
              fontSize: size,
              padding: "0.35em 0.95em",
              backgroundColor: def?.color ?? "var(--accent)",
            }}
          >
            {name}
          </span>
        );
      })}
    </div>
  );
}
