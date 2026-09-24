import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { promises as fs } from "node:fs";
import path from "node:path";
import { BLOG_SLUG, createPost, unlistPage } from "@/lib/blog";
import { loadSiteConfig, savePage } from "@/lib/content";
import type { Page } from "@/lib/schema";

export const runtime = "nodejs";

// Same character set as content.ts pageFile() — keep in sync.
const slugRegex = /^[a-z0-9][a-z0-9-/]*$/i;

const bodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .refine((s) => slugRegex.test(s) && !s.includes("..") && !s.endsWith("/"), {
      message:
        "Slug must be lowercase letters, digits, dashes, and forward-slashes only.",
    }),
  title: z.string().min(1).max(120).optional(),
  /** Present = scaffold a blog post and add it to the post list
   *  (see lib/blog.ts) instead of creating a blank page. */
  post: z
    .object({
      date: z.string().trim().max(40),
      summary: z.string().trim().max(300).default(""),
    })
    .optional(),
});

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
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

  const file = path.join(process.cwd(), "content", "pages", `${body.slug}.json`);
  try {
    await fs.access(file);
    return NextResponse.json(
      { error: "A page with that slug already exists." },
      { status: 409 }
    );
  } catch {
    // Doesn't exist — good, we can create it.
  }

  let resized: string[] = [];
  try {
    if (body.post) {
      if (!body.slug.startsWith(`${BLOG_SLUG}/`) || !body.title) {
        return NextResponse.json(
          { error: `A post needs a title and a slug under ${BLOG_SLUG}/.` },
          { status: 400 }
        );
      }
      ({ resized } = await createPost({
        slug: body.slug,
        title: body.title,
        date: body.post.date,
        summary: body.post.summary,
      }));
    } else {
      const blank: Page = {
        meta: { title: body.title ?? body.slug },
        sections: [],
      };
      await savePage(body.slug, blank);
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create page", detail: String(err) },
      { status: 400 }
    );
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    // Outside render context — non-fatal in dev.
  }

  return NextResponse.json({ ok: true, slug: body.slug, resized });
}

const deleteBodySchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .refine((s) => slugRegex.test(s) && !s.includes("..") && !s.endsWith("/"), {
      message: "Invalid slug.",
    }),
});

export async function DELETE(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof deleteBodySchema>;
  try {
    body = deleteBodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  // Whatever's currently assigned to a routing role can't be deleted —
  // the public site would 500 on the next render. Site config is the
  // source of truth, not a hardcoded list.
  const siteConfig = await loadSiteConfig();
  const protectedSlugs = new Set([
    siteConfig.homeSlug,
    siteConfig.constructionSlug,
    siteConfig.notFoundSlug,
  ]);
  if (protectedSlugs.has(body.slug)) {
    return NextResponse.json(
      {
        error: `"${body.slug}" is currently assigned to a routing role (home / construction / 404). Reassign that role first.`,
      },
      { status: 400 }
    );
  }

  const file = path.join(process.cwd(), "content", "pages", `${body.slug}.json`);
  try {
    await fs.unlink(file);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete page", detail: String(err) },
      { status: 404 }
    );
  }

  // A deleted post comes off the post list with it, so the list never
  // links to a 404.
  let unlisted = 0;
  try {
    unlisted = await unlistPage(body.slug);
  } catch (err) {
    return NextResponse.json(
      {
        error: "Page deleted, but updating the post list failed",
        detail: String(err),
      },
      { status: 500 }
    );
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    // Outside render context — non-fatal in dev.
  }

  return NextResponse.json({ ok: true, unlisted });
}
