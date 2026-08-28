import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listPages, loadPage, loadSiteConfig } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";

// Catch-all that serves any page authored under content/pages/<slug>.json
// (including nested slugs like work/dawngeon). The home route at (site)/page.tsx
// still wins for "/", so this kicks in for everything else.

type Props = {
  params: Promise<{ slug: string[] }>;
};

// Content is deploy-frozen in production (the admin editor and its API are
// dev-only, see src/proxy.ts), so every authored page can be prerendered at
// build time and served from the CDN. Dev still renders on demand, so editor
// saves show up without a rebuild.
export async function generateStaticParams() {
  const slugs = await listPages();
  return slugs.map((s) => ({ slug: s.split("/") }));
}

function resolveSlug(parts: string[]): string {
  return parts.join("/");
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug: parts } = await params;
  try {
    const page = await loadPage(resolveSlug(parts));
    return {
      title: page.meta.title,
      description: page.meta.description,
    };
  } catch {
    return {};
  }
}

export default async function CatchAllPage({ params }: Props) {
  const { slug: parts } = await params;
  let page;
  try {
    page = await loadPage(resolveSlug(parts));
  } catch {
    notFound();
  }
  // Tag library for Tags blocks — file read, no request data, so the
  // route stays statically prerenderable.
  const config = await loadSiteConfig();
  return <PageRenderer page={page} tags={config.tags} />;
}
