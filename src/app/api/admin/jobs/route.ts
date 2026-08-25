import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  APPLICATION_STATUSES,
  applicationSchema,
  applicationSourceSchema,
  contactSchema,
  eventSchema,
} from "@/lib/jobs/schema";
import {
  deleteApplication,
  loadApplications,
  upsertApplication,
} from "@/lib/jobs/store";

export const runtime = "nodejs";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/* ---------------- list ---------------- */

export async function GET() {
  const blocked = devOnly();
  if (blocked) return blocked;
  const data = await loadApplications();
  return NextResponse.json(data);
}

/* ---------------- create ---------------- */

const createSchema = z.object({
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  url: z.string().max(2000).default(""),
  location: z.string().max(200).default(""),
  source: applicationSourceSchema.default("manual"),
  status: z.enum(APPLICATION_STATUSES).default("bookmarked"),
  jd: z.string().max(200_000).default(""),
  deadline: z.string().max(40).default(""),
});

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof createSchema>;
  try {
    body = createSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const application = applicationSchema.parse({
    id: randomUUID(),
    company: body.company,
    role: body.role,
    url: body.url,
    location: body.location,
    source: body.source,
    status: body.status,
    jd: body.jd,
    dates: { saved: now, lastTouch: now, deadline: body.deadline },
  });

  try {
    await upsertApplication(application);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save application", detail: String(err) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, application });
}

/* ---------------- update ---------------- */

const updateSchema = z.object({
  id: z.string().min(1).max(64),
  patch: z
    .object({
      company: z.string().min(1).max(200),
      role: z.string().min(1).max(200),
      url: z.string().max(2000),
      location: z.string().max(200),
      status: z.enum(APPLICATION_STATUSES),
      jd: z.string().max(200_000),
      notes: z.string().max(50_000),
      tags: z.array(z.string().max(60)),
      contacts: z.array(contactSchema),
      resumeVersion: z.string().max(300),
      deadline: z.string().max(40),
    })
    .partial(),
  /** Optional event to append (log-a-touch, interview, etc.). */
  event: eventSchema.optional(),
});

export async function PUT(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof updateSchema>;
  try {
    body = updateSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  const current = await loadApplications();
  const existing = current.applications.find((a) => a.id === body.id);
  if (!existing) {
    return NextResponse.json(
      { error: `No application with id "${body.id}".` },
      { status: 404 }
    );
  }

  const now = new Date().toISOString();
  const { deadline, ...rest } = body.patch;
  const next = applicationSchema.parse({
    ...existing,
    ...rest,
    dates: {
      ...existing.dates,
      ...(deadline !== undefined ? { deadline } : {}),
      // Moving to applied stamps the applied date once.
      ...(body.patch.status === "applied" && !existing.dates.applied
        ? { applied: now }
        : {}),
      lastTouch: now,
    },
    events: body.event ? [...existing.events, body.event] : existing.events,
  });

  try {
    await upsertApplication(next);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save application", detail: String(err) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true, application: next });
}

/* ---------------- delete ---------------- */

const deleteSchema = z.object({ id: z.string().min(1).max(64) });

export async function DELETE(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof deleteSchema>;
  try {
    body = deleteSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  try {
    await deleteApplication(body.id);
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete application", detail: String(err) },
      { status: 500 }
    );
  }
  return NextResponse.json({ ok: true });
}
