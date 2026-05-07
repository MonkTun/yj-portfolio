import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadPage } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";

// Catch-all that serves any page authored under content/pages/<slug>.json
// (including nested slugs like work/dawngeon). The home route at (site)/page.tsx
// still wins for "/", so this kicks in for everything else.

type Props = {
  params: Promise<{ slug: string[] }>;
};

function resolveSlug(parts: string[]): string {
  return parts.join("/");
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { slug: parts } = await params;
  try {
    const page = await loadPage(resolveSlug(parts));
    return {
      title: page.meta.title,
      description: page.meta.description,
    };
  } catch {
    return {};
  }
}

export default async function CatchAllPage({ params }: Props) {
  const { slug: parts } = await params;
  let page;
  try {
    page = await loadPage(resolveSlug(parts));
  } catch {
    notFound();
  }
  return <PageRenderer page={page} />;
}
