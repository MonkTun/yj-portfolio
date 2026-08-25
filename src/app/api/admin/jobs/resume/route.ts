import { NextResponse } from "next/server";
import {
  deleteResumeFile,
  listResumeFiles,
  readResumeFile,
  resumeFileExists,
  writeResumeFile,
} from "@/lib/jobs/store";

export const runtime = "nodejs";

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
// Matches next.config.ts proxyClientMaxBodySize (25 MB) with headroom.
const MAX_BYTES = 20 * 1024 * 1024;

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

function badName(): NextResponse {
  return NextResponse.json(
    {
      error:
        "File name must be like base.docx or tailored/some-app.docx (letters, digits, dashes).",
    },
    { status: 400 }
  );
}

/**
 * GET  /api/admin/jobs/resume            → { files: [{name, size, modified}] }
 * GET  /api/admin/jobs/resume?file=NAME  → docx binary
 * PUT  /api/admin/jobs/resume?file=NAME  → save raw docx body (editor Save / upload)
 * DELETE                                  → { name } removes a file
 */

export async function GET(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const name = new URL(req.url).searchParams.get("file");
  if (!name) {
    const files = await listResumeFiles();
    return NextResponse.json({ files });
  }

  try {
    const data = await readResumeFile(name);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": DOCX_MIME,
        "Content-Disposition": `attachment; filename="${name
          .split("/")
          .pop()}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid resume")) {
      return badName();
    }
    return NextResponse.json(
      { error: `No resume file "${name}".`, detail: String(err) },
      { status: 404 }
    );
  }
}

export async function PUT(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const url = new URL(req.url);
  const name = url.searchParams.get("file");
  if (!name) {
    return NextResponse.json(
      { error: "Missing ?file= name." },
      { status: 400 }
    );
  }
  // Uploading a brand-new file requires ?create=1 so a typo'd editor save
  // can't silently conjure files (mirrors the doc route's update-not-upsert).
  const create = url.searchParams.get("create") === "1";
  if (!create && !(await resumeFileExists(name).catch(() => false))) {
    return NextResponse.json(
      { error: `No resume file "${name}" — upload it first.` },
      { status: 404 }
    );
  }

  let data: Buffer;
  try {
    data = Buffer.from(await req.arrayBuffer());
  } catch (err) {
    return NextResponse.json(
      { error: "Couldn't read request body", detail: String(err) },
      { status: 400 }
    );
  }
  if (data.byteLength === 0) {
    return NextResponse.json({ error: "Empty file." }, { status: 400 });
  }
  if (data.byteLength > MAX_BYTES) {
    return NextResponse.json(
      { error: `File exceeds ${MAX_BYTES / 1024 / 1024} MB.` },
      { status: 413 }
    );
  }
  // docx files are zip archives — check the magic bytes ("PK").
  if (!(data[0] === 0x50 && data[1] === 0x4b)) {
    return NextResponse.json(
      { error: "Not a .docx file (bad file signature)." },
      { status: 415 }
    );
  }

  try {
    await writeResumeFile(name, data);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid resume")) {
      return badName();
    }
    return NextResponse.json(
      { error: "Failed to write file", detail: String(err) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, name, size: data.byteLength });
}

export async function DELETE(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let name: string;
  try {
    const body = (await req.json()) as { name?: string };
    if (!body.name) throw new Error("Missing name");
    name = body.name;
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  try {
    await deleteResumeFile(name);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid resume")) {
      return badName();
    }
    return NextResponse.json(
      { error: "Failed to delete file", detail: String(err) },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
