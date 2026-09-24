import {
  listPages,
  loadPage,
  loadSiteConfig,
  savePage,
  saveSiteConfig,
} from "@/lib/content";
import { growMirrorInstances, postListRows, type ListRows } from "@/lib/post-list";
import { autoStackSection } from "@/lib/responsive";
import {
  sectionTemplates,
  type BlockSeed,
  type SectionTemplate,
} from "@/lib/section-templates";
import type {
  Page,
  PostListItem,
  PostListProps,
  Section,
  SiteConfig,
} from "@/lib/schema";

/**
 * Blog post pipeline — server-only (reads and writes content/).
 *
 * Creating a post from /admin/pages used to mean: make a blank `blog/` page,
 * drop in the Post header template, build the outro and footer by hand, then
 * open the post list and add an entry. `createPost` does all of it in one
 * go: the page is scaffolded, the entry goes to the top of the shared list,
 * and every page showing the list gets its box grown to fit the new row.
 */

/** The shared post list — on the blog index and in every post's outro. */
export const POSTS_MIRROR_ID = "mir_posts";

/** Posts live under `blog/`; `blog` itself is the index. */
export const BLOG_SLUG = "blog";

export type NewPost = {
  slug: string;
  title: string;
  date: string;
  summary: string;
};

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

/** Text blocks hold rich-text HTML, so plain form input is escaped. */
function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** The post list mirror — `mir_posts`, or the first post list if it was renamed. */
function postsMirror(
  config: SiteConfig,
): { id: string; props: PostListProps } | undefined {
  const m =
    config.mirrors.find((m) => m.id === POSTS_MIRROR_ID) ??
    config.mirrors.find((m) => m.source.type === "postList");
  if (!m || m.source.type !== "postList") return undefined;
  return { id: m.id, props: m.source.props };
}

/** "/blog/hello#top" → "blog/hello". Undefined for external or empty links. */
function hrefSlug(href: string | undefined): string | undefined {
  if (!href?.startsWith("/")) return undefined;
  return href.replace(/[?#].*$/, "").replace(/\/+$/, "").slice(1);
}

/** Slugs of the pages the post list links to. */
export function listedSlugs(config: SiteConfig): Set<string> {
  const items = postsMirror(config)?.props.items ?? [];
  return new Set(
    items.map((i) => hrefSlug(i.href)).filter((s): s is string => !!s),
  );
}

function withIds(
  seed: ReturnType<SectionTemplate["build"]>,
  id = newId("sec"),
): Section {
  return {
    ...seed,
    id,
    blocks: seed.blocks.map((b) => ({ ...b, id: newId("blk") })),
  } as Section;
}

/** The "Post header" template with the post's own date, title and standfirst. */
function postHeader(post: NewPost): Section {
  const template = sectionTemplates.find((t) => t.id === "post-header");
  if (!template) throw new Error('Section template "post-header" is missing.');
  const seed = template.build();
  for (const b of seed.blocks) {
    if (b.type !== "text") continue;
    if (b.props.variant === "kicker") b.props.content = escapeHtml(post.date);
    if (b.props.variant === "h1") b.props.content = escapeHtml(post.title);
    if (b.props.variant === "body" && post.summary) {
      b.props.content = `<em>${escapeHtml(post.summary)}</em>`;
    }
  }
  return autoStackSection(withIds(seed));
}

/** One body paragraph in the standfirst's column, ready to write into. */
function postBody(): Section {
  return autoStackSection(
    withIds({
      background: { type: "transparent" },
      padding: "md",
      minHeight: "auto",
      align: "top",
      blocks: [
        {
          type: "text",
          layout: { col: 2, colSpan: 7, row: 1, rowSpan: 12 },
          props: {
            content: "Start writing here.",
            variant: "body",
            align: "left",
            color: "foreground",
          },
        },
      ],
    }),
  );
}

/**
 * The case-study outro, for posts: the shared list, then back to the blog.
 * The list goes in one row tall — `createPost` grows it to fit its entries
 * with the same pass that grows every other instance, which also moves the
 * button down to sit under it.
 */
function postOutro(listId: string | undefined): Section {
  const blocks: BlockSeed[] = [];
  if (listId) {
    // No bleed — a bled list clips its number and arrow at the viewport edge.
    blocks.push({
      type: "mirror",
      layout: { col: 1, colSpan: 12, row: 1, rowSpan: 1 },
      props: { mirrorId: listId },
    });
  }
  blocks.push({
    type: "button",
    layout: { col: 2, colSpan: 3, row: listId ? 4 : 1, rowSpan: 3 },
    mobile: { layout: { col: 1, colSpan: 12 } },
    props: {
      label: "← Back to the blog",
      href: `/${BLOG_SLUG}`,
      variant: "ghost",
      align: "left",
      newTab: false,
    },
  });
  return withIds({
    background: { type: "transparent" },
    padding: "lg",
    minHeight: "auto",
    align: "top",
    blocks,
  });
}

/**
 * A fresh copy of the site footer — the first section of mirror instances of
 * `mir_footer_*` on the first of `slugs` that has one. Copied rather than
 * hard-coded so a post picks up whatever the footer layout currently is.
 */
async function copyFooter(slugs: string[]): Promise<Section | undefined> {
  for (const slug of slugs) {
    let page: Page;
    try {
      page = await loadPage(slug);
    } catch {
      continue;
    }
    const footer = page.sections.find((s) =>
      s.blocks.some(
        (b) => b.type === "mirror" && b.props.mirrorId.startsWith("mir_footer_"),
      ),
    );
    if (footer) {
      const copy = structuredClone(footer);
      return {
        ...copy,
        id: "sec_footer",
        blocks: copy.blocks.map((b) => ({ ...b, id: newId("blk") })),
      };
    }
  }
  return undefined;
}

/**
 * Write `content/pages/<slug>.json` as a ready-to-write post, add it to the
 * top of the post list, and grow the list on every page that shows it.
 * The caller checks the slug is free. Returns the pages whose list was grown.
 */
export async function createPost(post: NewPost): Promise<{ resized: string[] }> {
  const config = structuredClone(await loadSiteConfig());
  const list = postsMirror(config);

  let rows: ListRows | undefined;
  if (list) {
    const entry: PostListItem = {
      title: post.title,
      date: post.date,
      summary: post.summary,
      href: `/${post.slug}`,
    };
    list.props.items = [entry, ...list.props.items];
    rows = postListRows(list.props);
  }

  const footer = await copyFooter([BLOG_SLUG, config.homeSlug]);
  const draft: Page = {
    meta: {
      title: `${post.title} — Youngje Park`,
      ...(post.summary ? { description: post.summary } : {}),
    },
    sections: [
      postHeader(post),
      postBody(),
      postOutro(list?.id),
      ...(footer ? [footer] : []),
    ],
  };
  const page =
    (list && rows && growMirrorInstances(draft, list.id, rows)) || draft;
  await savePage(post.slug, page);

  if (!list || !rows) return { resized: [] };
  await saveSiteConfig(config);

  const resized: string[] = [];
  for (const slug of await listPages()) {
    if (slug === post.slug) continue;
    let existing: Page;
    try {
      existing = await loadPage(slug);
    } catch {
      continue; // an unparseable page isn't this flow's to fix
    }
    const grown = growMirrorInstances(existing, list.id, rows);
    if (grown) {
      await savePage(slug, grown);
      resized.push(slug);
    }
  }
  return { resized };
}

/**
 * Take `slug` off the post list — run when its page is deleted, so the list
 * never links to a 404. Returns how many entries were removed.
 */
export async function unlistPage(slug: string): Promise<number> {
  const config = structuredClone(await loadSiteConfig());
  const list = postsMirror(config);
  if (!list) return 0;
  const before = list.props.items.length;
  list.props.items = list.props.items.filter((i) => hrefSlug(i.href) !== slug);
  const removed = before - list.props.items.length;
  if (removed > 0) await saveSiteConfig(config);
  return removed;
}
