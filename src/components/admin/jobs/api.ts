import type { ScoreReport } from "@/lib/jobs/keywords";
import type {
  Application,
  ApplicationEvent,
  ApplicationStatus,
  Contact,
} from "@/lib/jobs/schema";

/** Shared fetch idiom for the jobs admin — same error unwrap as the rest of
 *  the admin components. */
async function call<T>(
  url: string,
  method: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string })?.error ?? `HTTP ${res.status}`
    );
  }
  return data as T;
}

export type CreateApplicationInput = {
  company: string;
  role: string;
  url?: string;
  location?: string;
  source?: Application["source"];
  status?: ApplicationStatus;
  jd?: string;
  deadline?: string;
};

export type ApplicationPatch = Partial<{
  company: string;
  role: string;
  url: string;
  location: string;
  status: ApplicationStatus;
  jd: string;
  notes: string;
  tags: string[];
  contacts: Contact[];
  resumeVersion: string;
  deadline: string;
}>;

export function createApplication(input: CreateApplicationInput) {
  return call<{ application: Application }>("/api/admin/jobs", "POST", input);
}

export function updateApplication(
  id: string,
  patch: ApplicationPatch,
  event?: ApplicationEvent
) {
  return call<{ application: Application }>("/api/admin/jobs", "PUT", {
    id,
    patch,
    event,
  });
}

export function removeApplication(id: string) {
  return call<{ ok: true }>("/api/admin/jobs", "DELETE", { id });
}

export type FetchedPosting = {
  company?: string;
  role?: string;
  location?: string;
  jd?: string;
  source: Application["source"];
};

export function fetchPosting(url: string) {
  return call<{ posting: FetchedPosting }>(
    "/api/admin/jobs/fetch-posting",
    "POST",
    { url }
  );
}

/* ---------------- keyword scoring (phase 2) ---------------- */

/** Recompute matchScore for one application (or all, with no id). */
export function scoreApplication(id?: string) {
  return call<{ application?: Application; applications?: Application[] }>(
    "/api/admin/jobs/score",
    "POST",
    id ? { id } : {}
  );
}

/** Full report vs one named resume file — not persisted (studio panel). */
export function scoreAgainst(id: string, resume: string) {
  return call<{ report: ScoreReport; resume: string }>(
    "/api/admin/jobs/score",
    "POST",
    { id, resume }
  );
}

/* ---------------- ndjson streaming (tailor + chat) ---------------- */

/** POST `body`, read the ndjson response line-by-line into `onEvent`. */
async function streamNdjson<T>(
  url: string,
  body: unknown,
  onEvent: (ev: T) => void
): Promise<void> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { error?: string })?.error ?? `HTTP ${res.status}`
    );
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      try {
        onEvent(JSON.parse(line) as T);
      } catch {
        // Skip malformed lines rather than aborting the stream.
      }
    }
  }
}

/* ---------------- AI tailor (phase 4) ---------------- */

export type TailorResult = {
  file: string;
  variant: string;
  edits: number;
  before: number;
  after: number;
  words: number;
  lines: number;
  sourceLines: number;
  report: ScoreReport;
  application: Application;
};

export type TailorEvent =
  | { type: "stage"; stage: string; label: string }
  | { type: "thought"; text: string }
  | ({ type: "result" } & TailorResult)
  | { type: "error"; error: string; detail?: string };

export function tailorStream(
  id: string,
  onEvent: (ev: TailorEvent) => void,
  variant?: string
) {
  return streamNdjson<TailorEvent>("/api/admin/jobs/tailor", { id, variant }, onEvent);
}

/* ---------------- studio chat ---------------- */

export type ChatStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; sessionId: string; result: string }
  | { type: "error"; error: string };

export function chatStream(
  params: { message: string; file: string; appId?: string; sessionId?: string },
  onEvent: (ev: ChatStreamEvent) => void
) {
  return streamNdjson<ChatStreamEvent>("/api/admin/jobs/chat", params, onEvent);
}

export type ParagraphEditInput = { paragraph: number; text: string };

export function applyResumeEdits(file: string, edits: ParagraphEditInput[]) {
  return call<{ ok: true; applied: number; words: number }>(
    "/api/admin/jobs/resume/edits",
    "POST",
    { file, edits }
  );
}

/* ---------------- discovery (phase 5) ---------------- */

export type Lead = {
  id: string;
  company: string;
  role: string;
  location: string;
  url: string;
  source: "greenhouse" | "lever" | "ashby" | "simplify";
  via: "watchlist" | "simplify";
  jd: string;
  postedAt: string;
  terms: string[];
  score: number;
  variant: string;
  matchedTop: string[];
};

export type LeadsResponse = {
  leads: Lead[];
  fetchedAt: string;
  dismissedCount: number;
  watchlistCount: number;
};

export function fetchLeads(refresh = false) {
  return call<LeadsResponse>(
    `/api/admin/jobs/discover${refresh ? "?refresh=1" : ""}`,
    "GET"
  );
}

export function dismissLead(id: string, restore = false) {
  return call<{ ok: true }>("/api/admin/jobs/discover", "POST", {
    action: restore ? "restore" : "dismiss",
    id,
  });
}

export function promoteLead(id: string) {
  return call<{ application: Application }>("/api/admin/jobs/discover", "POST", {
    action: "promote",
    id,
  });
}

/** "3d ago" style label from an ISO date. */
export function daysAgo(iso: string): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) return "today";
  if (days === 1) return "1d ago";
  return `${days}d ago`;
}

export function daysSince(iso: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}
