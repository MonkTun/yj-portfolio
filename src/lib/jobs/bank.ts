import { promises as fs } from "node:fs";
import path from "node:path";

/**
 * Resume bullet bank (phase 3): content/jobs/bank.md holds every bullet YJ
 * has ever earned as markdown list items, tagged Obsidian-style with stable
 * block ids:
 *
 *   ## E-Line Media — Gameplay Programming Intern
 *   - Created settings system with CommonUI in UE5. #ue5 #cpp #ui ^eline-settings
 *
 * The tailor pipeline (phase 4) feeds matching bullets to the model as the
 * only allowed source of "new" material — it may rephrase these, never
 * invent. Headings group bullets by role; tags drive keyword lookup.
 */

const BANK_FILE = path.join(process.cwd(), "content", "jobs", "bank.md");

export type BankBullet = {
  /** Stable ^id (without the caret); "" if the line has none. */
  id: string;
  text: string;
  tags: string[];
  /** Nearest preceding ## heading, e.g. "Overdawn Studio — Game Director". */
  section: string;
};

export function parseBank(md: string): BankBullet[] {
  const out: BankBullet[] = [];
  let section = "";
  for (const raw of md.split("\n")) {
    const line = raw.trim();
    const heading = line.match(/^#{2,}\s+(.*)$/);
    if (heading) {
      section = heading[1].trim();
      continue;
    }
    const item = line.match(/^[-*]\s+(.*)$/);
    if (!item) continue;
    let text = item[1].trim();
    const id = text.match(/\^([a-z0-9-]+)\s*$/i)?.[1] ?? "";
    if (id) text = text.replace(/\^[a-z0-9-]+\s*$/i, "").trim();
    const tags: string[] = [];
    text = text
      .replace(/(^|\s)#([a-z0-9][a-z0-9+#-]*)/gi, (_, pre, tag) => {
        tags.push(tag.toLowerCase());
        return pre;
      })
      .replace(/\s{2,}/g, " ")
      .trim();
    if (text) out.push({ id, text, tags, section });
  }
  return out;
}

export async function loadBank(): Promise<BankBullet[]> {
  try {
    return parseBank(await fs.readFile(BANK_FILE, "utf8"));
  } catch {
    return []; // No bank yet — the tailor pipeline degrades gracefully.
  }
}

/** Bullets whose tags or text mention any of the given keywords (used to
 *  hand the tailor model real material covering a JD's missing terms). */
export function bulletsForKeywords(
  bank: BankBullet[],
  keywords: string[],
  limit = 12
): BankBullet[] {
  const needles = keywords.map((k) => k.toLowerCase());
  const scored = bank
    .map((b) => {
      const hay = `${b.text} ${b.tags.join(" ")} ${b.section}`.toLowerCase();
      const hits = needles.filter((n) => hay.includes(n)).length;
      return { b, hits };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);
  return scored.slice(0, limit).map((s) => s.b);
}
