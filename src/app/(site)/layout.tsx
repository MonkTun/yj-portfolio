import { loadSiteConfig } from "@/lib/content";
import { SiteNav } from "@/components/site/SiteNav";
import { SiteAnnouncement } from "@/components/site/SiteAnnouncement";

// Public-site shell: the announcement strip and the fixed navigation bar
// above every authored page.
// Reads content/site.json only (no request data) so every route under
// (site) stays statically prerenderable — see the note in [...slug]/page.tsx.
export default async function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const config = await loadSiteConfig();
  return (
    <>
      <SiteAnnouncement announcement={config.announcement} />
      <SiteNav nav={config.nav} />
      {children}
    </>
  );
}
