import { NextResponse } from "next/server";
import { z } from "zod";
import { docxText } from "@/lib/jobs/docx";
import { scoreResume, type ScoreReport } from "@/lib/jobs/keywords";
import { applicationSchema, type Application, type MatchScore } from "@/lib/jobs/schema";
import {
  listResumeFiles,
  loadApplications,
  readResumeFile,
  saveApplications,
} from "@/lib/jobs/store";

export const runtime = "nodejs";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * POST /api/admin/jobs/score
 *   {}               → recompute matchScore for every application with a JD
 *   {id}             → recompute one application (persisted)
 *   {id, resume}     → score against one specific resume file (tailored/
 *                      allowed) and return the full report WITHOUT persisting
 *                      — the studio side panel's live checklist.
 */

const bodySchema = z.object({
  id: z.string().min(1).max(64).optional(),
  resume: z.string().max(300).optional(),
});

/** Every non-tailored resume file as plain text. */
async function loadVariantTexts(): Promise<{ name: string; text: string }[]> {
  const files = (await listResumeFiles()).filter(
    (f) => !f.name.startsWith("tailored/")
  );
  const out: { name: string; text: string }[] = [];
  for (const f of files) {
    try {
      out.push({ name: f.name, text: docxText(await readResumeFile(f.name)) });
    } catch {
      // Unreadable docx — skip rather than fail the whole recompute.
    }
  }
  return out;
}

function bestMatch(
  app: Application,
  variants: { name: string; text: string }[]
): MatchScore | undefined {
  if (!app.jd.trim() || variants.length === 0) return undefined;
  let best: { report: ScoreReport; variant: string } | null = null;
  for (const v of variants) {
    const report = scoreResume({
      jd: app.jd,
      title: app.role,
      resumeText: v.text,
    });
    if (!best || report.score > best.report.score) {
      best = { report, variant: v.name };
    }
  }
  if (!best) return undefined;
  return {
    score: best.report.score,
    variant: best.variant,
    matched: best.report.matched,
    missing: best.report.missing,
    computedAt: new Date().toISOString(),
  };
}

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json().catch(() => ({})));
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  const current = await loadApplications();

  // One-off report against a named resume file (no persist).
  if (body.id && body.resume) {
    const app = current.applications.find((a) => a.id === body.id);
    if (!app) {
      return NextResponse.json(
        { error: `No application with id "${body.id}".` },
        { status: 404 }
      );
    }
    if (!app.jd.trim()) {
      return NextResponse.json(
        { error: "This application has no JD to score against." },
        { status: 422 }
      );
    }
    try {
      const text = docxText(await readResumeFile(body.resume));
      const report = scoreResume({ jd: app.jd, title: app.role, resumeText: text });
      return NextResponse.json({ ok: true, report, resume: body.resume });
    } catch (err) {
      return NextResponse.json(
        { error: `Couldn't read resume "${body.resume}".`, detail: String(err) },
        { status: 404 }
      );
    }
  }

  const variants = await loadVariantTexts();
  if (variants.length === 0) {
    return NextResponse.json(
      { error: "No resume files to score against — upload one in the studio." },
      { status: 422 }
    );
  }

  const targets = body.id
    ? current.applications.filter((a) => a.id === body.id)
    : current.applications;
  if (body.id && targets.length === 0) {
    return NextResponse.json(
      { error: `No application with id "${body.id}".` },
      { status: 404 }
    );
  }

  let updated = 0;
  const next = current.applications.map((app) => {
    if (!targets.includes(app)) return app;
    const matchScore = bestMatch(app, variants);
    if (!matchScore) return app;
    updated += 1;
    return applicationSchema.parse({ ...app, matchScore });
  });

  try {
    await saveApplications({ applications: next });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save scores", detail: String(err) },
      { status: 500 }
    );
  }

  if (body.id) {
    const app = next.find((a) => a.id === body.id);
    return NextResponse.json({ ok: true, application: app, updated });
  }
  return NextResponse.json({ ok: true, applications: next, updated });
}
