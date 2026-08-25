import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchPostingFromUrl } from "@/lib/jobs/ats";

export const runtime = "nodejs";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * Best-effort autofill from a job posting URL. Greenhouse / Lever / Ashby
 * expose public no-auth JSON APIs with the full JD (fetchers shared with the
 * discovery feed in src/lib/jobs/ats.ts); anything else falls back to
 * fetching the page and stripping tags (which many boards block — the
 * add-job form always keeps a paste-the-JD fallback).
 */

const bodySchema = z.object({ url: z.string().min(1).max(2000) });

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

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
    new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Not a valid URL." }, { status: 400 });
  }

  try {
    const posting = await fetchPostingFromUrl(body.url);
    if (!posting) {
      return NextResponse.json(
        { error: "Couldn't extract this posting — paste the JD instead." },
        { status: 422 }
      );
    }
    return NextResponse.json({ ok: true, posting });
  } catch (err) {
    return NextResponse.json(
      {
        error: "Fetch failed — the site may block bots. Paste the JD instead.",
        detail: String(err),
      },
      { status: 502 }
    );
  }
}
