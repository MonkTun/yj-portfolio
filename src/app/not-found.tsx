import type { Metadata } from "next";
import { loadPage } from "@/lib/content";
import { PageRenderer } from "@/components/PageRenderer";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const page = await loadPage("404");
    return {
      title: page.meta.title,
      description: page.meta.description,
    };
  } catch {
    return { title: "Not found" };
  }
}

export default async function NotFound() {
  const page = await loadPage("404");
  return <PageRenderer page={page} />;
}
