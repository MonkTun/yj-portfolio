import { loadTheme } from "@/lib/content";
import { ThemePanel } from "@/components/admin/ThemePanel";

export const dynamic = "force-dynamic";

export default async function ThemeIndex() {
  const theme = await loadTheme();

  return (
    <>
      <header>
        <p className="kicker">§ 03 — Surface</p>
        <h1 className="font-display text-6xl mt-4">Palette</h1>
        <p className="mt-4 text-foreground/70 italic max-w-2xl">
          Edit the seven core color tokens that drive the entire site. Save as
          many palettes as you like; the active one is injected as CSS
          variables on <code className="font-mono">&lt;html&gt;</code>.
        </p>
      </header>

      <div className="mt-10">
        <ThemePanel initialTheme={theme} />
      </div>
    </>
  );
}
