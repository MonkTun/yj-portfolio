import type { Metadata } from "next";
import { loadPage } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";

const DEFAULT_PUBLIC_SLUG = "construction";

type Props = {
  searchParams: Promise<{ preview?: string }>;
};

async function resolveSlug(searchParams: Props["searchParams"]): Promise<string> {
  const { preview } = await searchParams;
  return typeof preview === "string" && preview.length > 0
    ? preview
    : DEFAULT_PUBLIC_SLUG;
}

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const slug = await resolveSlug(searchParams);
  try {
    const page = await loadPage(slug);
    return {
      title: page.meta.title,
      description: page.meta.description,
      robots:
        slug === DEFAULT_PUBLIC_SLUG
          ? { index: false, follow: false }
          : undefined,
    };
  } catch {
    return {
      title: "Youngje Park",
      robots: { index: false, follow: false },
    };
  }
}

export default async function Page({ searchParams }: Props) {
  const slug = await resolveSlug(searchParams);
  let page;
  try {
    page = await loadPage(slug);
  } catch {
    page = await loadPage(DEFAULT_PUBLIC_SLUG);
  }
  return <PageRenderer page={page} />;
}
