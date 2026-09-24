import type { Metadata } from "next";
import { loadPage, loadSiteConfig } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteAnnouncement } from "@/components/site/SiteAnnouncement";

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
  // The root not-found route renders outside the (site) layout, so the
  // navigation bar has to be mounted here too.
  return (
    <>
      <SiteAnnouncement announcement={config.announcement} />
      <SiteNav nav={config.nav} />
      <PageRenderer page={page} tags={config.tags} mirrors={config.mirrors} />
    </>
  );
}
