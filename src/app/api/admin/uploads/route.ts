import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

/**
 * Lists every file currently in /public/uploads as a usable image library
 * for the editor. Newest first, by mtime.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  let entries: string[];
  try {
    entries = await fs.readdir(UPLOAD_DIR);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      return NextResponse.json({ items: [] });
    }
    return NextResponse.json(
      { error: "Failed to read uploads", detail: String(err) },
      { status: 500 }
    );
  }

  const items = await Promise.all(
    entries
      .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
      .map(async (name) => {
        const stat = await fs.stat(path.join(UPLOAD_DIR, name));
        return {
          src: `/uploads/${name}`,
          name,
          size: stat.size,
          mtime: stat.mtimeMs,
        };
      })
  );

  items.sort((a, b) => b.mtime - a.mtime);
  return NextResponse.json({ items });
}
