import Link from "next/link";
import { listPages } from "@/lib/content";

export const dynamic = "force-dynamic";

// Maps a content slug to the URL where it actually shows up in production.
// `construction` is the public landing; `404` is served via the not-found
// route; `home` is hidden behind ?preview= until the construction page is
// retired. Everything else falls back to /<slug> for now.
function publicLabel(slug: string): string {
  if (slug === "construction") return "/";
  if (slug === "404") return "(404 fallback)";
  if (slug === "home") return "/?preview=home";
  return `/${slug}`;
}

export default async function AdminIndex() {
  const slugs = await listPages();

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

        <ul className="mt-16 divide-y divide-border border-y border-border">
          {slugs.map((slug) => (
            <li key={slug}>
              <Link
                href={`/admin/edit/${slug}`}
                className="group flex items-baseline justify-between gap-6 py-6 transition-colors hover:bg-surface/40 px-2 -mx-2"
              >
                <div>
                  <p className="kicker">{publicLabel(slug)}</p>
                  <p className="font-display text-3xl mt-2">
                    {slug.split("/").pop()}
                  </p>
                </div>
                <span className="kicker text-accent transition-transform group-hover:translate-x-1">
                  Edit →
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {slugs.length === 0 && (
          <p className="mt-16 text-foreground/60 italic">
            No pages yet. Create JSON files under{" "}
            <code className="font-mono">content/pages/</code>.
          </p>
        )}
      </div>
    </main>
  );
}
