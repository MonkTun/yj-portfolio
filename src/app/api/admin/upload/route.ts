import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

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

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (>${MAX_BYTES} bytes)` },
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

  // Suffix with a short timestamp to avoid collisions without leaking
  // millisecond precision into the URL.
  const stamp = Date.now().toString(36);
  const filename = `${stem}-${stamp}${ext}`;

  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(UPLOAD_DIR, filename), buf);

  return NextResponse.json({ src: `/uploads/${filename}` });
}
