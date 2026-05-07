"use client";

import { useLayoutEffect, useRef } from "react";

import type { QuoteProps } from "@/lib/schema";
import { sanitizeRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { useEdit } from "@/components/EditContext";

export function Quote(props: QuoteProps) {
  const { quote, attribution } = props;
  const ctx = useEdit();

  const inner = (
    <blockquote className="font-display font-light italic text-4xl md:text-6xl leading-[1.05] text-foreground">
      <span className="text-accent select-none mr-1">&ldquo;</span>
      <EditableSpan
        value={quote}
        editable={!!ctx}
        onCommit={(v) => ctx?.updateProps({ quote: v })}
      />
      <span className="text-accent select-none ml-1">&rdquo;</span>
    </blockquote>
  );

  return (
    <div>
      {inner}
      <p className="kicker mt-6 flex items-center">
        —{" "}
        <EditableSpan
          value={attribution ?? ""}
          editable={!!ctx}
          onCommit={(v) => ctx?.updateProps({ attribution: v })}
          className="ml-1"
        />
      </p>
    </div>
  );
}

type EditableSpanProps = {
  value: string;
  editable: boolean;
  onCommit: (v: string) => void;
  className?: string;
};

/**
 * Same always-on-contentEditable pattern as the Text atom: the span is
 * always editable in the canvas so the browser's native click-to-position
 * caret behavior just works. We populate the DOM via useLayoutEffect on
 * mount and re-sync only when the prop changes externally and the user
 * isn't currently focused.
 */
function EditableSpan({
  value,
  editable,
  onCommit,
  className,
}: EditableSpanProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!editable) return;
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== value) {
      el.innerHTML = value;
    }
  }, [value, editable]);

  if (!editable) {
    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: value }}
      />
    );
  }

  return (
    <span
      ref={ref}
      className={cn(
        className,
        "outline-none rounded-sm cursor-text pointer-events-auto"
      )}
      contentEditable
      suppressContentEditableWarning
      onBlur={() => {
        const cleaned = sanitizeRichText(ref.current?.innerHTML ?? "");
        if (cleaned !== value) onCommit(cleaned);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          (e.currentTarget as HTMLElement).blur();
        }
      }}
    />
  );
}
