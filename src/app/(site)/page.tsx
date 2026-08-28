import type { Metadata } from "next";
import { loadPage, loadSiteConfig } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";

// The home route reads no request data — the slug it renders comes entirely
// from content/site.json — so it prerenders at build time and ships from the
// CDN. Content is deploy-frozen in production (admin is dev-only, see
// src/proxy.ts). The editor previews pages at their own /<slug> URL via the
// catch-all route, so no ?preview= override is needed here.

async function resolveSlug(): Promise<{ slug: string; isConstruction: boolean }> {
  const config = await loadSiteConfig();
  // Construction-mode toggle wins over the assigned home slug.
  const slug = config.constructionMode
    ? config.constructionSlug
    : config.homeSlug;
  return { slug, isConstruction: config.constructionMode };
}

export async function generateMetadata(): Promise<Metadata> {
  const { slug, isConstruction } = await resolveSlug();
  try {
    const page = await loadPage(slug);
    return {
      title: page.meta.title,
      description: page.meta.description,
      robots: isConstruction ? { index: false, follow: false } : undefined,
    };
  } catch {
    return {
      title: "Youngje Park",
      robots: { index: false, follow: false },
    };
  }
}

export default async function Page() {
  const { slug } = await resolveSlug();
  const config = await loadSiteConfig();
  let page;
  try {
    page = await loadPage(slug);
  } catch {
    // Fall back to the construction page; if even that's missing, last
    // resort is whatever's named "construction".
    try {
      page = await loadPage(config.constructionSlug);
    } catch {
      page = await loadPage("construction");
    }
  }
  return <PageRenderer page={page} tags={config.tags} />;
}
