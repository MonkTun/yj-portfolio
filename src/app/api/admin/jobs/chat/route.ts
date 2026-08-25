import { NextResponse } from "next/server";
import path from "node:path";
import { z } from "zod";
import { streamClaude, wordCount } from "@/lib/jobs/claude";
import { docxParagraphs } from "@/lib/jobs/docx";
import { scoreResume } from "@/lib/jobs/keywords";
import { loadApplications, readResumeFile } from "@/lib/jobs/store";

export const runtime = "nodejs";
export const maxDuration = 300;

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * POST /api/admin/jobs/chat — resume-studio chat, streamed ndjson:
 *   {type:"delta", text}              live assistant tokens
 *   {type:"done", sessionId, result}  full reply + session id for --resume
 *   {type:"error", error}
 *
 * Each turn re-reads the open docx server-side and prepends the CURRENT
 * numbered paragraphs, so edit proposals always use fresh indices even
 * after an apply. First turn (no sessionId) also carries the JD + gap
 * report when an application id is given. Headless `claude -p --resume`
 * keeps the conversation (subscription-billed — NEVER an API key).
 */

const bodySchema = z.object({
  message: z.string().min(1).max(8000),
  file: z.string().min(1).max(300),
  appId: z.string().max(64).optional(),
  sessionId: z.string().max(100).optional(),
});

const SYSTEM_PROMPT = `You are a resume-editing assistant embedded in a docx studio. Be concise and concrete — short answers, no filler.

When you propose changes to the document, put them in a fenced block the studio can apply directly:
\`\`\`edits
{"edits": [{"paragraph": <index from the CURRENT DOCUMENT listing>, "text": "<replacement plain text>"}]}
\`\`\`
An edit with "text": "" deletes that paragraph. Only propose edits when asked for changes; plain questions get plain answers.

Rules for any text you write into the resume:
- NEVER invent experience, numbers, employers, or technologies — only rephrase what the document or the conversation already establishes.
- ONE PAGE, always. The document must never grow: whenever an edit adds words, cut at least as much elsewhere in the same edit list. Keep 475–600 total words (aim ~550). Dropping entire weak experiences beats shrinking every bullet — pick the LEAST JD-relevant entries whichever section they're in (delete the org line, role/date line, bullets, and the blank spacer after them); a relevant ORGANIZATIONS entry outranks a filler PROJECTS entry.
- Bullet formula: "Accomplished [X] as measured by [Y], by doing [Z]" — accomplishment first, honest metric, then how.
- Banned words: motivated, motivation, passionate, synergy, synergies, team player, results-driven, dynamic, innovative, cutting-edge, world-class, go-getter, hard-working, detail-oriented, thought leader, utilize, leveraged, responsible for.
- Keyword priority when tailoring to a JD: Preferred Qualifications > Requirements > Responsibilities.`;

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

  let paragraphs: string[];
  try {
    paragraphs = docxParagraphs(await readResumeFile(body.file));
  } catch (err) {
    return NextResponse.json(
      { error: `Couldn't read "${body.file}".`, detail: String(err) },
      { status: 404 }
    );
  }
  const totalWords = paragraphs.reduce((s, p) => s + wordCount(p), 0);

  // First-turn context: the application's JD + gap report.
  let firstTurnContext = "";
  if (!body.sessionId && body.appId) {
    const app = (await loadApplications()).applications.find(
      (a) => a.id === body.appId
    );
    if (app?.jd.trim()) {
      const report = scoreResume({
        jd: app.jd,
        title: app.role,
        resumeText: paragraphs.filter(Boolean).join("\n"),
      });
      firstTurnContext = `TARGET APPLICATION: ${app.role} at ${app.company} (current match score ${report.score}/100).
MISSING KEYWORDS (priority order): ${report.missing.slice(0, 15).join(", ") || "(none)"}

JOB DESCRIPTION (truncated):
${app.jd.slice(0, 10_000)}

`;
    }
  }

  const prompt = `${firstTurnContext}CURRENT DOCUMENT (${body.file}, ${totalWords} words — paragraph indices for any edits block):
${paragraphs.map((p, i) => `[${i}] ${p || "(empty)"}`).join("\n")}

USER: ${body.message}`;

  const encoder = new TextEncoder();
  const cwd = path.join(process.cwd(), "content", "jobs");
  const stream = new ReadableStream({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(JSON.stringify(obj) + "\n"));
      try {
        const { result, sessionId } = await streamClaude({
          prompt,
          cwd,
          resume: body.sessionId || undefined,
          systemPrompt: SYSTEM_PROMPT,
          onEvent: (ev) => {
            if (ev.type === "delta") send({ type: "delta", text: ev.text });
          },
        });
        send({ type: "done", sessionId, result });
      } catch (err) {
        send({ type: "error", error: String(err) });
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
