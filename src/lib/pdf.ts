"use client";

import { useEffect, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy } from "pdfjs-dist";

type PdfJs = typeof import("pdfjs-dist/legacy/build/pdf.mjs");

let pdfjs: Promise<PdfJs> | null = null;

/**
 * pdf.js, imported on first use. Never a static import: every atom ships
 * on every page (Mirror pulls the whole registry into the client bundle),
 * and pdf.js + its worker are ~1.5 MB. The legacy build carries the
 * polyfills older Safari needs; the worker is emitted as its own asset.
 */
function loadPdfJs(): Promise<PdfJs> {
  pdfjs ??= import("pdfjs-dist/legacy/build/pdf.mjs").then(
    (m) => {
      m.GlobalWorkerOptions.workerSrc = new URL(
        "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
        import.meta.url,
      ).toString();
      return m;
    },
    (err) => {
      pdfjs = null; // let a later mount retry a failed chunk load
      throw err;
    },
  );
  return pdfjs;
}

/** Loads a PDF once `enabled` (gate it on proximity so far-off blocks
 *  don't fetch). The document is destroyed when `src` changes or the
 *  caller unmounts. */
export function usePdfDocument(src: string, enabled = true) {
  const [state, setState] = useState<{
    src: string;
    doc?: PDFDocumentProxy;
    error?: string;
  }>({ src: "" });

  useEffect(() => {
    if (!src || !enabled) return;
    let cancelled = false;
    let destroy: (() => Promise<void>) | null = null;
    loadPdfJs()
      .then((m) => {
        if (cancelled) return null;
        const task = m.getDocument({ url: src });
        destroy = () => task.destroy();
        return task.promise;
      })
      .then((doc) => {
        if (!cancelled && doc) setState({ src, doc });
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn("[pdf] load failed:", err);
        setState({
          src,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    return () => {
      cancelled = true;
      void destroy?.();
    };
  }, [src, enabled]);

  return state.src === src ? state : { src };
}

/** One page of a loaded document (page numbers clamp to the document). */
export function usePdfPage(
  doc: PDFDocumentProxy | undefined,
  pageNumber: number,
) {
  const [state, setState] = useState<{
    doc?: PDFDocumentProxy;
    n: number;
    page?: PDFPageProxy;
  }>({ n: 0 });

  useEffect(() => {
    if (!doc) return;
    let cancelled = false;
    const n = Math.min(Math.max(1, pageNumber), doc.numPages);
    doc
      .getPage(n)
      .then((page) => {
        if (!cancelled) setState({ doc, n: pageNumber, page });
      })
      .catch((err: unknown) => console.warn("[pdf] page failed:", err));
    return () => {
      cancelled = true;
    };
  }, [doc, pageNumber]);

  return state.doc === doc && state.n === pageNumber ? state.page : undefined;
}

/** Width ÷ height of a page as displayed (honours the page's /Rotate). */
export function pageAspect(page: PDFPageProxy): number {
  const { width, height } = page.getViewport({ scale: 1 });
  return width / height;
}

/** Canvas pixel budget per page. iOS refuses canvases past ~16.7 M px and
 *  a long document keeps a few pages alive at once, so stay well under. */
const MAX_CANVAS_PX = 10_000_000;

/**
 * Renders `page` into `canvas` sharp for `cssWidth` CSS px on this screen
 * (DPR capped at 2). Draws offscreen and swaps the finished bitmap in, so a
 * re-render at a new size never blanks the page. Resolves false if
 * cancelled; `cancel` is safe to call at any time.
 */
export function renderPage(
  page: PDFPageProxy,
  canvas: HTMLCanvasElement,
  cssWidth: number,
): { done: Promise<boolean>; cancel: () => void } {
  const base = page.getViewport({ scale: 1 });
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const byWidth = (cssWidth * dpr) / base.width;
  const byArea = Math.sqrt(MAX_CANVAS_PX / (base.width * base.height));
  const viewport = page.getViewport({ scale: Math.min(byWidth, byArea) });

  const off = document.createElement("canvas");
  off.width = Math.floor(viewport.width);
  off.height = Math.floor(viewport.height);
  const task = page.render({ canvas: off, viewport });

  const done = task.promise.then(
    () => {
      canvas.width = off.width;
      canvas.height = off.height;
      canvas.getContext("2d")?.drawImage(off, 0, 0);
      off.width = off.height = 0; // release the offscreen bitmap now
      return true;
    },
    (err: unknown) => {
      if ((err as { name?: string })?.name !== "RenderingCancelledException") {
        console.warn("[pdf] render failed:", err);
      }
      return false;
    },
  );
  return { done, cancel: () => task.cancel() };
}
