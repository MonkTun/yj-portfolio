import { promises as fs } from "node:fs";
import path from "node:path";
import {
  applicationsFileSchema,
  type Application,
  type ApplicationsFile,
} from "./schema";

/**
 * File-backed persistence for the job tracker, following the site.json
 * pattern in lib/content.ts. content/jobs/ is gitignored (private data);
 * everything here is only ever reached through dev-gated admin routes, so
 * no React cache() wrapper — reads should always see the latest write.
 */

const JOBS_ROOT = path.join(process.cwd(), "content", "jobs");
const APPLICATIONS_FILE = path.join(JOBS_ROOT, "applications.json");
export const RESUME_ROOT = path.join(JOBS_ROOT, "resume");

export async function loadApplications(): Promise<ApplicationsFile> {
  try {
    const raw = await fs.readFile(APPLICATIONS_FILE, "utf8");
    return applicationsFileSchema.parse(JSON.parse(raw));
  } catch {
    return { applications: [] };
  }
}

export async function saveApplications(
  data: unknown
): Promise<ApplicationsFile> {
  const validated = applicationsFileSchema.parse(data);
  await fs.mkdir(JOBS_ROOT, { recursive: true });
  await fs.writeFile(
    APPLICATIONS_FILE,
    JSON.stringify(validated, null, 2) + "\n",
    "utf8"
  );
  return validated;
}

/** Insert or replace a single application, returning the full new list. */
export async function upsertApplication(
  app: Application
): Promise<ApplicationsFile> {
  const current = await loadApplications();
  const i = current.applications.findIndex((a) => a.id === app.id);
  if (i === -1) current.applications.unshift(app);
  else current.applications[i] = app;
  return saveApplications(current);
}

export async function deleteApplication(id: string): Promise<ApplicationsFile> {
  const current = await loadApplications();
  const next = {
    applications: current.applications.filter((a) => a.id !== id),
  };
  return saveApplications(next);
}

/* ---------------- resume files (.docx) ---------------- */

// Flat names plus an optional tailored/ folder — no traversal, docx only.
const resumeNameRegex = /^(tailored\/)?[a-z0-9][a-z0-9._-]*\.docx$/i;

export function resumeFile(name: string): string {
  if (!resumeNameRegex.test(name) || name.includes("..")) {
    throw new Error(`Invalid resume file name: ${name}`);
  }
  return path.join(RESUME_ROOT, name);
}

export type ResumeFileInfo = {
  name: string;
  size: number;
  modified: string;
};

export async function listResumeFiles(): Promise<ResumeFileInfo[]> {
  const out: ResumeFileInfo[] = [];
  async function scan(dir: string, prefix: string) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return; // Directory doesn't exist yet.
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory() && entry.name === "tailored" && !prefix) {
        await scan(full, "tailored/");
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".docx")) {
        const stat = await fs.stat(full);
        out.push({
          name: `${prefix}${entry.name}`,
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      }
    }
  }
  await scan(RESUME_ROOT, "");
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export async function readResumeFile(name: string): Promise<Buffer> {
  return fs.readFile(resumeFile(name));
}

export async function writeResumeFile(
  name: string,
  data: Buffer
): Promise<void> {
  const file = resumeFile(name);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, data);
}

export async function resumeFileExists(name: string): Promise<boolean> {
  try {
    await fs.access(resumeFile(name));
    return true;
  } catch {
    return false;
  }
}

export async function deleteResumeFile(name: string): Promise<void> {
  await fs.unlink(resumeFile(name));
}
