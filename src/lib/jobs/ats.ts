/**
 * ATS fetchers (Greenhouse / Lever / Ashby public no-auth JSON APIs) shared
 * by the add-job autofill route and the discovery feed (phase 5). Single
 * postings resolve from a pasted URL; whole boards list every open role for
 * a watchlist company — both return full JD text.
 */

export type Posting = {
  company?: string;
  role?: string;
  location?: string;
  jd?: string;
  source: "greenhouse" | "lever" | "ashby" | "manual";
};

export type BoardPosting = {
  company: string;
  role: string;
  location: string;
  url: string;
  jd: string;
  source: "greenhouse" | "lever" | "ashby";
  postedAt: string;
};

export function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

export function htmlToText(html: string): string {
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

export function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${url}`);
  return res.json();
}

/* ---------------- single postings (autofill) ---------------- */

/** boards.greenhouse.io/<board>/jobs/<id> or job-boards.greenhouse.io/... */
export async function fromGreenhouse(u: URL): Promise<Posting | null> {
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
export async function fromLever(u: URL): Promise<Posting | null> {
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
export async function fromAshby(u: URL): Promise<Posting | null> {
  const m = u.pathname.match(/^\/([^/]+)\/([0-9a-f-]{36})/i);
  if (!m) return null;
  const [, company, id] = m;
  const jobs = await listAshbyBoardRaw(decodeURIComponent(company));
  const job = jobs.find((j) => j.id === id);
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
export async function fromGenericPage(url: string): Promise<Posting | null> {
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

/** Route a pasted URL to the right fetcher (moved from fetch-posting). */
export async function fetchPostingFromUrl(url: string): Promise<Posting | null> {
  const u = new URL(url);
  const host = u.hostname;
  if (/(^|\.)greenhouse\.io$/.test(host)) return fromGreenhouse(u);
  if (/(^|\.)lever\.co$/.test(host)) return fromLever(u);
  if (/(^|\.)ashbyhq\.com$/.test(host)) return fromAshby(u);
  return fromGenericPage(url);
}

/* ---------------- whole boards (discovery watchlist) ---------------- */

export async function listGreenhouseBoard(
  boardSlug: string,
  companyName: string
): Promise<BoardPosting[]> {
  const data = (await fetchJson(
    `https://boards-api.greenhouse.io/v1/boards/${boardSlug}/jobs?content=true`
  )) as {
    jobs?: {
      id?: number;
      title?: string;
      content?: string;
      absolute_url?: string;
      updated_at?: string;
      location?: { name?: string };
    }[];
  };
  return (data.jobs ?? []).map((j) => ({
    company: companyName,
    role: j.title ?? "",
    location: j.location?.name ?? "",
    url: j.absolute_url ?? `https://boards.greenhouse.io/${boardSlug}/jobs/${j.id}`,
    jd: j.content ? htmlToText(decodeEntities(j.content)) : "",
    source: "greenhouse" as const,
    postedAt: j.updated_at ?? "",
  }));
}

export async function listLeverBoard(
  boardSlug: string,
  companyName: string
): Promise<BoardPosting[]> {
  const data = (await fetchJson(
    `https://api.lever.co/v0/postings/${boardSlug}?mode=json`
  )) as {
    id?: string;
    text?: string;
    hostedUrl?: string;
    createdAt?: number;
    categories?: { location?: string };
    descriptionPlain?: string;
    lists?: { text?: string; content?: string }[];
  }[];
  return (Array.isArray(data) ? data : []).map((j) => {
    const lists = (j.lists ?? [])
      .map((l) => `${l.text ?? ""}\n${htmlToText(l.content ?? "")}`)
      .join("\n\n");
    return {
      company: companyName,
      role: j.text ?? "",
      location: j.categories?.location ?? "",
      url: j.hostedUrl ?? `https://jobs.lever.co/${boardSlug}/${j.id}`,
      jd: [j.descriptionPlain ?? "", lists].filter(Boolean).join("\n\n").trim(),
      source: "lever" as const,
      postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : "",
    };
  });
}

type AshbyJob = {
  id?: string;
  title?: string;
  location?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  jobUrl?: string;
  publishedAt?: string;
};

async function listAshbyBoardRaw(boardSlug: string): Promise<AshbyJob[]> {
  const data = (await fetchJson(
    `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(
      boardSlug
    )}?includeCompensation=true`
  )) as { jobs?: AshbyJob[] };
  return data.jobs ?? [];
}

export async function listAshbyBoard(
  boardSlug: string,
  companyName: string
): Promise<BoardPosting[]> {
  const jobs = await listAshbyBoardRaw(boardSlug);
  return jobs.map((j) => ({
    company: companyName,
    role: j.title ?? "",
    location: j.location ?? "",
    url: j.jobUrl ?? `https://jobs.ashbyhq.com/${boardSlug}/${j.id}`,
    jd: j.descriptionPlain ?? htmlToText(j.descriptionHtml ?? ""),
    source: "ashby" as const,
    postedAt: j.publishedAt ?? "",
  }));
}
