import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  fetchPostingFromUrl,
  listAshbyBoard,
  listGreenhouseBoard,
  listLeverBoard,
  type BoardPosting,
} from "@/lib/jobs/ats";
import { docxText } from "@/lib/jobs/docx";
import { scoreResume, titleAlignment } from "@/lib/jobs/keywords";
import {
  LEADS_STALE_MS,
  leadId,
  loadLeads,
  loadWatchlist,
  saveLeads,
  type Lead,
} from "@/lib/jobs/leads";
import { applicationSchema } from "@/lib/jobs/schema";
import {
  listResumeFiles,
  loadApplications,
  readResumeFile,
  upsertApplication,
} from "@/lib/jobs/store";

export const runtime = "nodejs";
// A full refetch hits two Simplify feeds + every watchlist board.
export const maxDuration = 120;

function devOnly(): NextResponse | null {
  if (process.env.NODE_ENV !== "development") {
    return new NextResponse(null, { status: 404 });
  }
  return null;
}

/**
 * GET  /api/admin/jobs/discover[?refresh=1]
 *   → { leads, fetchedAt, dismissedCount, watchlistCount, stale }
 *   Leads come from the cache (content/jobs/leads.json); a refetch runs when
 *   the cache is stale (> 6 h) or ?refresh=1. Sources: SimplifyJobs
 *   internships + new-grad listings.json (title-only rank — no JD in the
 *   feed) and every watchlist company's ATS board (full JD → real score).
 *   Dismissed leads and already-tracked postings are filtered out.
 *
 * POST {action: "dismiss"|"restore", id}
 * POST {action: "promote", id} → creates a Bookmarked application with the
 *   JD snapshotted (best-effort URL fetch for Simplify leads).
 */

const SIMPLIFY_FEEDS = [
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json",
  "https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json",
];
const SIMPLIFY_MAX_AGE_DAYS = 60;
const SIMPLIFY_CAP = 400;

type SimplifyListing = {
  company_name?: string;
  title?: string;
  locations?: string[];
  url?: string;
  date_posted?: number;
  active?: boolean;
  is_visible?: boolean;
  terms?: string[];
};

async function fetchSimplifyLeads(): Promise<Lead[]> {
  const cutoff = Date.now() / 1000 - SIMPLIFY_MAX_AGE_DAYS * 86_400;
  const out: Lead[] = [];
  for (const feed of SIMPLIFY_FEEDS) {
    try {
      const res = await fetch(feed, { signal: AbortSignal.timeout(20_000) });
      if (!res.ok) continue;
      const listings = (await res.json()) as SimplifyListing[];
      for (const l of listings) {
        if (!l.url || !l.title || !l.company_name) continue;
        if (l.active === false || l.is_visible === false) continue;
        if ((l.date_posted ?? 0) < cutoff) continue;
        out.push({
          id: leadId(l.url),
          company: l.company_name,
          role: l.title,
          location: (l.locations ?? []).join(" · ").slice(0, 300),
          url: l.url,
          source: "simplify",
          via: "simplify",
          jd: "",
          postedAt: l.date_posted
            ? new Date(l.date_posted * 1000).toISOString()
            : "",
          terms: (l.terms ?? []).slice(0, 8),
          score: 0,
          variant: "",
          matchedTop: [],
        });
      }
    } catch {
      // One dead feed shouldn't kill the refresh.
    }
  }
  out.sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  return out.slice(0, SIMPLIFY_CAP);
}

async function fetchWatchlistLeads(): Promise<Lead[]> {
  const companies = await loadWatchlist();
  const results = await Promise.allSettled(
    companies.map((c): Promise<BoardPosting[]> => {
      if (c.ats === "greenhouse") return listGreenhouseBoard(c.boardSlug, c.name);
      if (c.ats === "lever") return listLeverBoard(c.boardSlug, c.name);
      return listAshbyBoard(c.boardSlug, c.name);
    })
  );
  const out: Lead[] = [];
  for (const r of results) {
    if (r.status !== "fulfilled") continue;
    for (const p of r.value) {
      if (!p.url || !p.role) continue;
      out.push({
        id: leadId(p.url),
        company: p.company,
        role: p.role,
        location: p.location.slice(0, 300),
        url: p.url,
        source: p.source,
        via: "watchlist",
        jd: p.jd.slice(0, 200_000),
        postedAt: p.postedAt,
        terms: [],
        score: 0,
        variant: "",
        matchedTop: [],
      });
    }
  }
  return out;
}

async function loadVariantTexts(): Promise<{ name: string; text: string }[]> {
  const files = (await listResumeFiles()).filter(
    (f) => !f.name.startsWith("tailored/")
  );
  const out: { name: string; text: string }[] = [];
  for (const f of files) {
    try {
      out.push({ name: f.name, text: docxText(await readResumeFile(f.name)) });
    } catch {
      // Skip unreadable files.
    }
  }
  return out;
}

function scoreLead(lead: Lead, variants: { name: string; text: string }[]): Lead {
  if (variants.length === 0) return lead;
  let best = { score: -1, variant: "", matchedTop: [] as string[] };
  for (const v of variants) {
    if (lead.jd) {
      const r = scoreResume({ jd: lead.jd, title: lead.role, resumeText: v.text });
      if (r.score > best.score) {
        best = { score: r.score, variant: v.name, matchedTop: r.matched.slice(0, 5) };
      }
    } else {
      // Title-only evidence is weak — cap at 60 so a generic "Software
      // Engineer Intern" can't outrank a real full-JD watchlist match.
      const s = Math.round(titleAlignment(lead.role, v.text) * 0.6);
      if (s > best.score) best = { score: s, variant: v.name, matchedTop: [] };
    }
  }
  return { ...lead, score: Math.max(0, best.score), variant: best.variant, matchedTop: best.matchedTop };
}

async function refetch(): Promise<{ leads: Lead[]; fetchedAt: string }> {
  const [simplify, watchlist, variants] = await Promise.all([
    fetchSimplifyLeads(),
    fetchWatchlistLeads(),
    loadVariantTexts(),
  ]);
  // Watchlist leads win on URL collisions (they carry the JD).
  const byId = new Map<string, Lead>();
  for (const lead of [...simplify, ...watchlist]) byId.set(lead.id, lead);
  const leads = [...byId.values()].map((l) => scoreLead(l, variants));
  leads.sort((a, b) => b.score - a.score || b.postedAt.localeCompare(a.postedAt));
  return { leads, fetchedAt: new Date().toISOString() };
}

export async function GET(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  const force = new URL(req.url).searchParams.get("refresh") === "1";
  let cache = await loadLeads();
  const stale =
    !cache.fetchedAt ||
    Date.now() - new Date(cache.fetchedAt).getTime() > LEADS_STALE_MS;

  if (force || stale) {
    try {
      const fresh = await refetch();
      cache = await saveLeads({ ...fresh, dismissed: cache.dismissed });
    } catch (err) {
      if (cache.leads.length === 0) {
        return NextResponse.json(
          { error: "Feed refresh failed", detail: String(err) },
          { status: 502 }
        );
      }
      // Serve the stale cache rather than nothing.
    }
  }

  // Hide dismissed + already-tracked leads.
  const { applications } = await loadApplications();
  const trackedUrls = new Set(applications.map((a) => a.url).filter(Boolean));
  const trackedPairs = new Set(
    applications.map((a) => `${a.company.toLowerCase()}::${a.role.toLowerCase()}`)
  );
  const dismissed = new Set(cache.dismissed);
  const leads = cache.leads.filter(
    (l) =>
      !dismissed.has(l.id) &&
      !trackedUrls.has(l.url) &&
      !trackedPairs.has(`${l.company.toLowerCase()}::${l.role.toLowerCase()}`)
  );

  return NextResponse.json({
    ok: true,
    leads,
    fetchedAt: cache.fetchedAt,
    dismissedCount: cache.dismissed.length,
    watchlistCount: (await loadWatchlist()).length,
  });
}

const actionSchema = z.object({
  action: z.enum(["dismiss", "restore", "promote"]),
  id: z.string().min(1).max(40),
});

export async function POST(req: Request) {
  const blocked = devOnly();
  if (blocked) return blocked;

  let body: z.infer<typeof actionSchema>;
  try {
    body = actionSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request body", detail: String(err) },
      { status: 400 }
    );
  }

  const cache = await loadLeads();

  if (body.action === "dismiss" || body.action === "restore") {
    const dismissed = new Set(cache.dismissed);
    if (body.action === "dismiss") dismissed.add(body.id);
    else dismissed.delete(body.id);
    await saveLeads({ ...cache, dismissed: [...dismissed] });
    return NextResponse.json({ ok: true, dismissedCount: dismissed.size });
  }

  // promote → Bookmarked application with the JD snapshotted.
  const lead = cache.leads.find((l) => l.id === body.id);
  if (!lead) {
    return NextResponse.json(
      { error: `No cached lead with id "${body.id}" — refresh the feed.` },
      { status: 404 }
    );
  }

  let jd = lead.jd;
  if (!jd && lead.url) {
    // Simplify leads have no JD in the feed — best-effort fetch (many
    // Simplify URLs redirect straight to the company's ATS posting).
    try {
      jd = (await fetchPostingFromUrl(lead.url))?.jd ?? "";
    } catch {
      jd = "";
    }
  }

  const now = new Date().toISOString();
  const application = applicationSchema.parse({
    id: randomUUID(),
    company: lead.company,
    role: lead.role,
    url: lead.url,
    location: lead.location,
    source: lead.source === "simplify" ? "simplify" : lead.source,
    status: "bookmarked",
    jd,
    tags: lead.terms,
    dates: { saved: now, lastTouch: now },
    ...(lead.jd && lead.variant
      ? {
          matchScore: {
            score: lead.score,
            variant: lead.variant,
            matched: lead.matchedTop,
            missing: [],
            computedAt: now,
          },
        }
      : {}),
  });
  await upsertApplication(application);
  // Promoted leads shouldn't reappear in the feed if the URL changes later.
  await saveLeads({ ...cache, dismissed: [...new Set([...cache.dismissed, lead.id])] });
  return NextResponse.json({ ok: true, application });
}
