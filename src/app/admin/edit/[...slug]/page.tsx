import { notFound } from "next/navigation";
import { listPages, loadPage } from "@/lib/content";
import { listDocs, loadDocSource } from "@/lib/markdown";
import { Editor } from "@/components/editor/Editor";
import { MarkdownEditor } from "@/components/editor/MarkdownEditor";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string[] }>;
};

export default async function EditPage({ params }: Props) {
  const { slug: parts } = await params;
  const slug = parts.join("/");

  // Grid page first — same precedence as the public catch-all route, where
  // a JSON page shadows a markdown page with the same slug.
  const page = await loadPage(slug).catch(() => null);
  if (page) {
    // Available pages feed the button-block "link to page" dropdown —
    // markdown pages are linkable targets too.
    let availablePages: string[] = [];
    try {
      const [pages, docs] = await Promise.all([listPages(), listDocs()]);
      availablePages = [...new Set([...pages, ...docs])].sort();
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

  const doc = await loadDocSource(slug).catch(() => null);
  if (doc) {
    return (
      <MarkdownEditor
        slug={slug}
        initialData={doc.data}
        initialBody={doc.body}
      />
    );
  }

  notFound();
}
