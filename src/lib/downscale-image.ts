/**
 * Client-side image downscaling for the editor's uploader.
 *
 * Portfolio images don't need to be larger than a high-DPI viewport, and
 * shipping 10–25 MB source files would both blow past the upload body cap
 * (see next.config.ts `proxyClientMaxBodySize`) and tank page load. This caps
 * the longest edge and re-encodes to WebP in the browser BEFORE upload, so the
 * server only ever receives a web-sized asset.
 *
 * Left untouched: SVG (vector) and GIF (animated) — rasterising or flattening
 * them would be wrong. Anything that can't be decoded is passed through so the
 * server can reject it with a real error.
 */

const MAX_EDGE = 2560; // px — comfortably covers 2× of any realistic layout.
const REENCODE_ABOVE_BYTES = 4 * 1024 * 1024; // re-encode even if dims are fine.
const WEBP_QUALITY = 0.85;

const PASS_THROUGH = new Set(["image/svg+xml", "image/gif"]);

export async function downscaleImage(file: File): Promise<File> {
  if (typeof window === "undefined") return file;
  if (PASS_THROUGH.has(file.type)) return file;
  if (!file.type.startsWith("image/")) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    // Undecodable (corrupt / unsupported) — let the server handle it.
    return file;
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const needsResize = longest > MAX_EDGE;
  const needsRecompress = file.size > REENCODE_ABOVE_BYTES;
  if (!needsResize && !needsRecompress) {
    bitmap.close?.();
    return file;
  }

  const scale = needsResize ? MAX_EDGE / longest : 1;
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", WEBP_QUALITY)
  );
  if (!blob) return file;

  // If we didn't shrink dimensions and the re-encode came out bigger (already
  // well-optimised source), keep the original.
  if (!needsResize && blob.size >= file.size) return file;

  const stem = file.name.replace(/\.[^.]+$/, "") || "image";
  return new File([blob], `${stem}.webp`, {
    type: "image/webp",
    lastModified: file.lastModified,
  });
}
