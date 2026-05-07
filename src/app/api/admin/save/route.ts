import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { savePage } from "@/lib/content";

export const runtime = "nodejs";

const bodySchema = z.object({
  slug: z.string().min(1),
  page: z.unknown(),
});

export async function POST(req: Request) {
  // Defense in depth — middleware already gates this, but never trust that.
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  try {
    await savePage(body.slug, body.page);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save page", detail: String(err) },
      { status: 400 }
    );
  }

  // Bust any cached server render of the affected route so the public site
  // reflects the just-saved JSON immediately.
  const publicPath = body.slug === "home" ? "/" : `/${body.slug}`;
  try {
    revalidatePath(publicPath);
  } catch {
    // revalidatePath can throw outside a render context in edge cases;
    // a soft-fail is fine in dev — the file is already written.
  }

  return NextResponse.json({ ok: true });
}
