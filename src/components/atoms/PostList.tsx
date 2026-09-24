"use client";

import type { PostListItem, PostListProps } from "@/lib/schema";
import { cn } from "@/lib/utils";

/**
 * Post List — the blog's table of contents. A vertical, text-first index:
 * running number · date kicker · display title · summary · arrow, one
 * hairline-divided row per post. No images on purpose; the blog reads like
 * a magazine contents page, not a card grid.
 *
 * Rows are plain anchors so the whole row is the hit target. Hover tints the
 * title to the accent and nudges the arrow (token durations; no scale — this
 * is reading chrome, not media). Under prefers-reduced-motion the nudge is
 * dropped and only the color change remains.
 */
export function PostList({
  items,
  numbered,
  showSummary,
  size,
  newTab,
}: PostListProps) {
  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-32 w-full items-center justify-center rounded-sm border border-dashed border-border bg-surface/40">
        <span className="kicker text-foreground/30 italic">
          Empty post list — add posts in the panel
        </span>
      </div>
    );
  }

  return (
    <ol className="w-full border-y border-border divide-y divide-border">
      {items.map((item, i) => (
        <li key={i}>
          <Row
            item={item}
            index={i}
            numbered={numbered}
            showSummary={showSummary}
            size={size}
            newTab={newTab}
          />
        </li>
      ))}
    </ol>
  );
}

function Row({
  item,
  index,
  numbered,
  showSummary,
  size,
  newTab,
}: {
  item: PostListItem;
  index: number;
  numbered: boolean;
  showSummary: boolean;
  size: PostListProps["size"];
  newTab: boolean;
}) {
  const titleClass =
    size === "lg"
      ? "text-3xl md:text-5xl"
      : "text-2xl md:text-3xl";

  const inner = (
    <>
      {/* Meta column(s): number + date. One inline row on mobile; on md+ the
          wrapper dissolves (`contents`) so both become grid cells. */}
      <span className="flex items-baseline gap-4 md:contents">
        {numbered && (
          <span className="kicker [font-feature-settings:'tnum'] w-8 shrink-0">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <span className="kicker [font-feature-settings:'tnum'] whitespace-nowrap">
          {item.date}
        </span>
      </span>

      <span className="block min-w-0">
        <span
          className={cn(
            "block font-display font-bold leading-[0.95] tracking-[-0.02em] text-foreground",
            "transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
            item.href && "group-hover:text-accent",
            titleClass,
          )}
        >
          {item.title || <span className="text-foreground/30">Untitled</span>}
        </span>
        {showSummary && item.summary && (
          <span className="block font-body text-foreground/65 text-base md:text-lg leading-[1.5] mt-3 max-w-2xl">
            {item.summary}
          </span>
        )}
      </span>

      <span
        aria-hidden
        className={cn(
          "hidden md:block kicker text-foreground/40 self-start text-base leading-none pt-2",
          "transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease)]",
          item.href &&
            "group-hover:text-accent motion-safe:group-hover:translate-x-1",
        )}
      >
        →
      </span>
    </>
  );

  // Grid columns follow the meta cells in flow order (number?, date, body,
  // arrow) — the mobile wrapper is `contents` on md+, so auto-placement lands
  // each cell in its column without explicit col-starts.
  const shared = cn(
    "group flex flex-col gap-3 py-6 md:py-8",
    "md:grid md:items-baseline md:gap-x-8",
    numbered
      ? "md:grid-cols-[2rem_8rem_minmax(0,1fr)_auto]"
      : "md:grid-cols-[8rem_minmax(0,1fr)_auto]",
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className={shared}
        draggable={false}
      >
        {inner}
      </a>
    );
  }
  return <div className={shared}>{inner}</div>;
}
