import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { listPages, loadSiteConfig, saveSiteConfig } from "@/lib/content";
import { siteConfigSchema } from "@/lib/schema";

export const runtime = "nodejs";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  const config = await loadSiteConfig();
  return NextResponse.json(config);
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  // Merge with the current config so callers can patch a single field
  // without re-sending the whole object.
  const current = await loadSiteConfig();
  const merged = {
    ...current,
    ...(typeof body === "object" && body !== null ? body : {}),
  };

  const parsed = siteConfigSchema.safeParse(merged);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid site config", detail: parsed.error.message },
      { status: 400 }
    );
  }

  // The slugs being assigned must actually exist as pages — otherwise the
  // public site would 500 the moment someone hits "/".
  const slugs = new Set(await listPages());
  const required: Array<keyof typeof parsed.data> = [
    "homeSlug",
    "constructionSlug",
    "notFoundSlug",
  ];
  for (const k of required) {
    const slug = parsed.data[k] as string;
    if (!slugs.has(slug)) {
      return NextResponse.json(
        {
          error: `Page "${slug}" doesn't exist — assign one that's in your pages list.`,
        },
        { status: 400 }
      );
    }
  }

  try {
    await saveSiteConfig(parsed.data);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save", detail: String(err) },
      { status: 500 }
    );
  }

  try {
    revalidatePath("/");
    revalidatePath("/admin");
  } catch {
    // Outside render context — non-fatal in dev.
  }

  return NextResponse.json({ ok: true, config: parsed.data });
}
