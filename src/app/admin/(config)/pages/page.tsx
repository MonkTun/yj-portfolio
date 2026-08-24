import Link from "next/link";
import { listPages, loadSiteConfig } from "@/lib/content";
import { listDocs } from "@/lib/markdown";
import { NewPageForm } from "@/components/admin/NewPageForm";
import { PageRowMenu } from "@/components/admin/PageRowMenu";
import type { SiteConfig } from "@/lib/schema";

export const dynamic = "force-dynamic";

export type PageKind = "grid" | "md";

type Entry = { slug: string; kind: PageKind };

// Where each slug actually shows up on the public site, given the current
// site config. The slug currently assigned a routing role gets a
// distinguishing label; everything else is reachable at /<slug> via the
// catch-all route.
function publicLabel(slug: string, config: SiteConfig): string {
  if (config.constructionMode && slug === config.constructionSlug) return "/";
  if (!config.constructionMode && slug === config.homeSlug) return "/";
  if (slug === config.notFoundSlug) return "(404 fallback)";
  return `/${slug}`;
}

function roleBadges(slug: string, config: SiteConfig): string[] {
  const out: string[] = [];
  if (slug === config.homeSlug) out.push("home");
  if (slug === config.constructionSlug) out.push("construction");
  if (slug === config.notFoundSlug) out.push("404");
  return out;
}

const ROOT_GROUP = "__root__";

// The leading folder segment of a slug doubles as its group. Pages without a
// slash sit in a default root group rendered first; everything else groups
// alphabetically under its folder name (e.g. "work/dawngeon" → "work").
function groupFor(slug: string): string {
  const i = slug.indexOf("/");
  return i === -1 ? ROOT_GROUP : slug.slice(0, i);
}

function leafName(slug: string): string {
  return slug.split("/").pop() ?? slug;
}

type Group = { key: string; label: string; entries: Entry[] };

function buildGroups(entries: Entry[]): Group[] {
  const map = new Map<string, Entry[]>();
  for (const entry of entries) {
    const key = groupFor(entry.slug);
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  const bySlug = (a: Entry, b: Entry) => a.slug.localeCompare(b.slug);
  const root: Group | null = map.has(ROOT_GROUP)
    ? {
        key: ROOT_GROUP,
        label: "Pages",
        entries: map.get(ROOT_GROUP)!.slice().sort(bySlug),
      }
    : null;
  const folders: Group[] = [...map.entries()]
    .filter(([k]) => k !== ROOT_GROUP)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      label: key,
      entries: list.slice().sort(bySlug),
    }));
  return root ? [root, ...folders] : folders;
}

export default async function PagesIndex() {
  const [gridSlugs, docSlugs, config] = await Promise.all([
    listPages(),
    listDocs(),
    loadSiteConfig(),
  ]);

  // One row per slug. On a collision the grid page wins — same precedence
  // as the public catch-all route, where JSON shadows markdown.
  const bySlug = new Map<string, Entry>();
  for (const slug of docSlugs) bySlug.set(slug, { slug, kind: "md" });
  for (const slug of gridSlugs) bySlug.set(slug, { slug, kind: "grid" });
  const entries = [...bySlug.values()];
  const groups = buildGroups(entries);

  return (
    <>
      <header>
        <p className="kicker">01 — Content</p>
        <h1 className="font-display text-6xl mt-4">Pages</h1>
        <p className="mt-4 text-foreground/70 italic max-w-2xl">
          Grid pages live in{" "}
          <code className="font-sans text-sm">content/pages/</code> (the visual
          editor); markdown pages live in{" "}
          <code className="font-sans text-sm">content/docs/</code> (writing-first,
          also editable in Obsidian). Save, then{" "}
          <code className="font-sans text-sm">git commit</code> to publish. Use
          a slash in the slug (e.g.{" "}
          <code className="font-sans text-sm">work/new-thing</code>) to file a
          page under a group.
        </p>
      </header>

      <div className="mt-12 space-y-12">
        {groups.map((group) => (
          <PageGroup key={group.key} group={group} config={config} />
        ))}
      </div>

      {entries.length === 0 && (
        <p className="mt-16 text-foreground/60 italic">
          No pages yet — use the form below to create one.
        </p>
      )}

      <NewPageForm existing={entries.map((e) => e.slug)} />
    </>
  );
}

function PageGroup({
  group,
  config,
}: {
  group: Group;
  config: SiteConfig;
}) {
  return (
    <section>
      <header className="flex items-baseline justify-between gap-4 pb-3 border-b border-border">
        <h2 className="kicker text-foreground">{group.label}</h2>
        <span className="kicker text-foreground/40">
          {group.entries.length} {group.entries.length === 1 ? "page" : "pages"}
        </span>
      </header>
      <ul className="divide-y divide-border">
        {group.entries.map(({ slug, kind }) => {
          const badges = roleBadges(slug, config);
          return (
            <li
              key={slug}
              className="group flex items-baseline justify-between gap-6 py-6 transition-colors hover:bg-surface/40 px-2 -mx-2"
            >
              <Link
                href={`/admin/edit/${slug}`}
                className="flex-1 flex items-baseline justify-between gap-6"
              >
                <div>
                  <p className="kicker flex items-center gap-2 flex-wrap">
                    <span>{publicLabel(slug, config)}</span>
                    {kind === "md" && (
                      <span className="px-1.5 py-0.5 rounded-sm bg-surface border border-border text-foreground/60 text-[10px]">
                        markdown
                      </span>
                    )}
                    {badges.map((b) => (
                      <span
                        key={b}
                        className="px-1.5 py-0.5 rounded-sm bg-accent/15 text-accent text-[10px]"
                      >
                        {b}
                      </span>
                    ))}
                  </p>
                  <p className="font-display text-3xl mt-2">
                    {leafName(slug)}
                  </p>
                </div>
                <span className="kicker text-accent transition-transform group-hover:translate-x-1">
                  Edit →
                </span>
              </Link>
              <PageRowMenu slug={slug} kind={kind} config={config} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
