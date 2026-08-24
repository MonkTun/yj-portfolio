import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { docExists, loadDocSource, saveDocSource } from "@/lib/markdown";

export const runtime = "nodejs";

// Same character set as markdown.ts docFile() — keep in sync.
const slugRegex = /^[a-z0-9][a-z0-9-/]*$/i;

const slugSchema = z
  .string()
  .min(1)
  .max(120)
  .refine((s) => slugRegex.test(s) && !s.includes("..") && !s.endsWith("/"), {
    message:
      "Slug must be lowercase letters, digits, dashes, and forward-slashes only.",
  });

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

function gridPageFile(slug: string) {
  return path.join(process.cwd(), "content", "pages", `${slug}.json`);
}

async function gridPageExists(slug: string): Promise<boolean> {
  try {
    await fs.access(gridPageFile(slug));
    return true;
  } catch {
    return false;
  }
}

function revalidateAdmin() {
  try {
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    // Outside render context — non-fatal in dev.
  }
}

/* ---------------- create / duplicate ---------------- */

const createSchema = z.object({
  slug: slugSchema.optional(),
  title: z.string().min(1).max(120).optional(),
  /** When set, clone this doc instead of creating a blank one. A free
   *  "<source>-copy[-n]" slug is picked unless `slug` is also given. */
  source: slugSchema.optional(),
});

async function pickFreeSlug(base: string): Promise<string> {
  const candidates = [
    `${base}-copy`,
    ...Array.from({ length: 98 }, (_, i) => `${base}-copy-${i + 2}`),
  ];
  for (const cand of candidates) {
    if (!(await docExists(cand))) return cand;
  }
  throw new Error(`Couldn't find a free slug after 99 tries from "${base}".`);
}

const STARTER_BODY = `
#### Kicker

Start writing. Conventions live in content/docs/README.md — \`####\` headings
render as kickers, image rows become galleries, a paragraph holding only a
link becomes a button.
`;

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  let slug: string;
  let data: Record<string, unknown>;
  let content: string;

  if (body.source) {
    let source;
    try {
      source = await loadDocSource(body.source);
    } catch (err) {
      return NextResponse.json(
        { error: `Source doc "${body.source}" not found`, detail: String(err) },
        { status: 404 }
      );
    }
    slug = body.slug ?? (await pickFreeSlug(body.source));
    data = { ...source.data, title: `${source.meta.title} (copy)` };
    content = source.body;
  } else {
    if (!body.slug) {
      return NextResponse.json(
        { error: "A slug is required." },
        { status: 400 }
      );
    }
    slug = body.slug;
    data = { title: body.title ?? slug, published: true };
    content = STARTER_BODY;
  }

  if (await docExists(slug)) {
    return NextResponse.json(
      { error: "A markdown page with that slug already exists." },
      { status: 409 }
    );
  }
  // A grid page at the same slug would shadow the markdown page (the
  // catch-all route tries JSON first), leaving the new page unreachable.
  if (await gridPageExists(slug)) {
    return NextResponse.json(
      {
        error: `A grid page already owns /${slug} — a markdown page there would never render.`,
      },
      { status: 409 }
    );
  }

  try {
    await saveDocSource(slug, { data, body: content });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create page", detail: String(err) },
      { status: 400 }
    );
  }

  revalidateAdmin();
  return NextResponse.json({ ok: true, slug });
}

/* ---------------- save ---------------- */

const saveSchema = z.object({
  slug: slugSchema,
  data: z.record(z.string(), z.unknown()),
  body: z.string().max(1_000_000),
});

export async function PUT(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof saveSchema>;
  try {
    body = saveSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  // Saving is an update, not an upsert — refuse to conjure files for slugs
  // that were never created (typo'd URLs, stale tabs).
  if (!(await docExists(body.slug))) {
    return NextResponse.json(
      { error: `No markdown page at "${body.slug}".` },
      { status: 404 }
    );
  }

  try {
    await saveDocSource(body.slug, { data: body.data, body: body.body });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save", detail: String(err) },
      { status: 400 }
    );
  }

  revalidateAdmin();
  return NextResponse.json({ ok: true });
}

/* ---------------- delete ---------------- */

const deleteSchema = z.object({ slug: slugSchema });

export async function DELETE(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof deleteSchema>;
  try {
    body = deleteSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  // Routing roles (home / construction / 404) only ever load grid pages,
  // so no role protection is needed here — any doc is safe to delete.
  const file = path.join(
    process.cwd(),
    "content",
    "docs",
    `${body.slug}.md`
  );
  try {
    await fs.unlink(file);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete page", detail: String(err) },
      { status: 404 }
    );
  }

  revalidateAdmin();
  return NextResponse.json({ ok: true });
}
