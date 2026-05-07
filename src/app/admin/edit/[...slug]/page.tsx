import { notFound } from "next/navigation";
import { listPages, loadPage } from "@/lib/content";
import { Editor } from "@/components/editor/Editor";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function EditPage({ params }: Props) {
  const { slug: parts } = await params;
  const slug = parts.join("/");

  let page;
  try {
    page = await loadPage(slug);
  } catch {
    notFound();
  }

  // Available pages feed the button-block "link to page" dropdown.
  let availablePages: string[] = [];
  try {
    availablePages = await listPages();
  } catch {
    availablePages = [];
  }

  return (
    <Editor
      slug={slug}
      initialPage={page}
      availablePages={availablePages}
    />
  );
}
