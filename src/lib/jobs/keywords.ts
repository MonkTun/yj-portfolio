import { SKILLS, type SkillKind } from "./skills";

/**
 * Keyword engine (phase 2) — pure functions, no network, no LLM.
 * Extracts dictionary skills from a JD (frequency × section boost),
 * then scores a resume Jobscan-style: hard-skill coverage dominates,
 * with title alignment, soft skills, and high-frequency JD terms on top.
 */

export type JdKeyword = {
  name: string;
  kind: SkillKind;
  /** frequency × section boost — the sort key for `missing`. */
  weight: number;
};

export type ScoreReport = {
  /** 0–100. */
  score: number;
  matched: string[];
  /** Sorted by JD weight, most important gap first — phase 4's input. */
  missing: string[];
  breakdown: {
    hard: { earned: number; max: number };
    title: { earned: number; max: number };
    soft: { earned: number; max: number };
    other: { earned: number; max: number };
  };
  /** Non-dictionary high-frequency JD terms (for the gap report UI). */
  otherTerms: { term: string; inResume: boolean }[];
};

/* ---------------- normalization ---------------- */

/** Lowercase; every char that isn't [a-z0-9+#] becomes a space. Keeps
 *  "c++" / "c#" intact while "node.js" → "node js" (aliases normalize the
 *  same way, so dotted/spaced/joined spellings all meet in the middle). */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();
}

function tokens(text: string): string[] {
  const n = normalize(text);
  return n ? n.split(" ") : [];
}

const STOPWORDS = new Set(
  ("a an and are as at be but by for from has have in into is it of on or our " +
    "that the their they this to was we what when where which who will with you " +
    "your not can all more other than up out if new own how why do does").split(" ")
);

/* ---------------- dictionary index ---------------- */

type DictEntry = { name: string; kind: SkillKind };

// normalized phrase → canonical skill
const DICT = new Map<string, DictEntry>();
let MAX_PHRASE_WORDS = 1;
for (const skill of SKILLS) {
  const phrases = [skill.name, ...(skill.aliases ?? [])];
  for (const phrase of phrases) {
    const key = normalize(phrase);
    if (!key) continue;
    MAX_PHRASE_WORDS = Math.max(MAX_PHRASE_WORDS, key.split(" ").length);
    if (!DICT.has(key)) DICT.set(key, { name: skill.name, kind: skill.kind });
  }
}

/** Every canonical skill found in a text, longest-phrase-first so
 *  "unreal engine 5" doesn't double-count as "unreal engine". Returns
 *  canonical name → occurrence count (weighted externally). */
function matchSkills(toks: string[]): Map<string, { kind: SkillKind; count: number }> {
  const found = new Map<string, { kind: SkillKind; count: number }>();
  const consumed = new Array<boolean>(toks.length).fill(false);
  for (let len = MAX_PHRASE_WORDS; len >= 1; len--) {
    for (let i = 0; i + len <= toks.length; i++) {
      let overlaps = false;
      for (let j = i; j < i + len; j++) if (consumed[j]) { overlaps = true; break; }
      if (overlaps) continue;
      const phrase = toks.slice(i, i + len).join(" ");
      const hit = DICT.get(phrase);
      if (!hit) continue;
      for (let j = i; j < i + len; j++) consumed[j] = true;
      const prev = found.get(hit.name);
      if (prev) prev.count += 1;
      else found.set(hit.name, { kind: hit.kind, count: 1 });
    }
  }
  return found;
}

/* ---------------- JD extraction ---------------- */

// Three-tier section priority (YJ's rule): Preferred Qualifications beat
// Requirements beat Responsibilities — preferred-section skills are what
// separate candidates, so they weigh most in the gap report.
const PREFERRED_HEADING =
  /(preferred|nice to have|bonus|pluses|plus if|great if|stand out|even better)/i;
const REQUIRED_HEADING =
  /(requirements?|qualifications?|must[- ]haves?|what (you|we)|who you are|about you|skills|experience|looking for)/i;
const RESPONSIBILITY_HEADING =
  /(responsibilities|what you'll do|you will|you'll|day to day|the role)/i;

function sectionBoost(heading: string): number {
  if (PREFERRED_HEADING.test(heading)) return 2.5;
  if (REQUIRED_HEADING.test(heading)) return 2;
  if (RESPONSIBILITY_HEADING.test(heading)) return 1.5;
  return 1;
}

/** Heuristic: short line, often ending with ":" — a section heading. */
function isHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 70) return false;
  if (t.endsWith(":")) return true;
  // Standalone short line with no sentence punctuation, ≤ 6 words.
  return t.split(/\s+/).length <= 6 && !/[.!?]$/.test(t) && !t.startsWith("•");
}

export function extractJdKeywords(jd: string): JdKeyword[] {
  const lines = jd.split(/\n+/);
  const weights = new Map<string, JdKeyword>();
  let boost = 1;
  for (const line of lines) {
    if (isHeading(line)) {
      boost = sectionBoost(line);
      // Headings themselves still count (e.g. "C++ Experience:").
    }
    for (const [name, { kind, count }] of matchSkills(tokens(line))) {
      const prev = weights.get(name);
      const add = count * boost;
      if (prev) prev.weight += add;
      else weights.set(name, { name, kind, weight: add });
    }
  }
  return [...weights.values()].sort((a, b) => b.weight - a.weight);
}

// JD boilerplate that says nothing about fit — never surface as "other terms".
const JD_BOILERPLATE = new Set(
  ("experience skills skill knowledge ability abilities strong team teams work " +
    "working familiarity related degree pursuing years plus preferred required " +
    "requirements responsibilities role position company candidates candidate " +
    "including understanding excellent environment opportunity benefits about " +
    "equal employer applicants employment status salary range compensation").split(" ")
);

/** Non-dictionary terms that a JD leans on (frequency ≥ 3, len ≥ 4). */
export function extractOtherTerms(jd: string, limit = 12): { term: string; weight: number }[] {
  const counts = new Map<string, number>();
  for (const tok of tokens(jd)) {
    if (tok.length < 4 || STOPWORDS.has(tok) || JD_BOILERPLATE.has(tok) || /^\d+$/.test(tok)) continue;
    counts.set(tok, (counts.get(tok) ?? 0) + 1);
  }
  // Drop anything the dictionary already covers (any phrase containing it
  // would be caught per-line; a cheap single-token check is enough here).
  const inDict = (t: string) => DICT.has(t);
  return [...counts.entries()]
    .filter(([t, c]) => c >= 3 && !inDict(t))
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, weight]) => ({ term, weight }));
}

/** Canonical skill names present in a chunk of text — the one-page
 *  enforcer uses this to rank experience blocks by JD relevance. */
export function skillNamesIn(text: string): Set<string> {
  return new Set(matchSkills(tokens(text)).keys());
}

/* ---------------- scoring ---------------- */

/** 0–100 title-token overlap — the ranking signal for discovery leads that
 *  carry no JD text (SimplifyJobs listings). */
export function titleAlignment(title: string, resumeText: string): number {
  const resumeTokens = new Set(tokens(resumeText));
  const titleToks = [...new Set(tokens(title))].filter(
    (t) => !STOPWORDS.has(t) && t.length > 1
  );
  if (titleToks.length === 0) return 0;
  const hits = titleToks.filter((t) => resumeTokens.has(t)).length;
  return Math.round((hits / titleToks.length) * 100);
}

const WEIGHTS = { hard: 60, title: 15, soft: 10, other: 15 };

export function scoreResume(params: {
  jd: string;
  /** JD title, e.g. "Gameplay Programming Intern". */
  title: string;
  resumeText: string;
}): ScoreReport {
  const { jd, title, resumeText } = params;
  const jdKeywords = extractJdKeywords(jd);
  const resumeSkills = matchSkills(tokens(resumeText));
  const resumeTokens = new Set(tokens(resumeText));

  const matched: string[] = [];
  const missingWeighted: JdKeyword[] = [];
  let hardTotal = 0, hardEarned = 0, softTotal = 0, softEarned = 0;
  for (const kw of jdKeywords) {
    const has = resumeSkills.has(kw.name);
    if (kw.kind === "hard") {
      hardTotal += kw.weight;
      if (has) hardEarned += kw.weight;
    } else {
      softTotal += kw.weight;
      if (has) softEarned += kw.weight;
    }
    if (has) matched.push(kw.name);
    else missingWeighted.push(kw);
  }

  // Title alignment: JD-title words present anywhere in the resume.
  const titleToks = [...new Set(tokens(title))].filter(
    (t) => !STOPWORDS.has(t) && t.length > 1
  );
  const titleHits = titleToks.filter((t) => resumeTokens.has(t)).length;

  // Other high-frequency JD terms present in the resume.
  const others = extractOtherTerms(jd);
  const otherTerms = others.map(({ term }) => ({
    term,
    inResume: resumeTokens.has(term),
  }));
  const otherTotal = others.reduce((s, o) => s + o.weight, 0);
  const otherEarned = others.reduce(
    (s, o) => s + (resumeTokens.has(o.term) ? o.weight : 0),
    0
  );

  const buckets = [
    { max: WEIGHTS.hard, total: hardTotal, earned: hardEarned, key: "hard" as const },
    { max: WEIGHTS.title, total: titleToks.length, earned: titleHits, key: "title" as const },
    { max: WEIGHTS.soft, total: softTotal, earned: softEarned, key: "soft" as const },
    { max: WEIGHTS.other, total: otherTotal, earned: otherEarned, key: "other" as const },
  ];

  // Renormalize over non-empty buckets so a JD with no soft skills (say)
  // doesn't cap the score below 100.
  const activeMax = buckets.reduce((s, b) => s + (b.total > 0 ? b.max : 0), 0);
  let score = 0;
  const breakdown = {} as ScoreReport["breakdown"];
  for (const b of buckets) {
    const earned = b.total > 0 ? (b.earned / b.total) * b.max : 0;
    breakdown[b.key] = { earned: Math.round(earned), max: b.max };
    score += earned;
  }
  score = activeMax > 0 ? Math.round((score / activeMax) * 100) : 0;

  return {
    score: Math.max(0, Math.min(100, score)),
    matched,
    missing: missingWeighted.sort((a, b) => b.weight - a.weight).map((k) => k.name),
    breakdown,
    otherTerms,
  };
}
