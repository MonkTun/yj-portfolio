"use client";

import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";

import type { CarouselItem, ProjectCarouselProps } from "@/lib/schema";
import { cn } from "@/lib/utils";

import {
  imageFilterAndBlurCss,
  imageTintBgClass,
  imageTintMaskStyle,
  imageTransformCss,
  isOptimizableImageSrc,
} from "./imageStyles";

/**
 * Horizontal project carousel. Two variants share one block:
 *
 *  - "cards"   — scroll-snapped cards with meta / title / description, paged by
 *                arrow buttons and grabbable with the mouse.
 *  - "marquee" — image-only band that drifts on its own at a constant velocity
 *                and can also be grabbed and flung; loops seamlessly.
 *
 * No carousel library: native CSS scroll handles the strip, a pointer
 * drag-to-scroll handler (mouse only — touch keeps native momentum) makes it
 * grabbable, and an rAF loop drives the marquee drift. All auto-motion is
 * collapsed under prefers-reduced-motion (the strip stays manually scrollable).
 */
export function ProjectCarousel(props: ProjectCarouselProps) {
  if (props.items.length === 0) {
    return (
      <div className="flex h-full min-h-40 w-full items-center justify-center rounded-sm border border-dashed border-border bg-surface/40">
        <span className="kicker text-foreground/30 italic">
          Empty carousel — add projects in the panel
        </span>
      </div>
    );
  }

  return props.variant === "marquee" ? (
    <MarqueeCarousel {...props} />
  ) : (
    <CardsCarousel {...props} />
  );
}

/* ============================================================
   "cards" — snap-scrolled cards with text, arrow paging.
   ============================================================ */

function CardsCarousel({
  items,
  cardWidth,
  gap,
  aspect,
  radius,
  edgeFade,
  showArrows,
  newTab,
}: ProjectCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const drag = useRef({ active: false, startX: 0, startScroll: 0, moved: false });

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!el) return;
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    const dx = e.clientX - drag.current.startX;
    if (Math.abs(dx) > 4) drag.current.moved = true;
    el.scrollLeft = drag.current.startScroll - dx;
  };
  const endDrag = () => {
    drag.current.active = false;
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };
  const page = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * (cardWidth + gap), behavior: "smooth" });
  };

  return (
    <div className="relative w-full">
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={onClickCapture}
        className={cn(
          "flex overflow-x-auto overflow-y-hidden pb-3",
          "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
          "snap-x snap-mandatory",
          "cursor-grab active:cursor-grabbing select-none",
          edgeFade && "carousel-edge-fade"
        )}
        style={{ gap: `${gap}px` }}
      >
        {items.map((item, i) => (
          <Card
            key={i}
            item={item}
            cardWidth={cardWidth}
            aspect={aspect}
            radius={radius}
            newTab={newTab}
          />
        ))}
      </div>

      {showArrows && items.length > 1 && (
        <>
          <ArrowButton side="left" onClick={() => page(-1)} />
          <ArrowButton side="right" onClick={() => page(1)} />
        </>
      )}
    </div>
  );
}

/**
 * The image tile shared by both variants. Applies the per-item effects (filter,
 * blur, focal point, rotate, flip, tint) edited through the shared image dialog
 * — the same imageStyles helpers the Image atom uses — and adds the hover scale.
 * The rotate/flip transform lives on the <img> while the hover scale lives on a
 * separate wrapper so the two transforms don't clobber each other.
 */
function CarouselImage({
  item,
  aspect,
  radius,
  cardWidth,
}: {
  item: CarouselItem;
  aspect: string;
  radius: number;
  cardWidth: number;
}) {
  const tintClass = imageTintBgClass[item.tint];
  const showTint = tintClass !== null && item.tintOpacity > 0;

  const imgStyle: React.CSSProperties = {
    objectPosition: `${item.focalX}% ${item.focalY}%`,
    filter: imageFilterAndBlurCss(item.filter, item.blur),
    transform: imageTransformCss({
      rotate: item.rotate,
      flipX: item.flipX,
      flipY: item.flipY,
      zoom: item.zoom,
    }),
    transformOrigin: `${item.focalX}% ${item.focalY}%`,
  };

  return (
    <div
      className="relative w-full overflow-hidden bg-surface border border-border"
      style={{
        aspectRatio: aspect || undefined,
        borderRadius: radius ? `${radius}px` : undefined,
      }}
    >
      {item.src ? (
        <div className="absolute inset-0 transition-transform duration-[var(--duration-fast)] ease-[var(--ease)] motion-safe:group-hover:scale-[1.04]">
          {isOptimizableImageSrc(item.src) ? (
            // Tiles render at exactly cardWidth px, so the optimizer can
            // serve a variant that size instead of the full original.
            <NextImage
              src={item.src}
              alt={item.alt}
              fill
              sizes={`${cardWidth}px`}
              draggable={false}
              style={imgStyle}
              className="object-cover"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.src}
              alt={item.alt}
              draggable={false}
              loading="lazy"
              decoding="async"
              style={imgStyle}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          {showTint && (
            <div
              aria-hidden
              className={cn("absolute inset-0 pointer-events-none", tintClass)}
              style={{
                opacity: item.tintOpacity / 100,
                ...imageTintMaskStyle({
                  src: item.src,
                  fit: "cover",
                  focalX: item.focalX,
                  focalY: item.focalY,
                  rotate: item.rotate,
                  flipX: item.flipX,
                  flipY: item.flipY,
                  zoom: item.zoom,
                }),
              }}
            />
          )}
        </div>
      ) : (
        <div className="absolute inset-0 grid place-items-center text-foreground/30 italic kicker">
          No image
        </div>
      )}

      {item.starred && (
        <div
          aria-hidden
          className="glass-subtle absolute left-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full text-accent pointer-events-none"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2l2.9 6.26L21.8 9.27l-4.9 4.78 1.16 6.76L12 17.6l-6.06 3.21L7.1 14.05 2.2 9.27l6.9-1.01L12 2z" />
          </svg>
        </div>
      )}
    </div>
  );
}

function Card({
  item,
  cardWidth,
  aspect,
  radius,
  newTab,
}: {
  item: CarouselItem;
  cardWidth: number;
  aspect: string;
  radius: number;
  newTab: boolean;
}) {
  const inner = (
    <>
      <CarouselImage
        item={item}
        aspect={aspect}
        radius={radius}
        cardWidth={cardWidth}
      />

      {item.meta && <p className="kicker mt-3">{item.meta}</p>}
      {item.title && (
        <h3 className="font-display text-foreground text-2xl md:text-3xl leading-[0.95] tracking-[-0.02em] mt-1.5">
          {item.title}
        </h3>
      )}
      {item.description && (
        <p className="font-body text-foreground/70 text-sm leading-relaxed mt-2">
          {item.description}
        </p>
      )}
    </>
  );

  const shared = "group shrink-0 snap-start";
  const style = { width: `${cardWidth}px` };

  if (item.href) {
    return (
      <a
        href={item.href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className={cn(shared, "block")}
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

/* ============================================================
   "marquee" — image-only band, constant drift + grab/fling.
   ============================================================ */

function MarqueeCarousel({
  items,
  cardWidth,
  gap,
  aspect,
  radius,
  edgeFade,
  newTab,
  autoScrollSpeed,
  pauseOnHover,
}: ProjectCarouselProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const lastTs = useRef(0);
  const hoverPaused = useRef(false);
  // Velocity (px/s) carried out of a drag for momentum / fling.
  const vel = useRef(0);
  const drag = useRef({
    active: false,
    startX: 0,
    startScroll: 0,
    lastX: 0,
    lastT: 0,
    moved: false,
  });

  // The drift loops over one full copy of the items, wrapping scrollLeft by
  // exactly one period so the seam is invisible. Period is derived from props
  // (not measured) so it's exact regardless of layout timing.
  const period = items.length * (cardWidth + gap);

  // We must render enough copies that the content always overflows the track by
  // at least one full period — otherwise wrapping scrollLeft lands outside the
  // browser's [0, scrollWidth - clientWidth] range and gets clamped, which
  // stops the loop dead in one direction. ceil(width / period) + 1 guarantees
  // (copies - 1) * period >= width, so the wrap target is always scrollable.
  const [copies, setCopies] = useState(2);
  useEffect(() => {
    const el = trackRef.current;
    if (!el || period <= 0) return;
    const measure = () => {
      const need = Math.max(2, Math.ceil(el.clientWidth / period) + 1);
      setCopies((c) => (c === need ? c : need));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [period]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

    // Idle the loop while the strip is scrolled out of view — each tick
    // forces a synchronous scrollLeft read/write on a large overflow
    // container, and the marquee drifts for the page's whole lifetime
    // otherwise. Drag/fling state carries across because it lives in refs.
    let inView = true;
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          if (entries[0]) inView = entries[0].isIntersecting;
        },
        { threshold: 0.01 }
      );
      io.observe(el);
    }

    const step = (now: number) => {
      rafRef.current = requestAnimationFrame(step);
      if (!inView || document.hidden) {
        // Reset the clock so re-entry doesn't apply one giant dt jump.
        lastTs.current = now;
        return;
      }
      const dt = lastTs.current ? Math.min(0.05, (now - lastTs.current) / 1000) : 0;
      lastTs.current = now;

      if (!drag.current.active) {
        if (Math.abs(vel.current) > 8) {
          // Momentum fling, decaying ~7%/frame.
          el.scrollLeft += vel.current * dt;
          vel.current *= Math.pow(0.93, dt * 60);
        } else if (!reduce && autoScrollSpeed > 0 && !hoverPaused.current) {
          el.scrollLeft += autoScrollSpeed * dt;
        }
      }

      // Seamless wrap in both directions.
      if (period > 0) {
        if (el.scrollLeft >= period) el.scrollLeft -= period;
        else if (el.scrollLeft < 0) el.scrollLeft += period;
      }
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(rafRef.current);
      io?.disconnect();
    };
  }, [autoScrollSpeed, period]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    const el = trackRef.current;
    if (!el) return;
    vel.current = 0;
    drag.current = {
      active: true,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      lastX: e.clientX,
      lastT: e.timeStamp,
      moved: false,
    };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = trackRef.current;
    if (!el || !drag.current.active) return;
    if (Math.abs(e.clientX - drag.current.startX) > 4) drag.current.moved = true;
    // Move incrementally and wrap into the loop range, rather than setting an
    // absolute scrollLeft (which the browser clamps at 0 / max — that's what
    // stopped manual dragging from looping infinitely like the auto-scroll).
    const stepDx = e.clientX - drag.current.lastX;
    let target = el.scrollLeft - stepDx;
    if (period > 0) target = ((target % period) + period) % period;
    el.scrollLeft = target;
    const dtm = (e.timeStamp - drag.current.lastT) / 1000;
    if (dtm > 0) vel.current = -stepDx / dtm;
    drag.current.lastX = e.clientX;
    drag.current.lastT = e.timeStamp;
  };
  const endDrag = () => {
    drag.current.active = false;
  };
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  // Repeat the list enough times to always overflow the track (see `copies`).
  const loop = Array.from(
    { length: copies * items.length },
    (_, k) => items[k % items.length]
  );

  return (
    <div
      ref={trackRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerLeave={() => {
        endDrag();
        hoverPaused.current = false;
      }}
      onPointerEnter={() => {
        if (pauseOnHover) hoverPaused.current = true;
      }}
      onClickCapture={onClickCapture}
      className={cn(
        "flex w-full overflow-x-auto overflow-y-hidden",
        "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
        "cursor-grab active:cursor-grabbing select-none",
        edgeFade && "carousel-edge-fade"
      )}
    >
      {loop.map((item, i) => (
        <MarqueeTile
          key={i}
          item={item}
          cardWidth={cardWidth}
          gap={gap}
          aspect={aspect}
          radius={radius}
          newTab={newTab}
        />
      ))}
    </div>
  );
}

function MarqueeTile({
  item,
  cardWidth,
  gap,
  aspect,
  radius,
  newTab,
}: {
  item: CarouselItem;
  cardWidth: number;
  gap: number;
  aspect: string;
  radius: number;
  newTab: boolean;
}) {
  const tile = (
    <CarouselImage
      item={item}
      aspect={aspect}
      radius={radius}
      cardWidth={cardWidth}
    />
  );

  // Width + trailing margin make each tile occupy exactly cardWidth+gap, so the
  // marquee period (items.length × (cardWidth+gap)) lines up perfectly. The
  // aspect lives on CarouselImage's own box.
  const style: React.CSSProperties = {
    width: `${cardWidth}px`,
    marginRight: `${gap}px`,
  };
  const shared = "group shrink-0";

  if (item.href) {
    return (
      <a
        href={item.href}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        className={cn(shared, "block")}
        style={style}
        draggable={false}
      >
        {tile}
      </a>
    );
  }
  return (
    <div className={shared} style={style}>
      {tile}
    </div>
  );
}

function ArrowButton({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous projects" : "Next projects"}
      onClick={onClick}
      className={cn(
        "glass-subtle absolute top-1/2 -translate-y-1/2 z-10",
        "grid h-10 w-10 place-items-center rounded-full",
        "text-foreground/80 hover:text-accent",
        "transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
        side === "left" ? "left-2" : "right-2"
      )}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={side === "left" ? "" : "rotate-180"}
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
    </button>
  );
}
