import { promises as fs } from "node:fs";
import path from "node:path";
import { pageSchema, type Page } from "./schema";

const CONTENT_ROOT = path.join(process.cwd(), "content", "pages");

function pageFile(slug: string) {
  // Reject path-traversal attempts. We only ever accept slugs with a
  // restricted character set; any `..` or backslash is a bug or attack.
  if (!/^[a-z0-9][a-z0-9-/]*$/i.test(slug) || slug.includes("..")) {
    throw new Error(`Invalid page slug: ${slug}`);
  }
  return path.join(CONTENT_ROOT, `${slug}.json`);
}

/**
 * Load a page by slug. `home` → content/pages/home.json.
 * Nested slugs (`work/dawngeon`) resolve to nested files.
 * Throws if the file is missing or the JSON doesn't match the schema —
 * we want a hard fail in the build, not a silently-empty page.
 */
export async function loadPage(slug: string): Promise<Page> {
  const file = pageFile(slug);
  const raw = await fs.readFile(file, "utf8");
  const parsed = JSON.parse(raw);
  return pageSchema.parse(parsed);
}

/**
 * Persist a page to disk. Validates against pageSchema first; serializes
 * with stable 2-space indentation so git diffs are minimal.
 * The editor calls this through the dev-gated /api/admin/save route.
 */
export async function savePage(slug: string, page: unknown): Promise<Page> {
  const validated = pageSchema.parse(page);
  const file = pageFile(slug);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(validated, null, 2) + "\n", "utf8");
  return validated;
}

/** List all pages under content/pages, returning their slugs. */
export async function listPages(): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string, prefix = "") {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, prefix ? `${prefix}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith(".json")) {
        const stem = entry.name.replace(/\.json$/, "");
        out.push(prefix ? `${prefix}/${stem}` : stem);
      }
    }
  }
  await walk(CONTENT_ROOT);
  return out.sort();
}
