import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";

import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from "@/lib/upload-limits";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

/**
 * Slugify a filename: keep its extension, kebab-case the stem, drop
 * anything weird. Prevents directory-traversal and ugly URL chars.
 */
function safeName(original: string): { stem: string; ext: string } {
  const ext = path.extname(original).toLowerCase();
  const stem = path
    .basename(original, ext)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "image";
  return { stem, ext };
}

export async function POST(req: Request) {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid form data", detail: String(err) },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field" },
      { status: 400 }
    );
  }

  if (file.size > UPLOAD_MAX_BYTES) {
    return NextResponse.json(
      {
        error: `File too large: ${(file.size / (1024 * 1024)).toFixed(1)} MB (max ${UPLOAD_MAX_MB} MB)`,
      },
      { status: 413 }
    );
  }

  const { stem, ext } = safeName(file.name);
  if (!ALLOWED_EXT.has(ext)) {
    return NextResponse.json(
      { error: `Unsupported extension: ${ext || "(none)"}` },
      { status: 415 }
    );
  }

  let buf: Buffer = Buffer.from(await file.arrayBuffer());
  let outExt = ext;

  // Animated GIFs skip the browser-side downscale (there's no GIF encoder
  // in the browser — see lib/downscale-image.ts), so screen recordings
  // arrive here at full multi-MB size. Re-encode to animated WebP: same
  // frames and loop behavior, typically 5–10× smaller, so neither the git
  // repo nor visitors pay for the original. `next/image` passes animated
  // sources through unoptimized either way, so the stored size IS the
  // wire size. Falls back to the original bytes if sharp chokes.
  if (ext === ".gif") {
    try {
      const out = await sharp(buf, {
        animated: true,
        // Animated inputs decode as one tall "toilet roll" of frames —
        // a long recording can trip sharp's default pixel cap.
        limitInputPixels: false,
      })
        .webp({ quality: 80, effort: 4 })
        .toBuffer();
      if (out.length < buf.length) {
        buf = out;
        outExt = ".webp";
      }
    } catch (err) {
      console.warn("[upload] GIF→WebP re-encode failed, keeping original:", err);
    }
  }

  // Suffix with a short timestamp to avoid collisions without leaking
  // millisecond precision into the URL.
  const stamp = Date.now().toString(36);
  const filename = `${stem}-${stamp}${outExt}`;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buf);

  return NextResponse.json({ src: `/uploads/${filename}` });
}
