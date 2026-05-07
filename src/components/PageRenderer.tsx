import type { Page } from "@/lib/schema";
import { SectionRenderer } from "./SectionRenderer";

type Props = {
  page: Page;
};

/**
 * Walks `page.sections` and renders each as a SectionRenderer. The public
 * site uses this directly; the editor wraps each section in its own frame
 * but reuses SectionRenderer underneath via `renderBlock`.
 */
export function PageRenderer({ page }: Props) {
  return (
    <>
      {page.sections.map((section) => (
        <SectionRenderer key={section.id} section={section} />
      ))}
    </>
  );
}
