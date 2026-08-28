import type { Page, TagDef } from "@/lib/schema";
import { SectionRenderer } from "./SectionRenderer";
import { TagLibraryProvider } from "./TagLibraryContext";

type Props = {
  page: Page;
  /** Project-wide tag library (site.json) — resolves Tags-block names to
   *  pill colors. Omitting it renders tags in the accent fallback. */
  tags?: TagDef[];
};

/**
 * Walks `page.sections` and renders each as a SectionRenderer. The public
 * site uses this directly; the editor wraps each section in its own frame
 * but reuses SectionRenderer underneath via `renderBlock`.
 */
export function PageRenderer({ page, tags = [] }: Props) {
  return (
    <TagLibraryProvider tags={tags}>
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </TagLibraryProvider>
  );
}
