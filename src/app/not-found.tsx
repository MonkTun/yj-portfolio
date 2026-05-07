import type { Metadata } from "next";
import { loadPage, loadSiteConfig } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const config = await loadSiteConfig();
    const page = await loadPage(config.notFoundSlug);
    return {
      title: page.meta.title,
      description: page.meta.description,
    };
  } catch {
    return { title: "Not found" };
  }
}

export default async function NotFound() {
  const config = await loadSiteConfig();
  let page;
  try {
    page = await loadPage(config.notFoundSlug);
  } catch {
    page = await loadPage("404");
  }
  return <PageRenderer page={page} />;
}
