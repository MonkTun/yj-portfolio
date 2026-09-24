import type { MirrorDef, Page, TagDef } from "@/lib/schema";
import { SectionRenderer } from "./SectionRenderer";
import { TagLibraryProvider } from "./TagLibraryContext";
import { MirrorLibraryProvider } from "./MirrorLibraryContext";
import { LightboxProvider } from "./Lightbox";

type Props = {
  page: Page;
  /** Project-wide tag library (site.json) — resolves Tags-block names to
   *  pill colors. Omitting it renders tags in the accent fallback. */
  tags?: TagDef[];
  /** Mirror library (site.json) — resolves `mirror` instances to the source
   *  block they render. Omitting it renders every instance as nothing. */
  mirrors?: MirrorDef[];
};

/**
 * Walks `page.sections` and renders each as a SectionRenderer. The public
 * site uses this directly; the editor wraps each section in its own frame
 * but reuses SectionRenderer underneath via `renderBlock`. The image
 * lightbox lives here for that reason — public pages get click-to-enlarge,
 * the editor canvas (which never mounts this) keeps click-to-select.
 */
export function PageRenderer({ page, tags = [], mirrors = [] }: Props) {
  return (
    <TagLibraryProvider tags={tags}>
      <MirrorLibraryProvider value={{ mirrors }}>
        <LightboxProvider>
          {page.sections.map((section) => (
            <SectionRenderer key={section.id} section={section} />
          ))}
        </LightboxProvider>
      </MirrorLibraryProvider>
    </TagLibraryProvider>
  );
}
