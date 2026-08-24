import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPages, loadPage } from "@/lib/content";
import { listDocs, loadDoc } from "@/lib/markdown";
import { PageRenderer } from "@/components/PageRenderer";
import { MarkdownPage } from "@/components/MarkdownPage";

// Catch-all that serves any page authored under content/pages/<slug>.json
// (grid pages, from the editor) or content/docs/<slug>.md (markdown pages,
// written by hand / in Obsidian). JSON is tried first, so a grid page
// shadows a markdown page with the same slug. The home route at
// (site)/page.tsx still wins for "/", so this kicks in for everything else.

type Props = {
  params: Promise<{ slug: string[] }>;
};

// Content is deploy-frozen in production (the admin editor and its API are
// dev-only, see src/proxy.ts), so every authored page can be prerendered at
// build time and served from the CDN. Dev still renders on demand, so editor
// saves show up without a rebuild.
export async function generateStaticParams() {
  const [pages, docs] = await Promise.all([listPages(), listDocs()]);
  const slugs = [...new Set([...pages, ...docs])];
  return slugs.map((s) => ({ slug: s.split("/") }));
}

function resolveSlug(parts: string[]): string {
  return parts.join("/");
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug: parts } = await params;
  const slug = resolveSlug(parts);
  try {
    const page = await loadPage(slug);
    return {
      title: page.meta.title,
      description: page.meta.description,
    };
  } catch {
    try {
      const doc = await loadDoc(slug);
      return {
        title: doc.meta.title,
        description: doc.meta.description,
      };
    } catch {
      return {};
    }
  }
}

export default async function CatchAllPage({ params }: Props) {
  const { slug: parts } = await params;
  const slug = resolveSlug(parts);
  const page = await loadPage(slug).catch(() => null);
  if (page) return <PageRenderer page={page} />;
  const doc = await loadDoc(slug).catch(() => null);
  if (doc) return <MarkdownPage doc={doc} />;
  notFound();
}
