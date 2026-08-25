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
