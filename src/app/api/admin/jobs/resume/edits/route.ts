import { NextResponse } from "next/server";
import { z } from "zod";
import { wordCount } from "@/lib/jobs/claude";
import { applyParagraphEdits, docxText } from "@/lib/jobs/docx";
import { readResumeFile, writeResumeFile } from "@/lib/jobs/store";

export const runtime = "nodejs";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * POST /api/admin/jobs/resume/edits {file, edits} — apply a chat-proposed
 * paragraph edit list to a docx on disk (the studio reloads the document
 * afterwards). Same deterministic apply as the tailor pipeline.
 */

const bodySchema = z.object({
  file: z.string().min(1).max(300),
  edits: z
    .array(
      z.object({
        paragraph: z.number().int().min(0),
        text: z.string().max(2000),
      })
    )
    .min(1)
    .max(24),
});

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
    const source = await readResumeFile(body.file);
    const next = applyParagraphEdits(source, body.edits);
    await writeResumeFile(body.file, next);
    return NextResponse.json({
      ok: true,
      applied: body.edits.length,
      words: wordCount(docxText(next)),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to apply edits", detail: String(err) },
      { status: 500 }
    );
  }
}
