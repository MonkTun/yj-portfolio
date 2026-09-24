"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { getImageProps } from "next/image";

import type { ImageProps } from "@/lib/schema";
import { cn } from "@/lib/utils";
import {
  imageFilterCss,
  isOptimizableImageSrc,
} from "@/components/atoms/imageStyles";
import { useElementSize } from "@/lib/use-element";
import { Overlay, OverlayAction, useOverlayClose } from "@/components/atoms/Overlay";

/** What the lightbox shows for one image: the whole uncropped source, with
 *  the block's color filter kept (it's part of the look) but its focal
 *  crop / zoom / rotate dropped — the point is to see all of it. */
export type LightboxImage = {
  src: string;
  alt: string;
  filter: ImageProps["filter"];
};

type Entry = { image: LightboxImage; el: HTMLElement | null };
type Ctx = { registry: Map<string, Entry>; open: (id: string) => void };

const LightboxCtx = createContext<Ctx | null>(null);

/**
 * Page-wide image lightbox. Every Image block under this provider registers
 * itself; clicking one opens a full-screen viewer that pages through all of
 * them in on-screen reading order (top → bottom, then left → right), so a
 * case study's screenshots read as one gallery.
 *
 * Mounted by PageRenderer — i.e. on the public site only. The editor never
 * renders it, so `useLightboxItem` returns no `open` there and clicks keep
 * selecting blocks.
 */
export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [registry] = useState(() => new Map<string, Entry>());
  const [view, setView] = useState<{
    images: LightboxImage[];
    index: number;
  } | null>(null);

  const open = useCallback(
    (id: string) => {
      // Measured at open time: mobile layouts reorder blocks, and a block
      // hidden on this breakpoint has no box (and no place in the gallery).
      const shown = [...registry.entries()]
        .filter(([, e]) => e.el?.isConnected && e.el.getClientRects().length > 0)
        .map(([key, e]) => ({ key, e, rect: e.el!.getBoundingClientRect() }))
        .sort((a, b) => a.rect.top - b.rect.top || a.rect.left - b.rect.left);
      const index = shown.findIndex((s) => s.key === id);
      if (index < 0) return;
      setView({ images: shown.map((s) => s.e.image), index });
    },
    [registry],
  );

  const value = useMemo(() => ({ registry, open }), [registry, open]);

  return (
    <LightboxCtx.Provider value={value}>
      {children}
      {view && (
        <LightboxView
          images={view.images}
          startIndex={view.index}
          onClose={() => setView(null)}
        />
      )}
    </LightboxCtx.Provider>
  );
}

/**
 * Registers an image with the page lightbox and returns its `open`, or null
 * when there's no lightbox (the editor) or the image opts out (`image` null:
 * no src, a linked image, the block's toggle off). `ref` is the clickable
 * element — its on-screen position orders the gallery.
 */
export function useLightboxItem(
  ref: React.RefObject<HTMLElement | null>,
  image: LightboxImage | null,
) {
  const ctx = useContext(LightboxCtx);
  const id = useId();

  // No deps: re-sync the entry after every render so edits to src/alt are
  // always current. A Map set is cheap; order is recomputed on open.
  useEffect(() => {
    if (!ctx || !image) return;
    ctx.registry.set(id, { image, el: ref.current });
    return () => {
      ctx.registry.delete(id);
    };
  });

  const open = useCallback(() => ctx?.open(id), [ctx, id]);
  return ctx && image ? open : null;
}

/* ------------------------------------------------------------------ */

/** Local assets go through the optimizer at viewport width (the largest
 *  variant on a 2× screen is near-original); anything else loads raw. */
function lightboxSource(image: LightboxImage) {
  if (!isOptimizableImageSrc(image.src)) return { src: image.src };
  const { props } = getImageProps({
    src: image.src,
    alt: image.alt,
    fill: true,
    sizes: "100vw",
  });
  return { src: props.src, srcSet: props.srcSet, sizes: props.sizes };
}

const pad = (n: number) => String(n).padStart(2, "0");

function LightboxView({
  images,
  startIndex,
  onClose,
}: {
  images: LightboxImage[];
  startIndex: number;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(startIndex);
  const count = images.length;
  const image = images[index];

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + count) % count),
    [count],
  );

  useEffect(() => {
    if (count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [count, go]);

  // Warm the neighbours so paging doesn't wait on the network.
  useEffect(() => {
    if (count < 2) return;
    for (const n of [images[(index + 1) % count], images[(index - 1 + count) % count]]) {
      const s = lightboxSource(n);
      const img = new window.Image();
      if (s.sizes) img.sizes = s.sizes;
      if (s.srcSet) img.srcset = s.srcSet;
      img.src = s.src;
    }
  }, [images, index, count]);

  const arrowCls =
    "pointer-events-auto absolute top-1/2 z-10 hidden -translate-y-1/2 p-4 font-mono text-2xl text-foreground/60 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] hover:text-accent md:block";

  return (
    <Overlay
      label="Image viewer"
      onClose={onClose}
      title={
        <p className="kicker truncate tabular-nums">
          {count > 1 ? `${pad(index + 1)} / ${pad(count)}` : "Image"}
          {image.alt && (
            <span className="ml-3 hidden normal-case tracking-normal text-foreground/60 sm:inline">
              {image.alt}
            </span>
          )}
        </p>
      }
      actions={
        <>
          {count > 1 && (
            <>
              <OverlayAction label="Previous image" onClick={() => go(-1)} className="md:hidden">
                ←
              </OverlayAction>
              <OverlayAction label="Next image" onClick={() => go(1)} className="md:hidden">
                →
              </OverlayAction>
            </>
          )}
          <OverlayAction href={image.src} newTab className="hidden sm:inline-flex">
            Original ↗
          </OverlayAction>
        </>
      }
    >
      {count > 1 && (
        <>
          <button type="button" aria-label="Previous image" onClick={() => go(-1)} className={cn(arrowCls, "left-2")}>
            ←
          </button>
          <button type="button" aria-label="Next image" onClick={() => go(1)} className={cn(arrowCls, "right-2")}>
            →
          </button>
        </>
      )}
      {/* Keyed on the image so zoom state resets when paging. */}
      <LightboxStage key={`${index}:${image.src}`} image={image} onSwipe={count > 1 ? go : undefined} />
    </Overlay>
  );
}

type Zoom = { ox: number; oy: number };
type Press = { x: number; y: number; lastX: number; lastY: number; onImage: boolean };

/** Magnification on click — past the fitted size, near the original's own
 *  pixels for a typical screenshot on a laptop. */
const ZOOM_SCALE = 2.5;
const TAP_SLOP_PX = 6;
const SWIPE_PX = 48;

/**
 * The image, fit to the viewport. Click / tap the image to zoom 2.5×
 * toward that point; zoomed, a mouse pans by hovering and a finger pans by
 * dragging. Unzoomed, a horizontal swipe pages; a tap off the image closes.
 *
 * Sized from its aspect ratio and the measured stage, not its intrinsic
 * size: the srcset advertises widths up to 3840w but the optimizer never
 * upscales, so a 1700px original would claim a density-shrunk intrinsic
 * width and sit small in the middle of the screen.
 */
function LightboxStage({
  image,
  onSwipe,
}: {
  image: LightboxImage;
  onSwipe?: (delta: number) => void;
}) {
  const close = useOverlayClose();
  const imgRef = useRef<HTMLImageElement>(null);
  const press = useRef<Press | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const box = useElementSize(boxRef);
  const [zoom, setZoom] = useState<Zoom | null>(null);
  const [ratio, setRatio] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const source = lightboxSource(image);

  // Contain-fit the picture in the stage box; it may grow past its own
  // size — filling the screen is the point of opening it.
  const fitted =
    ratio && box.width > 0 && box.height > 0
      ? box.width / box.height > ratio
        ? { width: box.height * ratio, height: box.height }
        : { width: box.width, height: box.width / ratio }
      : null;

  /** Natural aspect ratio — density-corrected sizes keep the ratio. Runs
   *  from the ref too, for an image already complete from cache. */
  function readRatio(el: HTMLImageElement | null) {
    if (el?.complete && el.naturalWidth > 0) {
      setRatio(el.naturalWidth / el.naturalHeight);
    }
  }

  /** Pointer position as 0–100% of the image's untransformed box. The
   *  rendered rect is scaled about the current origin, so undo that. */
  function pointOnImage(clientX: number, clientY: number) {
    const el = imgRef.current!;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const r = el.getBoundingClientRect();
    const s = zoom ? ZOOM_SCALE : 1;
    const left = r.left - ((zoom?.ox ?? 0) / 100) * w * (1 - s);
    const top = r.top - ((zoom?.oy ?? 0) / 100) * h * (1 - s);
    return {
      x: clamp(((clientX - left) / w) * 100),
      y: clamp(((clientY - top) / h) * 100),
    };
  }

  function toggleZoom(clientX: number, clientY: number) {
    if (zoom) return setZoom(null);
    const { x, y } = pointOnImage(clientX, clientY);
    setZoom({ ox: x, oy: y });
  }

  return (
    <div
      className={cn(
        "pointer-events-auto absolute inset-0 flex select-none flex-col items-center justify-center gap-3 px-4 pb-6 pt-4 md:px-20",
        // Pinch-zoom stays native until our own zoom takes over the drag.
        zoom ? "touch-none" : "touch-pinch-zoom",
      )}
      onPointerDown={(e) => {
        press.current = {
          x: e.clientX,
          y: e.clientY,
          lastX: e.clientX,
          lastY: e.clientY,
          onImage: e.target === imgRef.current,
        };
      }}
      onPointerMove={(e) => {
        if (!zoom) return;
        const p = press.current;
        if (e.pointerType === "mouse") {
          // Hover-pan: the point under the cursor becomes the origin.
          if (e.target === imgRef.current) {
            const { x, y } = pointOnImage(e.clientX, e.clientY);
            setZoom({ ...zoom, ox: x, oy: y });
          }
        } else if (p) {
          // Drag-pan: moving the origin by Δ shifts the picture by
          // -(scale-1)·Δ, so move it opposite to the finger.
          const el = imgRef.current!;
          const k = 100 / (ZOOM_SCALE - 1);
          setZoom({
            ...zoom,
            ox: clamp(zoom.ox - ((e.clientX - p.lastX) / el.offsetWidth) * k),
            oy: clamp(zoom.oy - ((e.clientY - p.lastY) / el.offsetHeight) * k),
          });
          p.lastX = e.clientX;
          p.lastY = e.clientY;
        }
      }}
      onPointerUp={(e) => {
        const p = press.current;
        press.current = null;
        if (!p) return;
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        if (Math.hypot(dx, dy) <= TAP_SLOP_PX) {
          if (p.onImage) toggleZoom(e.clientX, e.clientY);
          else close();
        } else if (!zoom && onSwipe && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(dy)) {
          onSwipe(dx < 0 ? 1 : -1);
        }
      }}
      onPointerCancel={() => {
        press.current = null;
      }}
    >
      {!fitted && (
        <p aria-hidden className="kicker absolute inset-0 m-auto h-fit w-fit">
          {failed ? "Couldn’t load this image" : "Loading"}
        </p>
      )}
      {/* The img's box is exactly the picture (no letterbox inside it), so
          a tap beside it lands on the stage and closes instead of zooming. */}
      <div
        ref={boxRef}
        className="flex min-h-0 w-full flex-1 items-center justify-center"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- srcset comes from getImageProps; next/image needs fixed dims or fill */}
        <img
          ref={(el) => {
            imgRef.current = el;
            readRatio(el);
          }}
          onLoad={(e) => readRatio(e.currentTarget)}
          onError={() => setFailed(true)}
          {...source}
          alt={image.alt}
          draggable={false}
          className={cn(
            "max-h-full max-w-full shrink-0 transition-opacity duration-[var(--duration)] ease-[var(--ease)] motion-safe:transition-[opacity,transform]",
            fitted ? "opacity-100" : "opacity-0",
            zoom ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
          style={{
            width: fitted?.width,
            height: fitted?.height,
            filter: image.filter !== "none" ? imageFilterCss[image.filter] : undefined,
            transform: zoom ? `scale(${ZOOM_SCALE})` : undefined,
            transformOrigin: zoom ? `${zoom.ox}% ${zoom.oy}%` : undefined,
          }}
        />
      </div>
      {image.alt && (
        <p className="shrink-0 text-center font-body text-sm italic text-muted-foreground sm:hidden">
          {image.alt}
        </p>
      )}
    </div>
  );
}

const clamp = (v: number) => Math.min(100, Math.max(0, v));
