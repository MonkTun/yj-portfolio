import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * Best-effort autofill from a job posting URL. Greenhouse / Lever / Ashby
 * expose public no-auth JSON APIs with the full JD; anything else falls back
 * to fetching the page and stripping tags (which many boards block — the
 * add-job form always keeps a paste-the-JD fallback).
 */

const bodySchema = z.object({ url: z.string().min(1).max(2000) });

type Posting = {
  company?: string;
  role?: string;
  location?: string;
  jd?: string;
  source: "greenhouse" | "lever" | "ashby" | "manual";
};

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function htmlToText(html: string): string {
  const text = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|ul|ol)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<[^>]+>/g, "");
  return decodeEntities(text)
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/** boards.greenhouse.io/<board>/jobs/<id> or job-boards.greenhouse.io/... */
async function fromGreenhouse(u: URL): Promise<Posting | null> {
  const m = u.pathname.match(/^\/([^/]+)\/jobs\/(\d+)/);
  // Embedded form: boards.greenhouse.io/embed/job_app?for=<board>&token=<id>
  const board = m?.[1] ?? u.searchParams.get("for");
  const id = m?.[2] ?? u.searchParams.get("token");
  if (!board || !id) return null;
  const job = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}`
  )) as {
    title?: string;
    content?: string;
    location?: { name?: string };
    company_name?: string;
  };
  return {
    company: job.company_name || titleCase(board),
    role: job.title,
    location: job.location?.name,
    // Greenhouse double-encodes the HTML content.
    jd: job.content ? htmlToText(decodeEntities(job.content)) : undefined,
    source: "greenhouse",
  };
}

/** jobs.lever.co/<company>/<uuid> */
async function fromLever(u: URL): Promise<Posting | null> {
  const m = u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/i);
  if (!m) return null;
  const [, company, id] = m;
  const job = (await fetchJson(
    `https://api.lever.co/v0/postings/${company}/${id}`
  )) as {
    text?: string;
    categories?: { location?: string };
    descriptionPlain?: string;
    lists?: { text?: string; content?: string }[];
  };
  const lists = (job.lists ?? [])
    .map((l) => `${l.text ?? ""}\n${htmlToText(l.content ?? "")}`)
    .join("\n\n");
  return {
    company: titleCase(company),
    role: job.text,
    location: job.categories?.location,
    jd: [job.descriptionPlain ?? "", lists].filter(Boolean).join("\n\n").trim(),
    source: "lever",
  };
}

/** jobs.ashbyhq.com/<company>/<uuid> */
async function fromAshby(u: URL): Promise<Posting | null> {
  const m = u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/i);
  if (!m) return null;
  const [, company, id] = m;
  const board = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
      company
    )}?includeCompensation=true`
  )) as {
    jobs?: {
      id?: string;
      title?: string;
      location?: string;
      descriptionHtml?: string;
      descriptionPlain?: string;
    }[];
  };
  const job = (board.jobs ?? []).find((j) => j.id === id);
  if (!job) return null;
  return {
    company: titleCase(decodeURIComponent(company)),
    role: job.title,
    location: job.location,
    jd: job.descriptionPlain ?? htmlToText(job.descriptionHtml ?? ""),
    source: "ashby",
  };
}

/** Last resort: fetch the page itself and strip tags. Often blocked. */
async function fromGenericPage(url: string): Promise<Posting | null> {
  const res = await fetch(url, {
    headers: { accept: "text/html" },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) return null;
  const html = await res.text();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const text = htmlToText(html);
  if (text.length < 200) return null; // JS-rendered shell — not useful.
  return {
    role: title ? decodeEntities(title.trim()).slice(0, 200) : undefined,
    jd: text.slice(0, 100_000),
    source: "manual",
  };
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

  let u: URL;
  try {
    u = new URL(body.url);
  } catch {
    return NextResponse.json({ error: "Not a valid URL." }, { status: 400 });
  }

  try {
    let posting: Posting | null = null;
    const host = u.hostname;
    if (/(^|\.)greenhouse\.io$/.test(host)) posting = await fromGreenhouse(u);
    else if (/(^|\.)lever\.co$/.test(host)) posting = await fromLever(u);
    else if (/(^|\.)ashbyhq\.com$/.test(host)) posting = await fromAshby(u);
    else posting = await fromGenericPage(body.url);

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
