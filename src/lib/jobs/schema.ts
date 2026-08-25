import { z } from "zod";

/**
 * Job tracker data model. Everything lives under content/jobs/ which is
 * gitignored — this is private application data that never deploys (the
 * admin surface is dev-only via src/proxy.ts).
 */

export const APPLICATION_STATUSES = [
  "bookmarked",
  "applied",
  "oa",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

/** Board columns in display order. Terminal states share the last column. */
export const BOARD_COLUMNS: { key: string; label: string; statuses: ApplicationStatus[] }[] = [
  { key: "bookmarked", label: "Bookmarked", statuses: ["bookmarked"] },
  { key: "applied", label: "Applied", statuses: ["applied"] },
  { key: "oa", label: "Online Assessment", statuses: ["oa"] },
  { key: "interviewing", label: "Interviewing", statuses: ["interviewing"] },
  { key: "closed", label: "Closed", statuses: ["offer", "rejected", "ghosted"] },
];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  bookmarked: "Bookmarked",
  applied: "Applied",
  oa: "OA",
  interviewing: "Interviewing",
  offer: "Offer",
  rejected: "Rejected",
  ghosted: "Ghosted",
};

export const applicationSourceSchema = z.enum([
  "manual",
  "greenhouse",
  "lever",
  "ashby",
  "simplify",
  "hn",
]);

export const contactSchema = z.object({
  name: z.string().min(1).max(120),
  role: z.string().max(120).default(""),
  email: z.string().max(200).default(""),
  notes: z.string().max(2000).default(""),
});

export const eventSchema = z.object({
  /** ISO date-time the event happened. */
  date: z.string().min(1).max(40),
  kind: z
    .enum(["note", "applied", "followup", "interview", "oa", "offer", "rejection"])
    .default("note"),
  note: z.string().max(4000).default(""),
});

export const matchScoreSchema = z.object({
  /** 0–100 weighted keyword coverage (phase 2 fills this in). */
  score: z.number().min(0).max(100),
  /** Which resume variant produced the best score. */
  variant: z.string().max(200).default(""),
  matched: z.array(z.string()).default([]),
  missing: z.array(z.string()).default([]),
  computedAt: z.string().max(40),
});

export const applicationSchema = z.object({
  id: z.string().min(1).max(64),
  company: z.string().min(1).max(200),
  role: z.string().min(1).max(200),
  url: z.string().max(2000).default(""),
  location: z.string().max(200).default(""),
  source: applicationSourceSchema.default("manual"),
  status: z.enum(APPLICATION_STATUSES).default("bookmarked"),
  /** Snapshot of the job description — postings get taken down. */
  jd: z.string().max(200_000).default(""),
  notes: z.string().max(50_000).default(""),
  tags: z.array(z.string().max(60)).default([]),
  contacts: z.array(contactSchema).default([]),
  events: z.array(eventSchema).default([]),
  dates: z.object({
    saved: z.string().max(40),
    applied: z.string().max(40).default(""),
    deadline: z.string().max(40).default(""),
    /** Last time anything happened — drives staleness nudges. */
    lastTouch: z.string().max(40),
  }),
  /** Which resume file (content/jobs/resume/…) was sent for this one. */
  resumeVersion: z.string().max(300).default(""),
  matchScore: matchScoreSchema.optional(),
});

export const applicationsFileSchema = z.object({
  applications: z.array(applicationSchema).default([]),
});

export type Contact = z.infer<typeof contactSchema>;
export type ApplicationEvent = z.infer<typeof eventSchema>;
export type MatchScore = z.infer<typeof matchScoreSchema>;
export type Application = z.infer<typeof applicationSchema>;
export type ApplicationsFile = z.infer<typeof applicationsFileSchema>;

/** How many days without a touch before an open application counts as stale. */
export const STALE_AFTER_DAYS = 14;
