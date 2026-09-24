"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

import type { PdfProps } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useEdit } from "@/components/EditContext";
import { pageAspect, renderPage, usePdfDocument, usePdfPage } from "@/lib/pdf";
import {
  useDebouncedValue,
  useElementSize,
  useIntersecting,
} from "@/lib/use-element";
import { MediaSkeleton } from "./MediaSkeleton";
import { ExpandIcon, Overlay, OverlayAction, useOverlayClose } from "./Overlay";

/** Page shape to hold space with before a page has loaded — A-series. */
const PORTRAIT = 1 / Math.SQRT2;

/**
 * PDF atom. The block shows one page as a cover — the whole page centered
 * on the frame (`fit: "contain"`), or the page across the block's width with
 * its bottom fading out (`"width"`) — over a caption strip with the title
 * and page count. On the public site a click opens every page in a
 * full-screen reader (`PdfReader`); in the editor clicks select the block.
 *
 * pdf.js and the document load only once the block comes within a
 * viewport of the screen, and share one loaded document with the reader.
 */
export function Pdf({ src, title, page, fit, showCaption, radius }: PdfProps) {
  const editing = useEdit() !== null;
  const frameRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const near = useIntersecting(frameRef, { rootMargin: "100% 0px", once: true });
  const { doc, error } = usePdfDocument(src, near);
  const cover = usePdfPage(doc, page);
  const area = useElementSize(areaRef);
  const [open, setOpen] = useState(false);
  const name = title || fileLabel(src);

  const aspect = cover ? pageAspect(cover) : PORTRAIT;
  const pageWidth =
    fit === "contain" ? Math.min(area.width, area.height * aspect) : area.width;
  const renderWidth = useDebouncedValue(Math.round(pageWidth), 150);
  const cropped = fit === "width" && pageWidth / aspect > area.height + 1;

  return (
    <>
      <div
        ref={frameRef}
        className={cn(
          "viewer-frame group relative flex h-full w-full flex-col overflow-clip",
          radius === 0 && "rounded-sm",
        )}
        style={{ borderRadius: radius ? `${radius}px` : undefined }}
      >
        <div
          ref={areaRef}
          className={cn(
            "relative flex min-h-0 flex-1 justify-center overflow-clip",
            fit === "contain" ? "items-center p-3 md:p-4" : "items-start",
            cropped && "fade-bottom",
          )}
        >
          {!src || error ? (
            <p className="kicker self-center px-4 text-center italic text-foreground/40">
              {src ? "Couldn’t load this PDF" : "No PDF"}
            </p>
          ) : (
            pageWidth > 0 && (
              <div
                className="relative shrink-0 bg-surface motion-safe:transition-[scale] motion-safe:duration-[var(--duration)] motion-safe:ease-[var(--ease)] motion-safe:group-hover:scale-[1.02]"
                style={{ width: pageWidth, aspectRatio: aspect }}
              >
                {cover ? (
                  <PdfCanvas page={cover} width={renderWidth} />
                ) : (
                  <MediaSkeleton loaded={false} />
                )}
              </div>
            )
          )}
        </div>

        {showCaption && (
          <div className="flex shrink-0 items-center gap-3 border-t border-border px-3 py-2">
            <span className="kicker min-w-0 flex-1 truncate text-foreground">
              {name || "PDF"}
            </span>
            {doc && (
              <span className="kicker shrink-0 tabular-nums">
                {doc.numPages} {doc.numPages === 1 ? "page" : "pages"}
              </span>
            )}
            <ExpandIcon className="shrink-0 text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] group-hover:text-accent" />
          </div>
        )}

        {!editing && src && !error && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open PDF${name ? `: ${name}` : ""}`}
            className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          />
        )}
      </div>

      {open && (
        <PdfReader
          doc={doc}
          src={src}
          name={name || "PDF"}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Canvas for one page, filling its (positioned, page-shaped) parent.
 *  Shimmers until the first render lands; re-renders at a new `width`
 *  swap in without blanking. */
function PdfCanvas({ page, width }: { page: PDFPageProxy; width: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [shown, setShown] = useState<PDFPageProxy | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || width <= 0) return;
    const job = renderPage(page, canvas, width);
    void job.done.then((ok) => {
      if (ok) setShown(page);
    });
    return job.cancel;
  }, [page, width]);

  return (
    <>
      <canvas ref={ref} aria-hidden className="absolute inset-0 h-full w-full" />
      <MediaSkeleton loaded={shown === page} />
    </>
  );
}

/* ------------------------------------------------------------------ */

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];
const ZOOM_FIT = ZOOMS.indexOf(1);
/** Page width at 100% — a comfortable reading measure on a wide screen;
 *  narrower viewports fit the page to the screen instead. */
const READER_WIDTH = 920;

function PdfReader({
  doc,
  src,
  name,
  onClose,
}: {
  doc: PDFDocumentProxy | undefined;
  src: string;
  name: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(ZOOM_FIT);
  const [current, setCurrent] = useState(1);
  const pages = doc?.numPages ?? 0;

  return (
    <Overlay
      label={`PDF: ${name}`}
      onClose={onClose}
      title={
        <p className="kicker truncate">
          <span className="text-foreground">{name}</span>
          {pages > 0 && (
            <span className="ml-3 tabular-nums">
              {current} / {pages}
            </span>
          )}
        </p>
      }
      actions={
        <>
          <OverlayAction
            label="Zoom out"
            onClick={() => setZoom((z) => Math.max(0, z - 1))}
            disabled={zoom === 0}
          >
            −
          </OverlayAction>
          <OverlayAction
            label="Reset zoom"
            onClick={() => setZoom(ZOOM_FIT)}
            className="hidden w-12 justify-center tabular-nums sm:inline-flex"
          >
            {Math.round(ZOOMS[zoom] * 100)}%
          </OverlayAction>
          <OverlayAction
            label="Zoom in"
            onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
            disabled={zoom === ZOOMS.length - 1}
          >
            +
          </OverlayAction>
          <OverlayAction href={src} newTab className="hidden md:inline-flex">
            Open ↗
          </OverlayAction>
          <OverlayAction href={src} download className="hidden md:inline-flex">
            Download
          </OverlayAction>
        </>
      }
    >
      <ReaderPages doc={doc} zoom={ZOOMS[zoom]} onCurrent={setCurrent} />
    </Overlay>
  );
}

/** The scrolling page column. Pages hold their space from the start, but
 *  only those within a screen of the view keep a canvas — a long document
 *  would otherwise hold hundreds of MB of bitmaps. */
function ReaderPages({
  doc,
  zoom,
  onCurrent,
}: {
  doc: PDFDocumentProxy | undefined;
  zoom: number;
  onCurrent: (page: number) => void;
}) {
  const close = useOverlayClose();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnRef = useRef<HTMLDivElement>(null);
  const { width } = useElementSize(scrollRef);
  const gutters = width >= 768 ? 64 : 32; // the column's px-8 / px-4
  const fitWidth = useDebouncedValue(
    Math.max(0, Math.min(width - gutters, READER_WIDTH)),
    150,
  );
  const pageWidth = Math.round(fitWidth * zoom);
  const first = usePdfPage(doc, 1);
  const fallbackAspect = first ? pageAspect(first) : PORTRAIT;

  /** The page crossing the upper third of the view is "current". */
  function trackCurrent() {
    const scroller = scrollRef.current;
    const column = columnRef.current;
    if (!scroller || !column) return;
    const line = scroller.scrollTop + scroller.clientHeight / 3;
    let n = 1;
    for (const child of column.children) {
      const el = child as HTMLElement;
      if (el.offsetTop > line) break;
      n = Number(el.dataset.page);
    }
    onCurrent(n);
  }

  return (
    <div
      ref={scrollRef}
      onScroll={trackCurrent}
      onClick={(e) => {
        // The gutters around the pages are backdrop.
        if (e.target === e.currentTarget || e.target === columnRef.current) {
          close();
        }
      }}
      className="pointer-events-auto absolute inset-0 overflow-auto overscroll-contain"
    >
      {doc ? (
        <div
          ref={columnRef}
          className="mx-auto flex w-fit flex-col gap-4 px-4 py-6 md:gap-6 md:px-8 md:py-10"
        >
          {Array.from({ length: doc.numPages }, (_, i) => (
            <ReaderPage
              key={i}
              doc={doc}
              n={i + 1}
              width={pageWidth}
              fallbackAspect={fallbackAspect}
              scrollRef={scrollRef}
            />
          ))}
        </div>
      ) : (
        <p className="kicker absolute inset-0 m-auto h-fit w-fit">Loading</p>
      )}
    </div>
  );
}

function ReaderPage({
  doc,
  n,
  width,
  fallbackAspect,
  scrollRef,
}: {
  doc: PDFDocumentProxy;
  n: number;
  width: number;
  fallbackAspect: number;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const near = useIntersecting(ref, { root: scrollRef, rootMargin: "100% 0px" });
  const page = usePdfPage(doc, n);

  return (
    <div
      ref={ref}
      data-page={n}
      role="img"
      aria-label={`Page ${n}`}
      className="relative shrink-0 bg-surface"
      style={{ width, aspectRatio: page ? pageAspect(page) : fallbackAspect }}
    >
      {page && near && width > 0 && <PdfCanvas page={page} width={width} />}
    </div>
  );
}

/** "/uploads/game-design-doc.pdf" → "game-design-doc". */
function fileLabel(src: string) {
  const file = src.split(/[?#]/)[0].split("/").pop() ?? "";
  try {
    return decodeURIComponent(file).replace(/\.pdf$/i, "");
  } catch {
    return file;
  }
}
