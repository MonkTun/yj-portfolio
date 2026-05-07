import Link from "next/link";
import { listPages, loadSiteConfig } from "@/lib/content";
import { NewPageForm } from "@/components/admin/NewPageForm";
import { RoutingPanel } from "@/components/admin/RoutingPanel";
import { PageRowMenu } from "@/components/admin/PageRowMenu";
import type { SiteConfig } from "@/lib/schema";

export const dynamic = "force-dynamic";

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

export default async function AdminIndex() {
  const [slugs, config] = await Promise.all([listPages(), loadSiteConfig()]);

  return (
    <main className="px-12 py-20">
      <div className="mx-auto max-w-4xl">
        <p className="kicker">§ Editor — local only</p>
        <h1 className="font-display text-6xl mt-4">Pages</h1>
        <p className="mt-4 text-foreground/70 italic max-w-2xl">
          The editor writes JSON straight to{" "}
          <code className="font-mono text-sm">content/pages/</code>. Save, then{" "}
          <code className="font-mono text-sm">git commit</code> to publish.
        </p>

        <div className="mt-12">
          <RoutingPanel initialConfig={config} pages={slugs} />
        </div>

        <ul className="mt-12 divide-y divide-border border-y border-border">
          {slugs.map((slug) => {
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
                      {slug.split("/").pop()}
                    </p>
                  </div>
                  <span className="kicker text-accent transition-transform group-hover:translate-x-1">
                    Edit →
                  </span>
                </Link>
                <PageRowMenu slug={slug} config={config} />
              </li>
            );
          })}
        </ul>

        {slugs.length === 0 && (
          <p className="mt-16 text-foreground/60 italic">
            No pages yet — use the form below to create one.
          </p>
        )}

        <NewPageForm existing={slugs} />
      </div>
    </main>
  );
}
