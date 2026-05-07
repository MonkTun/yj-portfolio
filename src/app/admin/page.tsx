import Link from "next/link";
import { listPages } from "@/lib/content";
import { NewPageForm } from "@/components/admin/NewPageForm";
import { DeletePageButton } from "@/components/admin/DeletePageButton";

export const dynamic = "force-dynamic";

// Maps a content slug to the URL where it actually shows up in production.
// `construction` is the public landing; `404` is served via the not-found
// route. Every other slug is reachable at /<slug> via the catch-all route.
function publicLabel(slug: string): string {
  if (slug === "construction") return "/";
  if (slug === "404") return "(404 fallback)";
  return `/${slug}`;
}

// Same set as the API enforces — kept in lockstep so the UI doesn't promise
// what the server refuses.
const PROTECTED_SLUGS = new Set(["construction", "404"]);

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
            <li
              key={slug}
              className="group flex items-baseline justify-between gap-6 py-6 transition-colors hover:bg-surface/40 px-2 -mx-2"
            >
              <Link
                href={`/admin/edit/${slug}`}
                className="flex-1 flex items-baseline justify-between gap-6"
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
              {!PROTECTED_SLUGS.has(slug) && (
                <DeletePageButton slug={slug} />
              )}
            </li>
          ))}
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
