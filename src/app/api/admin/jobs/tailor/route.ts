import { NextResponse } from "next/server";
import path from "node:path";
import { z } from "zod";
import { bulletsForKeywords, loadBank } from "@/lib/jobs/bank";
import { streamClaude, wordCount } from "@/lib/jobs/claude";
import {
  applyParagraphEdits,
  docxParagraphs,
  docxText,
  type ParagraphEdit,
} from "@/lib/jobs/docx";
import { scoreResume } from "@/lib/jobs/keywords";
import {
  enforceOnePage,
  estimateLines,
  linesAfter,
  onePageBudget,
} from "@/lib/jobs/onepage";
import { applicationSchema } from "@/lib/jobs/schema";
import {
  listResumeFiles,
  loadApplications,
  readResumeFile,
  upsertApplication,
  writeResumeFile,
} from "@/lib/jobs/store";

export const runtime = "nodejs";
// The claude CLI can take a couple of minutes on a full resume pass.
export const maxDuration = 300;

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * POST /api/admin/jobs/tailor {id} — STREAMS ndjson progress events:
 *   {type:"stage", stage, label}   pipeline stage transitions (progress bar)
 *   {type:"thought", text}         live model output (its tailoring plan)
 *   {type:"result", ...}           final payload
 *   {type:"error", error}          terminal failure
 *
 * Pipeline: pick variant → gap report → headless `claude -p` (streamed,
 * subscription-billed — NEVER an API key) returning a strategy paragraph +
 * JSON edit list → one-page word-budget guard (475–600, aim ~550; one
 * re-prompt, then deterministic edit-dropping) → apply to
 * tailored/<app-id>.docx → stamp resumeVersion + event.
 */

const bodySchema = z.object({
  id: z.string().min(1).max(64),
  /** Optional explicit source variant (defaults to matchScore.variant / best). */
  variant: z.string().max(300).optional(),
});

const editListSchema = z.object({
  edits: z
    .array(
      z.object({
        paragraph: z.number().int().min(0),
        text: z.string().max(2000),
      })
    )
    .max(24),
});

/** One-page budget (YJ's spec): 475–600 words, aim ~550. */
const WORDS_MIN = 475;
const WORDS_MAX = 600;
const WORDS_AIM = 550;

const BANNED_BUZZWORDS =
  "motivated, motivation, passionate, synergy, synergies, team player, " +
  "results-driven, dynamic, innovative, cutting-edge, world-class, " +
  "go-getter, hard-working, detail-oriented, thought leader, utilize, " +
  "utilized, leverage, leveraged, responsible for";

/** Pull the first JSON object out of a model reply (handles ``` fences). */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in model reply");
  return JSON.parse(candidate.slice(start, end + 1));
}

function buildPrompt(params: {
  paragraphs: string[];
  jd: string;
  role: string;
  company: string;
  missing: string[];
  bankLines: string[];
  totalWords: number;
  sourceLines: number;
  budgetLines: number;
  adjustNote?: string;
}): string {
  const {
    paragraphs,
    jd,
    role,
    company,
    missing,
    bankLines,
    totalWords,
    sourceLines,
    budgetLines,
    adjustNote,
  } = params;
  const numbered = paragraphs
    .map((p, i) => `[${i}] ${p || "(empty)"}`)
    .join("\n");
  return `You are tailoring a one-page resume for a specific job posting.

Reply in EXACTLY this shape:
1. First, a short plain-prose plan (≤120 words): which bullets you'll rewrite, what you'll cut, which keywords you'll surface. This is shown live to the candidate.
2. Then the edit list in a \`\`\`json fence: {"edits": [{"paragraph": <index>, "text": "<replacement plain text>"}]}. An edit with "text": "" deletes that paragraph.

TARGET ROLE: ${role} at ${company}

JOB DESCRIPTION (truncated):
${jd.slice(0, 12_000)}

MISSING KEYWORDS (highest priority first — already weighted Preferred Qualifications > Requirements > Responsibilities; weave in the ones that are truthful for this candidate, skip the rest):
${missing.slice(0, 15).join(", ") || "(none)"}

RESUME PARAGRAPHS (numbered; these indices are the only valid edit targets; current total ${totalWords} words):
${numbered}

${bankLines.length > 0 ? `BULLET BANK (verified past work — the ONLY permitted source of material not already in the resume; you may rephrase these):\n${bankLines.map((l) => `- ${l}`).join("\n")}\n` : ""}
HARD RULES:
- ONE PAGE, NO EXCEPTIONS. The edited resume must fit ${budgetLines} estimated lines or fewer (the source sits at ${sourceLines}; a paragraph costs ~ceil(characters/90) lines, an empty paragraph costs 1). The way to get there is NOT shrinking every bullet — it is DROPPING ENTIRE EXPERIENCES. Rank every experience by relevance to THIS job and cut from the bottom, regardless of which section it sits in: filler is filler whether it's a PROJECTS or an ORGANIZATIONS entry, and an entry that matches this JD's stack must be KEPT even if it lives under ORGANIZATIONS. Keeping every experience is a failure. Deleting an experience means deleting its org-name line, role/date line, every bullet, AND the blank spacer paragraph after it (all with "text": "").
- Also target ${WORDS_MIN}–${WORDS_MAX} words, aim ~${WORDS_AIM} — but the line budget wins whenever the two conflict.
- NEVER invent experience, numbers, employers, or technologies. Only rephrase what a paragraph already says, or substitute facts from the bullet bank.
- BULLET FORMULA: rewrite kept bullets as "Accomplished [X] as measured by [Y], by doing [Z]" — lead with the accomplishment, quantify with a metric that already exists in the resume or bank, close with how. Where no honest metric exists, lead with the concrete outcome instead; never fabricate one.
- BANNED WORDS (never use): ${BANNED_BUZZWORDS}. Use plain, specific verbs instead.
- Never touch the name, contact line, or section headings of sections you keep — but a fully-emptied section's heading must be deleted too.
- At most 24 edits (deletions count). High-impact rewrites + whole-experience cuts beat many cosmetic tweaks.${adjustNote ? `\n- ${adjustNote}` : ""}`;
}

/** Total words if `edits` were applied to `paragraphs`. */
function wordsAfter(paragraphs: string[], edits: ParagraphEdit[]): number {
  return paragraphs.reduce((sum, p, i) => {
    const edit = edits.find((e) => e.paragraph === i);
    return sum + wordCount(edit ? edit.text : p);
  }, 0);
}

/** Deterministic fallback: drop the edits pushing the count out of range. */
function clampEdits(
  paragraphs: string[],
  edits: ParagraphEdit[]
): ParagraphEdit[] {
  let current = [...edits];
  const growth = (e: ParagraphEdit) =>
    wordCount(e.text) - wordCount(paragraphs[e.paragraph]);
  for (let guard = 0; guard < edits.length; guard++) {
    const total = wordsAfter(paragraphs, current);
    if (total > WORDS_MAX) {
      // Over budget → drop the biggest grower.
      const worst = current.filter((e) => growth(e) > 0).sort((a, b) => growth(b) - growth(a))[0];
      if (!worst) break;
      current = current.filter((e) => e !== worst);
    } else if (total < WORDS_MIN) {
      // Under budget → drop the biggest cutter (usually a deletion).
      const worst = current.filter((e) => growth(e) < 0).sort((a, b) => growth(a) - growth(b))[0];
      if (!worst) break;
      current = current.filter((e) => e !== worst);
    } else {
      break;
    }
  }
  return current;
}

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

  const { applications } = await loadApplications();
  const app = applications.find((a) => a.id === body.id);
  if (!app) {
    return NextResponse.json(
      { error: `No application with id "${body.id}".` },
      { status: 404 }
    );
  }
  if (!app.jd.trim()) {
    return NextResponse.json(
      { error: "This application has no JD — paste one before tailoring." },
      { status: 422 }
    );
  }

  const files = (await listResumeFiles()).filter(
    (f) => !f.name.startsWith("tailored/")
  );
  if (files.length === 0) {
    return NextResponse.json(
      { error: "No resume files — upload one in the studio first." },
      { status: 422 }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        // ---- stage: pick variant + gap report ----
        send({ type: "stage", stage: "score", label: "Scoring resume variants" });
        let variant =
          body.variant ??
          (app.matchScore?.variant &&
          files.some((f) => f.name === app.matchScore?.variant)
            ? app.matchScore.variant
            : "");
        let source: Buffer;
        let report: ReturnType<typeof scoreResume>;
        if (variant) {
          source = await readResumeFile(variant);
          report = scoreResume({ jd: app.jd, title: app.role, resumeText: docxText(source) });
        } else {
          let best:
            | { name: string; buf: Buffer; report: ReturnType<typeof scoreResume> }
            | null = null;
          for (const f of files) {
            const buf = await readResumeFile(f.name);
            const r = scoreResume({ jd: app.jd, title: app.role, resumeText: docxText(buf) });
            if (!best || r.score > best.report.score) best = { name: f.name, buf, report: r };
          }
          variant = best!.name;
          source = best!.buf;
          report = best!.report;
        }

        send({ type: "stage", stage: "gap", label: `Gap report vs ${variant}` });
        const paragraphs = docxParagraphs(source);
        const totalWords = paragraphs.reduce((s, p) => s + wordCount(p), 0);
        const sourceLines = estimateLines(paragraphs);
        const budgetLines = onePageBudget(sourceLines);
        const bank = await loadBank();
        const bankLines = bulletsForKeywords(bank, report.missing, 12).map(
          (b) => `${b.text} [${b.section}]`
        );

        // ---- stage: model (streamed) with word-budget re-prompt ----
        const cwd = path.join(process.cwd(), "content", "jobs");
        let edits: ParagraphEdit[] = [];
        let adjustNote: string | undefined;
        for (let attempt = 0; attempt < 2; attempt++) {
          send({
            type: "stage",
            stage: attempt === 0 ? "model" : "retry",
            label:
              attempt === 0
                ? "Claude is drafting the edit list"
                : "Word budget missed — asking Claude to adjust",
          });
          const { result } = await streamClaude({
            prompt: buildPrompt({
              paragraphs,
              jd: app.jd,
              role: app.role,
              company: app.company,
              missing: report.missing,
              bankLines,
              totalWords,
              sourceLines,
              budgetLines,
              adjustNote,
            }),
            cwd,
            onEvent: (ev) => send({ type: "thought", text: ev.text }),
          });
          const parsed = editListSchema.parse(extractJson(result));
          edits = parsed.edits.filter((e) => e.paragraph < paragraphs.length);

          const newWords = wordsAfter(paragraphs, edits);
          const newLines = linesAfter(paragraphs, edits);
          send({
            type: "stage",
            stage: "check",
            label: `Draft: ~${newLines} lines (budget ${budgetLines}), ${newWords} words`,
          });
          const linesOk = newLines <= budgetLines;
          const wordsOk = newWords >= WORDS_MIN && newWords <= WORDS_MAX;
          if (linesOk && wordsOk) break;
          adjustNote = !linesOk
            ? `Your previous edit list still measures ~${newLines} estimated lines — ${newLines - budgetLines} over the ${budgetLines}-line one-page budget. You did not cut enough. DROP one or two more entire experiences, choosing the LEAST relevant to this JD whichever section they're in: delete their org line, role/date line, every bullet, and the trailing blank paragraph.`
            : newWords > WORDS_MAX
              ? `Your previous edit list left the resume at ${newWords} words — over the ${WORDS_MAX}-word ceiling. Cut ${newWords - WORDS_AIM}+ words by deleting the least-relevant whole bullets.`
              : `Your previous edit list left the resume at ${newWords} words — under the ${WORDS_MIN}-word floor, which reads as thin. Expand kept bullets with bank material toward ~${WORDS_AIM} words while staying within the ${budgetLines}-line budget.`;
        }

        // ONE PAGE NO MATTER WHAT: if the model still didn't cut enough,
        // drop the least-JD-relevant experience blocks deterministically
        // (ORGANIZATIONS before PROJECTS).
        if (linesAfter(paragraphs, edits) > budgetLines) {
          const enforced = enforceOnePage({
            paragraphs,
            edits,
            budgetLines,
            jd: app.jd,
          });
          edits = enforced.edits;
          if (enforced.dropped.length > 0) {
            send({
              type: "stage",
              stage: "enforce",
              label: `One-page enforcement: dropped ${enforced.dropped.join("; ")}`,
            });
          }
        } else if (wordsAfter(paragraphs, edits) > WORDS_MAX) {
          edits = clampEdits(paragraphs, edits);
        }

        if (edits.length === 0) {
          send({ type: "error", error: "The model returned no usable edits — try again or tailor by hand." });
          controller.close();
          return;
        }

        // ---- stage: apply ----
        send({ type: "stage", stage: "apply", label: "Applying edits to the docx" });
        const tailoredName = `tailored/${app.id}.docx`;
        const tailored = applyParagraphEdits(source, edits);
        await writeResumeFile(tailoredName, tailored);

        const afterText = docxText(tailored);
        const afterReport = scoreResume({ jd: app.jd, title: app.role, resumeText: afterText });
        const afterWords = wordCount(afterText);
        const afterLines = estimateLines(docxParagraphs(tailored));

        const now = new Date().toISOString();
        const next = applicationSchema.parse({
          ...app,
          resumeVersion: tailoredName,
          events: [
            ...app.events,
            {
              date: now,
              kind: "note",
              note: `Tailored resume generated from ${variant} (${edits.length} edits, score ${report.score} → ${afterReport.score}, ${afterWords} words, ~${afterLines}/${sourceLines} lines).`,
            },
          ],
          dates: { ...app.dates, lastTouch: now },
        });
        await upsertApplication(next);

        send({
          type: "result",
          file: tailoredName,
          variant,
          edits: edits.length,
          before: report.score,
          after: afterReport.score,
          words: afterWords,
          lines: afterLines,
          sourceLines,
          report: afterReport,
          application: next,
        });
      } catch (err) {
        send({ type: "error", error: "Tailoring failed", detail: String(err) });
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-store",
    },
  });
}
