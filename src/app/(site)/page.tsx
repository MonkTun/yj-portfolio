import type { Metadata } from "next";
import { loadPage, loadSiteConfig } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";

type Props = {
  searchParams: Promise<{ preview?: string }>;
};

async function resolveSlug(
  searchParams: Props["searchParams"]
): Promise<{ slug: string; isConstruction: boolean }> {
  const { preview } = await searchParams;
  const config = await loadSiteConfig();
  if (typeof preview === "string" && preview.length > 0) {
    return { slug: preview, isConstruction: false };
  }
  // Construction-mode toggle wins over the assigned home slug.
  const slug = config.constructionMode
    ? config.constructionSlug
    : config.homeSlug;
  return { slug, isConstruction: config.constructionMode };
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const { slug, isConstruction } = await resolveSlug(searchParams);
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

export default async function Page({ searchParams }: Props) {
  const { slug } = await resolveSlug(searchParams);
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
  return <PageRenderer page={page} />;
}
