import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";

/**
 * Discovery feed persistence (phase 5). content/jobs/watchlist.json names
 * the companies whose ATS boards get polled; content/jobs/leads.json caches
 * the fetched + scored leads (refetched when stale) and the dismissed-ids
 * list. Both gitignored with the rest of content/jobs/.
 */

const JOBS_ROOT = path.join(process.cwd(), "content", "jobs");
const WATCHLIST_FILE = path.join(JOBS_ROOT, "watchlist.json");
const LEADS_FILE = path.join(JOBS_ROOT, "leads.json");

/** Refetch the feed when the cache is older than this. */
export const LEADS_STALE_MS = 6 * 60 * 60 * 1000;

export const watchlistCompanySchema = z.object({
  name: z.string().min(1).max(200),
  ats: z.enum(["greenhouse", "lever", "ashby"]),
  boardSlug: z.string().min(1).max(200),
});

export const watchlistSchema = z.object({
  companies: z.array(watchlistCompanySchema).default([]),
});

export const leadSchema = z.object({
  /** sha1(url) prefix — stable across refetches. */
  id: z.string().min(1).max(40),
  company: z.string().max(200),
  role: z.string().max(300),
  location: z.string().max(300).default(""),
  url: z.string().max(2000),
  source: z.enum(["greenhouse", "lever", "ashby", "simplify"]),
  via: z.enum(["watchlist", "simplify"]),
  /** Full JD text for ATS leads; "" for Simplify listings (title-only rank). */
  jd: z.string().max(200_000).default(""),
  postedAt: z.string().max(40).default(""),
  terms: z.array(z.string().max(60)).default([]),
  score: z.number().min(0).max(100).default(0),
  variant: z.string().max(300).default(""),
  matchedTop: z.array(z.string().max(80)).default([]),
});

export const leadsFileSchema = z.object({
  fetchedAt: z.string().max(40).default(""),
  leads: z.array(leadSchema).default([]),
  dismissed: z.array(z.string().max(40)).default([]),
});

export type WatchlistCompany = z.infer<typeof watchlistCompanySchema>;
export type Lead = z.infer<typeof leadSchema>;
export type LeadsFile = z.infer<typeof leadsFileSchema>;

export function leadId(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 12);
}

export async function loadWatchlist(): Promise<WatchlistCompany[]> {
  try {
    const raw = await fs.readFile(WATCHLIST_FILE, "utf8");
    return watchlistSchema.parse(JSON.parse(raw)).companies;
  } catch {
    return [];
  }
}

export async function loadLeads(): Promise<LeadsFile> {
  try {
    const raw = await fs.readFile(LEADS_FILE, "utf8");
    return leadsFileSchema.parse(JSON.parse(raw));
  } catch {
    return { fetchedAt: "", leads: [], dismissed: [] };
  }
}

export async function saveLeads(data: unknown): Promise<LeadsFile> {
  const validated = leadsFileSchema.parse(data);
  await fs.mkdir(JOBS_ROOT, { recursive: true });
  await fs.writeFile(
    LEADS_FILE,
    JSON.stringify(validated, null, 2) + "\n",
    "utf8"
  );
  return validated;
}
