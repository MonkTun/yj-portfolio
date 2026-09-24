"use client";

import NextImage from "next/image";

import { useEdit } from "@/components/EditContext";
import type { ProjectGridItem, ProjectGridProps } from "@/lib/schema";
import { DESKTOP_CONTENT_PX } from "@/lib/grid";
import { cn } from "@/lib/utils";

import { isOptimizableImageSrc } from "./imageStyles";
import { MediaSkeleton, useMediaLoaded } from "./MediaSkeleton";

/**
 * Project Grid — the /projects index. A plain CSS grid of rectangular tiles;
 * each tile is a background image with either a title image (logo /
 * wordmark) or the title set in display type over it, plus an optional mono
 * kicker in the corner.
 *
 * Tiles sit desaturated and dimmed until hovered — the hover IS the color
 * (`.project-tile-media` in globals.css). Phones have no hover, so below the
 * md breakpoint / on hover-less pointers the tiles are always in color; the
 * editor's phone canvas gets the same by skipping the class. Hover also scales the media a touch, dropped
 * under prefers-reduced-motion so only the color change remains.
 *
 * `columns` is one number per breakpoint: the desktop value lives on the
 * block, the phone value is a mobile override of the same key (the editor
 * seeds `columns: 1` on mobile when the block is added). The public renderer
 * mounts one variant per breakpoint, so the atom never has to know which
 * viewport it's on.
 */
export function ProjectGrid({
  items,
  columns,
  gap,
  aspect,
  radius,
  greyUntilHover,
  showMeta,
  newTab,
}: ProjectGridProps) {
  const edit = useEdit();

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-40 w-full items-center justify-center rounded-sm border border-dashed border-border bg-surface/40">
        <span className="kicker text-foreground/30 italic">
          Empty project grid — add projects in the panel
        </span>
      </div>
    );
  }

  // Tiles render at roughly (content width / columns) px, so the optimizer
  // serves a variant that size. In the editor the canvas is a fixed-width
  // frame, so the desktop width is the right ceiling there too.
  const tilePx = Math.round(DESKTOP_CONTENT_PX / Math.max(1, columns));
  const sizes = `(max-width: 767px) ${Math.round(100 / Math.max(1, columns))}vw, ${tilePx}px`;

  return (
    <ul
      className="grid w-full list-none"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
        gap: `${gap}px`,
      }}
    >
      {items.map((item, i) => (
        <li key={i} className="min-w-0">
          <Tile
            item={item}
            aspect={aspect}
            radius={radius}
            showMeta={showMeta}
            newTab={newTab}
            sizes={sizes}
            inEditor={edit !== null}
            // The editor's phone canvas sits inside a desktop viewport, so
            // the CSS breakpoint can't tell it's a phone — mirror the rule.
            greyUntilHover={greyUntilHover && edit?.device !== "mobile"}
          />
        </li>
      ))}
    </ul>
  );
}

function Tile({
  item,
  aspect,
  radius,
  greyUntilHover,
  showMeta,
  newTab,
  sizes,
  inEditor,
}: {
  item: ProjectGridItem;
  aspect: string;
  radius: number;
  greyUntilHover: boolean;
  showMeta: boolean;
  newTab: boolean;
  sizes: string;
  inEditor: boolean;
}) {
  const { loaded, mediaProps } = useMediaLoaded(item.src);
  const hasTitleImage = item.titleSrc.trim().length > 0;
  // No title image and no title text = the background already carries the
  // mark (key art with the logo baked in). The public site renders nothing
  // over it; the editor still shows a placeholder so the tile isn't mute.
  const hasTitleText = item.title.trim().length > 0;
  const showTextTitle = !hasTitleImage && (hasTitleText || inEditor);
  const bgStyle: React.CSSProperties = {
    objectPosition: `${item.focalX}% ${item.focalY}%`,
  };

  const inner = (
    <>
      {/* Media layer: background + title image. Both desaturate together so
          a colored logo greys out with its backdrop. */}
      <div
        className={cn(
          "absolute inset-0",
          greyUntilHover && "project-tile-media",
        )}
      >
        {item.src ? (
          <div className="absolute inset-0 transition-transform duration-[var(--duration)] ease-[var(--ease)] motion-safe:group-hover:scale-[1.04]">
            {isOptimizableImageSrc(item.src) ? (
              <NextImage
                {...mediaProps}
                src={item.src}
                alt={hasTitleImage ? "" : item.alt}
                fill
                sizes={sizes}
                draggable={false}
                style={bgStyle}
                className="object-cover"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                {...mediaProps}
                src={item.src}
                alt={hasTitleImage ? "" : item.alt}
                draggable={false}
                loading="lazy"
                decoding="async"
                style={bgStyle}
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
            <MediaSkeleton loaded={loaded} />
          </div>
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-surface text-foreground/30 italic kicker">
            No image
          </div>
        )}

        {/* Legibility scrim — token gradient from the page ground, only as
            strong as the title needs. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/10 to-transparent pointer-events-none"
        />

        {hasTitleImage && (
          <div className="absolute inset-0 grid place-items-center p-[8%] pointer-events-none">
            {/* Box is titleWidth% on both axes so a wide wordmark is
                width-limited and a tall badge height-limited — either way
                the slider reads as "how big is the mark". */}
            <div
              className="relative"
              style={{
                width: `${item.titleWidth}%`,
                height: `${item.titleWidth}%`,
              }}
            >
              {isOptimizableImageSrc(item.titleSrc) ? (
                <NextImage
                  src={item.titleSrc}
                  alt={item.alt || item.title}
                  fill
                  sizes={sizes}
                  draggable={false}
                  className="object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.titleSrc}
                  alt={item.alt || item.title}
                  draggable={false}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              )}
            </div>
          </div>
        )}
      </div>

      {/* Type layer stays crisp cream over the greyed media. */}
      {showTextTitle && (
        <span className="absolute inset-0 grid place-items-center p-[8%] text-center pointer-events-none">
          <span
            className={cn(
              "font-display font-black leading-[0.92] tracking-[-0.03em] text-foreground",
              "text-[clamp(1.75rem,11cqw,4.5rem)]",
              "transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
              item.href && "group-hover:text-accent-foreground",
            )}
          >
            {hasTitleText ? (
              item.title
            ) : (
              <span className="text-foreground/30">No title</span>
            )}
          </span>
        </span>
      )}

      {showMeta && item.meta && (
        <span className="kicker absolute left-4 bottom-3 text-foreground/80 pointer-events-none">
          {item.meta}
        </span>
      )}
    </>
  );

  const shared = cn(
    "group relative block w-full overflow-hidden bg-surface border border-border outline-none",
    "[container-type:inline-size]",
    "focus-visible:border-accent",
  );
  const style: React.CSSProperties = {
    aspectRatio: aspect || undefined,
    borderRadius: radius ? `${radius}px` : undefined,
  };

  // In the editor a tile is a click target for selection, not navigation —
  // keep the link semantics on the public site only.
  if (item.href && !inEditor) {
    return (
      <a
        href={item.href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        aria-label={item.title || item.alt || undefined}
        className={shared}
        style={style}
        draggable={false}
      >
        {inner}
      </a>
    );
  }
  return (
    <div className={shared} style={style}>
      {inner}
    </div>
  );
}
