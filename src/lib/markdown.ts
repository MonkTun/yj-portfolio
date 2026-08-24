import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import matter from "gray-matter";
import { imageSize } from "image-size";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import { z } from "zod";
import type { Image as MdImage, Root } from "mdast";

/* ============================================================
   Markdown pages — the writing-first authoring path.

   A page is a single .md file under content/docs/ (the Obsidian-
   editable surface); its slug is its path minus the extension
   (content/docs/work/thang.md → /work/thang). Frontmatter carries
   the page meta; the body is CommonMark + GFM rendered through the
   editorial template in components/MarkdownPage.tsx.

   Grid pages (content/pages/*.json) and markdown pages share the
   route space; the catch-all route tries JSON first, so a JSON page
   shadows a markdown page with the same slug.
   ============================================================ */

const DOCS_ROOT = path.join(process.cwd(), "content", "docs");
const PUBLIC_ROOT = path.join(process.cwd(), "public");

export const docMetaSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  /** Draft flag — false hides the page from production builds while
   *  keeping it renderable in dev. */
  published: z.boolean().default(true),
});

export type DocMeta = z.infer<typeof docMetaSchema>;

export type Doc = {
  slug: string;
  meta: DocMeta;
  tree: Root;
};

function docFile(slug: string) {
  // Same traversal guard as content.ts pageFile.
  if (!/^[a-z0-9][a-z0-9-/]*$/i.test(slug) || slug.includes("..")) {
    throw new Error(`Invalid doc slug: ${slug}`);
  }
  return path.join(DOCS_ROOT, `${slug}.md`);
}

/** Files that live in the docs folder but are not pages. */
function isReservedName(name: string) {
  return name.startsWith("_") || name.startsWith(".") || name === "README.md";
}

const parser = unified().use(remarkParse).use(remarkGfm);

/**
 * Normalize an authored image/link src to a site-servable URL.
 * Obsidian (configured with vault = repo root, absolute markdown links)
 * writes `public/attachments/foo.png`; the site serves that at
 * `/attachments/foo.png`. Rooted paths and external URLs pass through.
 */
export function resolveDocSrc(src: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(src)) return src; // http:, https:, data:
  if (src.startsWith("/") || src.startsWith("#")) return src;
  const cleaned = src.replace(/^(\.\/)+/, "");
  if (cleaned.startsWith("public/")) return "/" + cleaned.slice("public/".length);
  // Obsidian note-to-note link: content/docs/work/thang.md → /work/thang
  if (cleaned.startsWith("content/docs/") && cleaned.endsWith(".md")) {
    return "/" + cleaned.slice("content/docs/".length, -".md".length);
  }
  return "/" + cleaned;
}

/**
 * Stash intrinsic dimensions on every local image node (node.data.width /
 * .height) so the renderer can give next/image real aspect ratios at build
 * time instead of guessing. Missing files or unreadable formats are left
 * unstamped and fall back to a 16/9 frame.
 */
async function stampImageDimensions(tree: Root) {
  const images: MdImage[] = [];
  (function walk(node: { children?: unknown[] }) {
    for (const child of (node.children ?? []) as Array<{
      type?: string;
      children?: unknown[];
    }>) {
      if (child.type === "image") images.push(child as unknown as MdImage);
      if (child.children) walk(child);
    }
  })(tree);

  await Promise.all(
    images.map(async (img) => {
      const url = resolveDocSrc(img.url);
      if (!url.startsWith("/")) return;
      try {
        const file = path.join(PUBLIC_ROOT, decodeURIComponent(url));
        // Guard against traversal out of public/.
        if (!file.startsWith(PUBLIC_ROOT + path.sep)) return;
        const buf = await fs.readFile(file);
        const dim = imageSize(buf);
        if (dim.width && dim.height) {
          img.data = { ...img.data, width: dim.width, height: dim.height };
        }
      } catch {
        // Not on disk (external, typo mid-edit) — renderer falls back.
      }
    })
  );
}

/**
 * Load a markdown page by slug. Throws on missing file / bad frontmatter —
 * hard fail in the build, same policy as loadPage. Unpublished docs load
 * in dev (so drafts preview) but throw in production.
 */
export const loadDoc = cache(async (slug: string): Promise<Doc> => {
  const raw = await fs.readFile(docFile(slug), "utf8");
  const { data, content } = matter(raw);
  const meta = docMetaSchema.parse(data);
  if (!meta.published && process.env.NODE_ENV === "production") {
    throw new Error(`Doc "${slug}" is unpublished`);
  }
  const tree = parser.parse(content) as Root;
  await stampImageDimensions(tree);
  return { slug, meta, tree };
});

/* ---------------- raw source (admin editor) ---------------- */

export type DocSource = {
  slug: string;
  /** The full frontmatter object as authored — may carry keys beyond
   *  docMetaSchema (Obsidian plugins, future fields). Preserved on save. */
  data: Record<string, unknown>;
  meta: DocMeta;
  /** The markdown body, frontmatter stripped. */
  body: string;
};

export async function docExists(slug: string): Promise<boolean> {
  try {
    await fs.access(docFile(slug));
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a doc as editable source (frontmatter object + raw body) for the
 * admin markdown editor — no mdast parsing, no publish gating (the admin
 * is dev-only and must see drafts).
 */
export async function loadDocSource(slug: string): Promise<DocSource> {
  const raw = await fs.readFile(docFile(slug), "utf8");
  const { data, content } = matter(raw);
  const meta = docMetaSchema.parse(data);
  return { slug, data, meta, body: content };
}

/**
 * Persist a doc from editable source. Validates the frontmatter against
 * docMetaSchema but writes the full data object, so unknown keys a
 * hand-authored file carries survive an admin save round-trip.
 */
export async function saveDocSource(
  slug: string,
  source: { data: Record<string, unknown>; body: string }
): Promise<void> {
  docMetaSchema.parse(source.data);
  const file = docFile(slug);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, matter.stringify(source.body, source.data), "utf8");
}

/** List all published markdown pages under content/docs, as slugs. */
export async function listDocs(): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string, prefix = "") {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // content/docs may not exist yet
    }
    for (const entry of entries) {
      if (isReservedName(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith(".md")) {
        const stem = entry.name.replace(/\.md$/, "");
        const slug = prefix ? `${prefix}/${stem}` : stem;
        try {
          const raw = await fs.readFile(full, "utf8");
          const meta = docMetaSchema.parse(matter(raw).data);
          if (meta.published || process.env.NODE_ENV !== "production") {
            out.push(slug);
          }
        } catch {
          // Unparseable frontmatter — skip rather than break the build;
          // loadDoc will surface the real error if the page is visited.
        }
      }
    }
  }
  await walk(DOCS_ROOT);
  return out.sort();
}
