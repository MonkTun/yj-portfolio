import { listPages, loadSiteConfig } from "@/lib/content";
import { RoutingPanel } from "@/components/admin/RoutingPanel";

export const dynamic = "force-dynamic";

export default async function RoutingIndex() {
  const [slugs, config] = await Promise.all([listPages(), loadSiteConfig()]);

  return (
    <>
      <header>
        <p className="kicker">§ 02 — Wiring</p>
        <h1 className="font-display text-6xl mt-4">Routing</h1>
        <p className="mt-4 text-foreground/70 italic max-w-2xl">
          Decides which page renders at <code className="font-sans">/</code>{" "}
          and what shows up for unknown URLs. Construction mode swaps the home
          slug for a placeholder — useful while the real homepage is unfinished.
        </p>
      </header>

      <div className="mt-10">
        <RoutingPanel initialConfig={config} pages={slugs} />
      </div>
    </>
  );
}
