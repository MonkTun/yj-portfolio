"use client";

import { useLayoutEffect, useRef, type KeyboardEvent } from "react";

import type { TextProps } from "@/lib/schema";
import { sanitizeRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import { useEdit } from "@/components/EditContext";

import {
  textVariantClass,
  textVariantTag,
  textAlignClass,
  textColorClass,
  textTransformClass,
} from "./atomStyles";

/**
 * The Text atom. Renders as an h1/h2/h3/p/span depending on `variant`,
 * displays the content as raw HTML (sanitized — only <strong>/<em>/<br>
 * survive), and turns into a contentEditable rich-text editor when an
 * EditContext is present.
 *
 * On the public site (no EditContext) this collapses to a single static
 * element with `dangerouslySetInnerHTML`.
 */
export function Text(props: TextProps) {
  const {
    content,
    variant,
    align,
    color,
    transform,
    fontSize,
    lineHeight,
    letterSpacing,
  } = props;
  const ctx = useEdit();

  const Tag = textVariantTag[variant];
  const className = cn(
    textVariantClass[variant],
    textAlignClass[align],
    textColorClass[color],
    textTransformClass[transform],
    "outline-none"
  );
  // Inline style wins over the variant's class-defined values when set.
  const styleEntries: React.CSSProperties = {};
  if (fontSize) styleEntries.fontSize = `${fontSize}px`;
  if (lineHeight !== undefined) styleEntries.lineHeight = String(lineHeight);
  if (letterSpacing !== undefined) {
    styleEntries.letterSpacing = `${letterSpacing}em`;
  }
  const style = Object.keys(styleEntries).length > 0 ? styleEntries : undefined;

  if (!ctx) {
    return (
      <Tag
        className={className}
        style={style}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  return (
    <EditableText
      className={className}
      style={style}
      Tag={Tag}
      content={content}
    />
  );
}

type EditableTextProps = {
  Tag: "h1" | "h2" | "h3" | "p" | "span";
  className: string;
  style?: React.CSSProperties;
  content: string;
};

/**
 * In editor mode the element is contentEditable *all the time*. This is
 * the only way to get the browser's native click-to-position-caret
 * behavior — if we toggled contentEditable on click, the click that
 * triggers the toggle has nothing to position against, and the caret
 * lands wherever the previous default was (we used to force it to the
 * end, which caused the "caret snaps back to start" bug).
 *
 * We then need to be careful not to let React clobber the user's typing:
 *   - DOM is initially empty; we populate it via useLayoutEffect on mount
 *   - We only re-sync the DOM when the prop changes externally AND the
 *     element isn't focused (so undo/panel edits work, but typing isn't
 *     yanked).
 */
function EditableText({ Tag, className, style, content }: EditableTextProps) {
  const ctx = useEdit()!;
  const ref = useRef<HTMLElement | null>(null);

  // `Tag` is in deps because changing variant (h1 → h2 etc.) swaps the
  // underlying DOM element. The new element mounts empty, so we need to
  // re-sync its innerHTML even though `content` itself didn't change.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (el.innerHTML !== content) {
      el.innerHTML = content;
    }
  }, [content, Tag]);

  function commit() {
    const el = ref.current;
    if (!el) return;
    const cleaned = sanitizeRichText(el.innerHTML);
    if (cleaned !== content) {
      // Content always writes to desktop, even in mobile mode — copy is a
      // page-level property, not a per-breakpoint override.
      ctx.updateDesktopProps({ content: cleaned });
    }
  }

  return (
    <span className="relative inline-block w-full pointer-events-auto">
      <Tag
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ref={ref as React.Ref<any>}
        className={cn(className, "rounded-sm cursor-text")}
        style={style}
        contentEditable
        suppressContentEditableWarning
        onBlur={commit}
        onKeyDown={(e: KeyboardEvent) => {
          if (e.key === "Escape") {
            e.preventDefault();
            (e.currentTarget as HTMLElement).blur();
          }
        }}
      />
    </span>
  );
}
