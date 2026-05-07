import { promises as fs } from "node:fs";
import path from "node:path";
import {
  pageSchema,
  siteConfigSchema,
  themeSchema,
  type Page,
  type SiteConfig,
  type Theme,
} from "./schema";
import { DEFAULT_PALETTE } from "./theme";

const CONTENT_ROOT = path.join(process.cwd(), "content", "pages");
const SITE_CONFIG_FILE = path.join(process.cwd(), "content", "site.json");
const THEME_FILE = path.join(process.cwd(), "content", "theme.json");

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

/**
 * Load the site config (or fall back to schema defaults if the file
 * doesn't exist yet — this lets the app boot in repos that haven't been
 * migrated). Always validates so a hand-edited file with garbage gets
 * rejected at the boundary instead of poisoning later renders.
 */
export async function loadSiteConfig(): Promise<SiteConfig> {
  try {
    const raw = await fs.readFile(SITE_CONFIG_FILE, "utf8");
    return siteConfigSchema.parse(JSON.parse(raw));
  } catch {
    return siteConfigSchema.parse({});
  }
}

/** Persist the site config. */
export async function saveSiteConfig(
  config: unknown
): Promise<SiteConfig> {
  const validated = siteConfigSchema.parse(config);
  await fs.mkdir(path.dirname(SITE_CONFIG_FILE), { recursive: true });
  await fs.writeFile(
    SITE_CONFIG_FILE,
    JSON.stringify(validated, null, 2) + "\n",
    "utf8"
  );
  return validated;
}

/**
 * Load the theme (palette list + active palette). Falls back to a single
 * default palette so the site renders before the file is created.
 */
export async function loadTheme(): Promise<Theme> {
  try {
    const raw = await fs.readFile(THEME_FILE, "utf8");
    return themeSchema.parse(JSON.parse(raw));
  } catch {
    return {
      activePaletteId: DEFAULT_PALETTE.id,
      palettes: [DEFAULT_PALETTE],
    };
  }
}

/** Persist the theme. Validates first; activePaletteId must exist in the
 *  palette list (otherwise the site would render with no tokens). */
export async function saveTheme(theme: unknown): Promise<Theme> {
  const validated = themeSchema.parse(theme);
  if (!validated.palettes.some((p) => p.id === validated.activePaletteId)) {
    throw new Error(
      `activePaletteId "${validated.activePaletteId}" is not in the palette list`,
    );
  }
  const ids = new Set<string>();
  for (const p of validated.palettes) {
    if (ids.has(p.id)) throw new Error(`Duplicate palette id: ${p.id}`);
    ids.add(p.id);
  }
  await fs.mkdir(path.dirname(THEME_FILE), { recursive: true });
  await fs.writeFile(
    THEME_FILE,
    JSON.stringify(validated, null, 2) + "\n",
    "utf8",
  );
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
