import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { loadPage, savePage } from "@/lib/content";

export const runtime = "nodejs";

const slugRegex = /^[a-z0-9][a-z0-9-/]*$/i;

const bodySchema = z.object({
  /** Slug of the page to clone. */
  source: z
    .string()
    .min(1)
    .max(120)
    .refine(
      (s) => slugRegex.test(s) && !s.includes("..") && !s.endsWith("/"),
      { message: "Invalid source slug." }
    ),
  /** Optional explicit destination slug — if omitted, we auto-pick "<source>-copy"
   *  (then -copy-2, -copy-3, …). */
  target: z
    .string()
    .min(1)
    .max(120)
    .refine(
      (s) => slugRegex.test(s) && !s.includes("..") && !s.endsWith("/"),
      { message: "Invalid target slug." }
    )
    .optional(),
});

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

function pageFile(slug: string) {
  return path.join(process.cwd(), "content", "pages", `${slug}.json`);
}

async function pickFreeSlug(base: string): Promise<string> {
  // Try "base-copy", then "base-copy-2", …, up to 99. Bail loudly rather
  // than looping forever on a pathological filesystem state.
  const candidates = [
    `${base}-copy`,
    ...Array.from({ length: 98 }, (_, i) => `${base}-copy-${i + 2}`),
  ];
  for (const cand of candidates) {
    try {
      await fs.access(pageFile(cand));
    } catch {
      return cand;
    }
  }
  throw new Error(`Couldn't find a free slug after 99 tries from "${base}".`);
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  // Read the source through loadPage so the schema validates it before we
  // copy — better to fail here than write garbage that breaks the editor.
  let source;
  try {
    source = await loadPage(body.source);
  } catch (err) {
    return NextResponse.json(
      { error: `Source page "${body.source}" not found`, detail: String(err) },
      { status: 404 }
    );
  }

  const target = body.target ?? (await pickFreeSlug(body.source));

  // If the caller picked a target explicitly, honor that — but refuse to
  // overwrite an existing page.
  if (body.target) {
    try {
      await fs.access(pageFile(target));
      return NextResponse.json(
        { error: `Target "${target}" already exists.` },
        { status: 409 }
      );
    } catch {
      // doesn't exist, good
    }
  }

  const cloned = {
    ...source,
    meta: {
      ...source.meta,
      title: `${source.meta.title} (copy)`,
    },
  };

  try {
    await savePage(target, cloned);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to write duplicate", detail: String(err) },
      { status: 500 }
    );
  }

  try {
    revalidatePath("/admin");
  } catch {
    // non-fatal
  }

  return NextResponse.json({ ok: true, slug: target });
}
