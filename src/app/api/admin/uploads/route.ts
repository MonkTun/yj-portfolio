import { promises as fs } from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const PUBLIC_DIR = path.join(process.cwd(), "public");

// Folders under /public that the library exposes as one merged image pool.
// Each entry maps a directory name to its public URL prefix. `uploads` is
// where the in-app uploader writes; `projects` holds vendored project
// imagery restored from the previous Vite build. Both surface as picks.
const LIBRARY_ROOTS: Array<{ dir: string; urlPrefix: string }> = [
  { dir: "uploads", urlPrefix: "/uploads" },
  { dir: "projects", urlPrefix: "/projects" },
];

const IMAGE_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);

type Item = { src: string; name: string; size: number; mtime: number };

async function listRoot(dir: string, urlPrefix: string): Promise<Item[]> {
  const abs = path.join(PUBLIC_DIR, dir);
  let entries: string[];
  try {
    entries = await fs.readdir(abs);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
  return Promise.all(
    entries
      .filter((name) => IMAGE_EXT.has(path.extname(name).toLowerCase()))
      .map(async (name) => {
        const stat = await fs.stat(path.join(abs, name));
        return {
          src: `${urlPrefix}/${name}`,
          name,
          size: stat.size,
          mtime: stat.mtimeMs,
        };
      })
  );
}

/**
 * Lists every file currently in /public/uploads and /public/projects as a
 * merged image library for the editor. Newest first, by mtime.
 */
export async function GET() {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  try {
    const lists = await Promise.all(
      LIBRARY_ROOTS.map(({ dir, urlPrefix }) => listRoot(dir, urlPrefix))
    );
    const items = lists.flat().sort((a, b) => b.mtime - a.mtime);
    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read library", detail: String(err) },
      { status: 500 }
    );
  }
}
