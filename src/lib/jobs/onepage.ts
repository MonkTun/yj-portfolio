import type { ParagraphEdit } from "./docx";
import { extractJdKeywords, skillNamesIn } from "./keywords";

/**
 * One-page enforcement for the tailor pipeline. Word count alone let a
 * "550-word" resume spill onto page 2 (Aug 2026 — YJ's Verkada run), so the
 * real budget is LINES, estimated from character counts, measured RELATIVE
 * to the source document: the source variant is one page, so an edited doc
 * that lands a couple of estimated lines under it is one page too.
 *
 * If the model won't cut enough, `enforceOnePage` drops whole experience
 * blocks deterministically — least-JD-relevant first, whichever section
 * they sit in — so the output fits no matter what. Relevance is the only
 * ranking: a LavaLab entry outranks gameplay projects for a Next.js JD,
 * and vice versa (section is just a tiebreaker).
 */

/** Conservative chars-per-line for a letter-width resume body. Only used
 *  relatively (same estimator on both sides), so precision cancels out. */
const CHARS_PER_LINE = 90;

/** Shrink the doc by at least this many estimated lines vs the source. */
export const LINE_MARGIN = 2;

/**
 * The real budget: 85% of the source's estimated lines. YJ's base resume
 * sits right AT the one-page boundary (Aug 2026: the "same-size" Verkada
 * tailor rendered 2 pages), so matching the source is not enough — a
 * tailored copy must be decisively shorter, which means whole experiences
 * get dropped, not just tightened.
 */
export function onePageBudget(sourceLines: number): number {
  return Math.min(sourceLines - LINE_MARGIN, Math.round(sourceLines * 0.85));
}

export function paragraphLines(text: string): number {
  return text ? Math.ceil(text.length / CHARS_PER_LINE) : 1;
}

export function estimateLines(paragraphs: string[]): number {
  return paragraphs.reduce((s, p) => s + paragraphLines(p), 0);
}

/** Paragraph texts with an edit list applied ("" = deleted, costs 0 lines). */
export function textsAfter(
  paragraphs: string[],
  edits: ParagraphEdit[]
): (string | null)[] {
  const byIndex = new Map(edits.map((e) => [e.paragraph, e.text]));
  return paragraphs.map((p, i) => {
    const edit = byIndex.get(i);
    if (edit === undefined) return p;
    return edit === "" ? null : edit;
  });
}

export function linesAfter(paragraphs: string[], edits: ParagraphEdit[]): number {
  return textsAfter(paragraphs, edits).reduce(
    (s: number, p) => s + (p === null ? 0 : paragraphLines(p)),
    0
  );
}

/* ---------------- experience blocks ---------------- */

export type Block = {
  /** Paragraph indices [start, end) — role/title line plus its bullets. */
  start: number;
  end: number;
  label: string;
  /** Index of the org-name line this block sits under (-1 if none). */
  orgLine: number;
  section: string;
};

const SECTION_HEADING = /^[A-Z][A-Z &/]{2,28}$/;
/** "Gameplay Programming Intern (May 2026 - Present)" style role lines. */
const ROLE_LINE = /\(.*(\d{4}|present).*\)/i;
/** Sections whose entries may be dropped wholesale. */
const DROPPABLE_SECTIONS = new Set(["PROJECTS", "ORGANIZATIONS", "EXPERIENCE", "LEADERSHIP", "ACTIVITIES"]);

/** Parse role-level blocks out of the droppable sections. An org line
 *  (short line whose next non-empty line is a role line) is NOT part of the
 *  block — it's shared by sibling roles and only falls when all of them do. */
export function parseBlocks(paragraphs: string[]): Block[] {
  const blocks: Block[] = [];
  let section = "";
  let orgLine = -1;
  let current: { start: number; label: string; orgLine: number; section: string } | null = null;

  const close = (end: number) => {
    if (current && end > current.start) {
      blocks.push({ ...current, end });
    }
    current = null;
  };

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i].trim();
    if (SECTION_HEADING.test(p)) {
      close(i);
      section = p;
      orgLine = -1;
      continue;
    }
    if (!DROPPABLE_SECTIONS.has(section)) continue;
    if (!p) continue;
    const nextNonEmpty = paragraphs.slice(i + 1).find((q) => q.trim());
    if (!ROLE_LINE.test(p) && nextNonEmpty && ROLE_LINE.test(nextNonEmpty) && p.length <= 70) {
      // Org-name line (e.g. "Overdawn Studio") — new org, not a block itself.
      close(i);
      orgLine = i;
      continue;
    }
    if (ROLE_LINE.test(p)) {
      close(i);
      current = {
        start: i,
        label: `${orgLine >= 0 ? paragraphs[orgLine] + " — " : ""}${p}`,
        orgLine,
        section,
      };
    }
  }
  close(paragraphs.length);
  return blocks;
}

/* ---------------- deterministic block dropping ---------------- */

/** Keep at least this many role blocks overall — a resume with one lonely
 *  experience is worse than a slightly long one. */
const MIN_BLOCKS_KEPT = 3;

export function enforceOnePage(params: {
  paragraphs: string[];
  edits: ParagraphEdit[];
  budgetLines: number;
  jd: string;
}): { edits: ParagraphEdit[]; dropped: string[] } {
  const { paragraphs, edits, budgetLines, jd } = params;
  if (linesAfter(paragraphs, edits) <= budgetLines) return { edits, dropped: [] };

  const jdWeights = new Map(
    extractJdKeywords(jd).map((k) => [k.name, k.weight])
  );
  const effective = textsAfter(paragraphs, edits);
  const blocks = parseBlocks(paragraphs);

  const alive = (b: Block) => {
    for (let i = b.start; i < b.end; i++) if (effective[i] !== null && effective[i]?.trim()) return true;
    return false;
  };
  const relevance = (b: Block) => {
    const text = effective
      .slice(b.start, b.end)
      .filter((t): t is string => t !== null)
      .join(" ");
    let score = 0;
    for (const name of skillNamesIn(text)) score += jdWeights.get(name) ?? 0;
    return score;
  };

  const candidates = blocks.filter(alive).map((b) => ({ b, rel: relevance(b) }));
  // Least JD-relevant falls first, regardless of section — relevance beats
  // pedigree. Section only breaks exact ties (ORGANIZATIONS yields).
  candidates.sort((x, y) => {
    const xOrg = x.b.section === "ORGANIZATIONS" ? 0 : 1;
    const yOrg = y.b.section === "ORGANIZATIONS" ? 0 : 1;
    return x.rel - y.rel || xOrg - yOrg;
  });

  const merged = new Map(edits.map((e) => [e.paragraph, e.text]));
  const dropped: string[] = [];
  const deleteRange = (start: number, end: number) => {
    for (let i = start; i < end; i++) {
      merged.set(i, "");
      effective[i] = null;
    }
    // Absorb the trailing blank spacer so its line goes too.
    for (let i = end; i < paragraphs.length && !paragraphs[i].trim(); i++) {
      merged.set(i, "");
      effective[i] = null;
    }
  };

  let kept = candidates.length;
  for (const { b } of candidates) {
    if (linesAfter(paragraphs, [...merged].map(([paragraph, text]) => ({ paragraph, text }))) <= budgetLines) break;
    if (kept <= MIN_BLOCKS_KEPT) break;
    deleteRange(b.start, b.end);
    kept -= 1;
    dropped.push(b.label);
    // Org-name line falls once none of its role blocks survive.
    if (b.orgLine >= 0) {
      const siblings = blocks.filter((o) => o.orgLine === b.orgLine && o !== b);
      if (!siblings.some(alive)) deleteRange(b.orgLine, b.orgLine + 1);
    }
  }

  // A section heading with nothing left under it falls too.
  let section = "";
  let sectionStart = -1;
  const sweepSection = (end: number) => {
    if (sectionStart < 0) return;
    const hasContent = effective
      .slice(sectionStart + 1, end)
      .some((t) => t !== null && t.trim());
    if (!hasContent) deleteRange(sectionStart, sectionStart + 1);
  };
  for (let i = 0; i < paragraphs.length; i++) {
    if (SECTION_HEADING.test(paragraphs[i].trim())) {
      sweepSection(i);
      section = paragraphs[i].trim();
      sectionStart = DROPPABLE_SECTIONS.has(section) ? i : -1;
    }
  }
  sweepSection(paragraphs.length);

  return {
    edits: [...merged].map(([paragraph, text]) => ({ paragraph, text })),
    dropped,
  };
}
