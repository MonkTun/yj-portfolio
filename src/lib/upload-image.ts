import { downscaleImage } from "@/lib/downscale-image";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from "@/lib/upload-limits";

/**
 * Shared client-side upload path: downscale/re-encode oversized images in
 * the browser, preflight the shared body cap (past it the proxy's body
 * clone truncates the stream and the server can only answer "Invalid form
 * data"), POST to /api/admin/upload, and return the stored `/uploads/...`
 * src. Throws with a readable message on any failure.
 *
 * Used by the properties-panel uploader and canvas image paste — keep
 * both on this one path so they can't drift.
 */
export async function uploadImageFile(rawFile: File): Promise<string> {
  const file = await downscaleImage(rawFile);
  if (file.size > UPLOAD_MAX_BYTES) {
    throw new Error(
      `File too large: ${(file.size / (1024 * 1024)).toFixed(1)} MB (max ${UPLOAD_MAX_MB} MB). ` +
        (file.type === "image/gif"
          ? "GIFs can't be compressed in-browser — trim it or convert to video."
          : "")
    );
  }
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/admin/upload", {
    method: "POST",
    body: fd,
  });
  const text = await res.text();
  let payload: { src?: string; error?: string } = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    // Non-JSON response — keep `text` for the error message.
  }
  if (!res.ok || !payload.src) {
    throw new Error(
      payload.error ??
        `Upload failed (${res.status}${text ? `: ${text.slice(0, 120)}` : ""})`
    );
  }
  return payload.src;
}
