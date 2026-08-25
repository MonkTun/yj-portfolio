---
name: tailor
description: Tailor YJ's resume for a specific job application in the tracker — conversational path to the same pipeline as the Tailor button in /admin/jobs. Use when YJ says "tailor my resume for X" or "/tailor <company or app id>".
---

# Tailor a resume for an application

Conversational path to the tailor pipeline (phase 4 of the job tracker).
Everything lives in `content/jobs/` (gitignored, private). The API route
version is `src/app/api/admin/jobs/tailor/route.ts` — this skill does the
same steps in-session, which lets YJ steer each edit.

## Steps

1. **Find the application**: read `content/jobs/applications.json`, match
   the company/role/id YJ named. It needs a non-empty `jd`; if empty, ask
   YJ to paste the JD (or run the fetch-posting autofill on its `url`).
2. **Pick the source variant**: `matchScore.variant` if present, else score
   each non-`tailored/` docx in `content/jobs/resume/` with
   `scoreResume()` from `src/lib/jobs/keywords.ts` (extract text via
   `docxText()` from `src/lib/jobs/docx.ts`). Never edit the variant file
   itself.
3. **Build the gap report**: `scoreResume({jd, title: role, resumeText})` →
   `missing` sorted by weight is the target list. Pull candidate bullets
   covering those keywords from `content/jobs/bank.md`
   (`bulletsForKeywords()` in `src/lib/jobs/bank.ts`).
4. **Propose a structured edit list** — paragraph-level replacements
   against `docxParagraphs(variant)` indices, shown to YJ for approval
   before applying. Hard rules (mirror the API route's prompt):
   - Never invent experience, numbers, or employers — the bank is the only
     source of "new" material.
   - **One page = 475–600 total words, aim ~550.** Cut whole low-relevance
     bullets (`text: ""` deletes) rather than shrinking everything evenly.
   - **XYZ formula**: "Accomplished [X] as measured by [Y], by doing [Z]" —
     accomplishment first, honest metric, then how.
   - **Banned buzzwords**: motivated, motivation, passionate, synergy,
     synergies, team player, results-driven, dynamic, innovative,
     cutting-edge, world-class, go-getter, hard-working, detail-oriented,
     thought leader, utilize, leveraged, responsible for.
   - **Keyword priority**: Preferred Qualifications > Requirements >
     Responsibilities (the engine's section boosts already encode this).
   - Don't touch names, headings, titles, or dates.
5. **Apply deterministically**: `applyParagraphEdits(source, edits)` →
   write `content/jobs/resume/tailored/<app-id>.docx`. Re-score the result
   and report before → after.
6. **Update the application**: set `resumeVersion` to the tailored path,
   append a `note` event, stamp `dates.lastTouch`. Point YJ at
   `/admin/jobs/resume?file=tailored/<app-id>.docx&app=<app-id>` — the
   studio opens it with the JD + missing-keyword checklist panel.

## Running the libs from a script

Node 22 runs the TS libs directly:
`node --experimental-strip-types <script>.mts` — but relative imports
inside `src/lib/jobs/*` need explicit extensions, so either import the lib
files by absolute path from a scratch `.mts`, or do the docx unzip/rezip by
hand. Never install new packages for this; never use an API key.
