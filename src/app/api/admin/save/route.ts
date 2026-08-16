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

  // Pages render at `/` (the home/construction slug) and at their own
  // /<slug> URL via the catch-all, so bust both for the just-saved JSON.
  try {
    revalidatePath("/");
    revalidatePath(`/${body.slug}`);
  } catch {
    // revalidatePath can throw outside a render context in edge cases;
    // a soft-fail is fine in dev — the file is already written.
  }

  return NextResponse.json({ ok: true });
}
