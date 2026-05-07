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

  // Every editable page renders through `/` (with an optional ?preview=<slug>
  // override) or via the not-found route, so a single revalidate of `/` is
  // enough to bust any cached render of the just-saved JSON.
  try {
    revalidatePath("/");
  } catch {
    // revalidatePath can throw outside a render context in edge cases;
    // a soft-fail is fine in dev — the file is already written.
  }

  return NextResponse.json({ ok: true });
}
