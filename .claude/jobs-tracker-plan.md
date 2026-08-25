# Job tracker — handoff plan

Continuation plan for the internship/job tracker + resume studio under
`/admin/jobs`. Read `CLAUDE.md` (§ "Job tracker" and the design contract)
first; this file adds the roadmap and the lessons already paid for.

**Vision**: a private, self-hosted Teal — kanban tracker, keyword match
scoring ("keywordmaxx"), Google-Docs-style docx resume tailoring, and job
discovery ranked by resume fit. Dev-only (never deploys), data gitignored in
`content/jobs/`, AI via the Claude Code subscription (headless `claude -p`)
— **never an API key**.

## Status

| Phase | State |
|---|---|
| 0 — SuperDoc spike | ✅ Done, validated on YJ's real resume |
| 1 — Tracker (kanban, autofill, contacts/events) | ✅ Done, verified end-to-end |
| 1.5 — Light admin theme + docx bullet normalization + page centering | ✅ Done |
| 2 — Keyword engine | ✅ Done 2026-08-25 (score 71 on real resume vs sample gameplay JD; badges, gap report, recompute) |
| 3 — Resume bank + variants | ✅ Code done + bank.md seeded; role-variant docx files are YJ's hand-shaping in the studio ("Duplicate as…" button ready) |
| 4 — AI tailor button | ✅ Done, verified live (49 s run, 5 honest edits, score 71 → 76, one-page guard held) |
| 5 — Discovery feeds | ✅ Done, verified live (400 Simplify leads scored + cached; watchlist board fetch verified against a real Greenhouse board; promote snapshotted a 5.4 K-char JD) |

All five phases shipped 2026-08-25. What remains is YJ-side content, not code:
hand-shape the three role variants via **Duplicate as…** in the studio
(`gameplay-programmer.docx`, `technical-designer.docx`, `game-designer.docx`),
and fill `content/jobs/watchlist.json` with real board slugs.

## What exists (map — phases 2–5 additions)

- `src/lib/jobs/docx.ts` — dependency-free docx zip read/write via
  `node:zlib` (`crc32`/`inflateRawSync`/`deflateRawSync`): `docxText` /
  `docxParagraphs` (extraction), `normalizeDocxBulletFonts` (the Google-Docs
  Noto Sans Symbols fix, now auto-applied on `?create=1` uploads),
  `applyParagraphEdits` (tailor's deterministic apply — first text run keeps
  formatting + gets the whole new text, later text runs dropped). No mammoth,
  no jszip.
- `src/lib/jobs/skills.ts` — curated dictionary (~250 canonicals + aliases,
  hard/soft). Bare "go"/"r" deliberately unmatched (false-positive traps —
  "Golang" + no "R" entry).
- `src/lib/jobs/keywords.ts` — pure engine: normalize (keeps `+`/`#`, so
  c++/c# survive; "node.js" ≡ "node js"), longest-phrase-first n-gram match,
  2× boost inside requirements-type sections, Jobscan-style buckets
  (hard 60 / title 15 / soft 10 / other 15, renormalized over non-empty
  buckets). `titleAlignment()` for JD-less leads.
- `src/lib/jobs/bank.ts` + `content/jobs/bank.md` — bullet bank parser
  (`- text #tags ^id` under `##` role headings); seeded from the real resume.
- `src/lib/jobs/ats.ts` — Greenhouse/Lever/Ashby fetchers (single posting +
  whole board with full JD); fetch-posting route now imports from here.
- `src/lib/jobs/leads.ts` — watchlist.json / leads.json (cache + dismissed
  ids) persistence, `leadId` = sha1(url) prefix.
- `src/lib/jobs/claude.ts` — shared headless-claude runner:
  `claude -p --output-format stream-json --verbose
  --include-partial-messages`, prompt on stdin, parses `stream_event` text/
  thinking deltas + the final `result`; supports `--resume <sessionId>` and
  `--append-system-prompt`. Also `wordCount()`.
- Routes: `/api/admin/jobs/score` (`{}` all, `{id}` one — persisted;
  `{id, resume}` report-only for the studio panel), `/api/admin/jobs/tailor`
  (**streams ndjson**: `stage`/`thought`/`result`/`error` events; cwd
  content/jobs so repo CLAUDE.md stays out of context), `/api/admin/jobs/
  chat` (studio chat, streamed, session via `--resume`; re-reads the docx
  every turn so edit indices stay fresh), `/api/admin/jobs/resume/edits`
  (apply a chat-proposed edit list to a file on disk),
  `/api/admin/jobs/discover` (GET cached/refresh, POST dismiss/restore/
  promote).
- UI: `ScoreBadge` (accent ≥ 70), gap report + Tailor button in
  `ApplicationDetail` → `TailorOverlay` (stage progress bar + Claude's
  live-streamed plan; the JSON fence is hidden client-side), studio right
  rail with Checklist | Chat tabs — `TailorPanel` (`?file=&app=` deep link,
  re-scores on every save via key remount) and `ChatPanel` (streamed chat,
  ```edits fences render as an Apply card → `/resume/edits` → editor
  reloads; Apply blocked while the doc has unsaved changes), "Duplicate
  as…" + ✦ Chat toggle in the studio chrome, `/admin/jobs/discover` page
  (`DiscoverList`).
- `.claude/skills/tailor/SKILL.md` — conversational path to the same
  pipeline.

### Tailor prompt contract (v2, YJ's spec — keep these rules)

- **ONE PAGE NO MATTER WHAT — the binding budget is LINES, not words.**
  Words alone failed (Aug 2026: a "same-size" tailor of the base resume
  rendered 2 pages — the base sits right AT the page boundary).
  `src/lib/jobs/onepage.ts`: `estimateLines` (ceil(chars/90) per paragraph,
  empty = 1; only used relatively), budget = `onePageBudget(sourceLines)` =
  min(source − 2, **85% of source**) so every tailor decisively shrinks the
  doc. The prompt demands DROPPING whole experiences **ranked purely by JD
  relevance, section-agnostic** (YJ's clarification: never "always drop
  ORGANIZATIONS" — a LavaLab entry is the top keep for a Next.js JD, filler
  PROJECTS entries drop just as readily; org line + role line + bullets +
  trailing spacer all deleted); after one re-prompt, `enforceOnePage` drops
  the least-JD-relevant role blocks deterministically (ranked by JD keyword
  weight; section only breaks exact ties, ORGANIZATIONS yielding; empty org
  lines and emptied section headings swept; keeps ≥ 3 blocks). Verified
  live: 86 → 70 est lines, LavaLab + Open Alpha dropped whole for a
  gameplay JD, score 69 → 89 — and for a full-stack JD the enforcer keeps
  LavaLab/Holowand and drops gameplay filler instead.
- **Words are secondary**: 475–600, aim ~550 — the line budget wins on
  conflict (a post-drop count slightly under 475 is accepted).
- **XYZ formula**: "Accomplished [X] as measured by [Y], by doing [Z]" —
  metric must already exist in the resume or bank; never fabricate.
- **Banned buzzwords** (list in the route): motivated, passionate, synergy,
  team player, results-driven, dynamic, innovative, utilize, leveraged,
  responsible for, …
- **Keyword priority: Preferred Qualifications (×2.5) > Requirements (×2) >
  Responsibilities (×1.5)** — encoded in `keywords.ts` section boosts, so
  `missing` arrives pre-sorted by that priority.
- The model replies with a ≤120-word plain-prose plan FIRST (that's what
  streams into the progress UI), then the ```json edit fence.

## What exists (map)

- `src/lib/jobs/schema.ts` — zod model. `Application` already carries
  `matchScore?`, `resumeVersion`, `contacts[]`, `events[]`, `dates` — phase 2+
  fills fields that already exist; avoid schema churn.
- `src/lib/jobs/store.ts` — `loadApplications`/`saveApplications`/`upsert…`,
  plus docx file helpers (`listResumeFiles`, `resumeFile` name-validation:
  `(tailored/)?name.docx`).
- `src/app/api/admin/jobs/route.ts` — CRUD. `PUT` takes `{id, patch, event?}`,
  stamps `lastTouch`, stamps `dates.applied` on first move to `applied`.
- `src/app/api/admin/jobs/fetch-posting/route.ts` — URL autofill.
  Greenhouse/Lever/Ashby public JSON APIs (no auth, full JD); generic pages
  best-effort. The paste-the-JD textarea is the permanent fallback.
- `src/app/api/admin/jobs/resume/route.ts` — docx binary GET/PUT/DELETE.
  PUT requires `?create=1` for new files (update-not-upsert otherwise);
  validates zip magic bytes; 20 MB cap (proxy body limit is 25 MB).
- `src/app/admin/(config)/jobs/page.tsx` + `src/components/admin/jobs/`
  (`JobsBoard`, `AddJobForm`, `ApplicationDetail`, `api.ts`) — board/list UI.
  `ApplicationDetail` is keyed by id (remount pattern, no re-seed effects).
- `src/app/admin/jobs/resume/page.tsx` + `ResumeWorkspace.tsx` — full-bleed
  SuperDoc studio (outside `(config)`, like `/admin/edit`).
- `globals.css` — `.admin-light` token override (paper palette; custom props
  only), `body:has(.admin-light) .vignette` suppression, and
  `.resume-studio .superdoc__layers { margin-inline: auto }` (page centering
  — auto margins, NOT justify-center, so zoom-overflow stays reachable).

## Phase 2 — Keyword engine (next)

Pure functions in `src/lib/jobs/keywords.ts`; no network, no LLM.

1. `src/lib/jobs/skills.ts`: curated dictionary (~400 terms) with aliases
   (`"ue5" → "Unreal Engine 5"`, `"js" → "JavaScript"`, `"k8s" → …`), each
   tagged `hard | soft`. Bias toward YJ's domains: gameplay/UE5/C++,
   full-stack TS/React/Next, game design, tools. Generate once, hand-editable.
2. Extraction: lowercase, tokenize, match 1–3-grams against the dictionary;
   weight = frequency × section boost (double inside Requirements/
   Qualifications-type headings); capture the JD title separately.
3. Score (Jobscan-style): hard-skill coverage ~60%, title alignment ~15%,
   soft skills ~10%, other high-frequency JD terms ~15%. Output
   `{score, matched[], missing[]}` with `missing` sorted by weight — that
   list is the actionable artifact phase 4 consumes.
4. Resume text: extract from docx server-side. `mammoth` (npm) is the
   established choice; alternatively unzip + strip `word/document.xml` tags
   (the docx is a zip — see the normalization script pattern in git history
   of this feature). Score every application against every non-`tailored/`
   resume file, keep the best `{variant, score}` in `matchScore`.
5. Surface: score badge on board cards + list rows; a gap-report section
   (matched/missing chips) in `ApplicationDetail`; "recompute" on JD edit.
   Recompute endpoint: extend the jobs PUT or add
   `/api/admin/jobs/score` (follow the devOnly + zod + `{error, detail}`
   conventions in the existing routes).

## Phase 3 — Resume bank + variants

- `content/jobs/bank.md`: every bullet YJ has ever earned, markdown list
  items tagged Obsidian-style (`#gameplay #ue5 #networking`) with stable
  `^ids`. Parse with a small reader in `src/lib/jobs/bank.ts`.
- Seed it by extracting bullets from the existing resume docx (one-time,
  interactive session with YJ is fine).
- Three role variants as docx files: `gameplay-programmer.docx`,
  `technical-designer.docx`, `game-designer.docx` — Save-As copies of the
  base, hand-shaped in the studio. Variants are free-form docx (YJ's explicit
  preference — no recipe/assembly layer); a "drift check" diffing variant
  text against bank bullets is a nice-to-have.
- Studio additions: "Duplicate as…" button; show which variant each
  application's `matchScore.variant` points at.

## Phase 4 — AI tailor button

Pipeline behind a Tailor action on each application (and a `/tailor` project
skill in `.claude/skills/` for the conversational path):

1. Copy best-matching variant docx → `content/jobs/resume/tailored/<app-id>.docx`.
2. Build the gap report (phase 2) + candidate bank bullets covering missing
   keywords.
3. Spawn **headless `claude -p`** from the dev-only API route (child_process;
   subscription-billed — confirmed-allowed path per Anthropic's help center;
   do NOT add `ANTHROPIC_API_KEY`). Prompt returns a **structured edit list**
   (JSON: paragraph-level replacements, ±10% length, never invent
   experience), not a rewritten doc.
4. Apply edits deterministically to the docx (text-run replacement — the
   docx is a zip of XML; SuperDoc also ships a document API worth
   evaluating: `@superdoc/sdk`).
5. Reopen in the studio with a side panel: JD + live missing-keyword
   checklist that updates as YJ hand-tunes. Save records `resumeVersion` on
   the application.

One-page guard: after apply, count `<w:p>` content vs the original; if the
edit list grew the doc, re-prompt with "trim N lines". (True page count needs
a layout engine — approximate by character/line budget vs the original.)

## Phase 5 — Discovery

- `/api/admin/jobs/discover`: fetch SimplifyJobs internships + new-grad
  `listings.json` (raw.githubusercontent, updated daily; schema:
  `company_name, title, locations, url, date_posted, active, terms`) and
  each watchlist company's ATS board (`content/jobs/watchlist.json`:
  `{name, ats: greenhouse|lever|ashby, boardSlug}` — reuse the fetchers in
  `fetch-posting/route.ts`, refactor them into `src/lib/jobs/ats.ts`).
- Cache to `content/jobs/leads.json` with `fetchedAt`; refetch on page open
  if stale (>~6h).
- `/admin/jobs/discover` page: leads ranked by best-variant match score
  (ATS feeds include full JD text), top matched keywords shown per lead,
  dedupe against tracked apps + a dismissed-ids list, one-click promote →
  creates a Bookmarked application with JD snapshotted.

## Gotchas already paid for (don't re-learn these)

- **zsh `echo` mangles JSON escapes** — smoke-testing with
  `echo "$JSON" | python3` corrupts `\n` in JD strings and can silently
  create duplicate test records (it did). Use `printf '%s'`, and always
  re-list applications after cleanup to catch orphans.
- **Node 22 runs the TS libs directly** for scratch verification:
  `node --experimental-strip-types x.mts`, but relative imports inside
  `src/lib/jobs/*` won't resolve extensionless — import lib files by
  absolute path from the scratch script (or sed the import).
- **Simplify listings.json carries no JD text** — title-only rank, scaled
  ×0.6 (cap 60) so generic "Software Engineer Intern" titles can't tie at
  100 above real full-JD watchlist matches.
- **Promote also dismisses the lead id** so it can't resurface; restoring a
  lead after deleting its promoted application needs an explicit
  `{action:"restore"}`.
- **Feed URLs**: `raw.githubusercontent.com/SimplifyJobs/
  {Summer2026-Internships,New-Grad-Positions}/dev/.github/scripts/
  listings.json` — repo renames redirect, so the season in the URL keeps
  working across cycles.

- **SuperDoc peers**: `@hocuspocus/provider` + `yjs` must stay installed even
  though collaboration is unused — removing them breaks the bundle.
- **SuperDoc save**: `superdoc.export({exportType: ['docx'],
  triggerDownload: false})` → Blob → PUT. `destroy()` on unmount; a
  `mountSeq` ref guards stale async mounts on file switch.
- **AGPL**: superdoc is AGPL-3.0 — acceptable because the studio runs only
  on localhost dev and it stays an npm dependency. Don't vendor its source;
  don't ship it in anything deployed.
- **Google Docs docx exports** force bullet glyphs into embedded
  "Noto Sans Symbols" (per-level `rFonts` in `word/numbering.xml`) — renders
  oversized in SuperDoc. Fix = replace those rPr with `<w:u w:val="none"/>`
  (script pattern in git history; YJ's current resume already normalized,
  original kept as `.docx.bak` — `.bak` files are invisible to the studio's
  file list). **Worth folding into the upload route** so every future import
  is auto-cleaned.
- **Headless Chrome + `--virtual-time-budget` stalls SuperDoc's loader at
  4%** — testing artifact only. Verify via CDP with real waits: launch
  Chrome with `--remote-debugging-port`, drive over WebSocket (`ws` is in
  node_modules), wait ~15 s real time before screenshotting. curl smoke
  tests for every API route worked fine.
- **Theme scoping**: `.admin-light` re-declares tokens on a subtree, beating
  the palette vars inlined on `<html>`. `/admin/edit/*` deliberately stays
  dark (its canvas previews the real dark site) — don't "fix" that without
  re-scoping the canvas.
- **Lint**: repo has ~5 pre-existing `react-hooks` errors in the grid editor
  — not yours. Don't add new ones: prefer key-remount over re-seed effects.
- **Ports**: YJ often has their own dev server on :3000. Test on a separate
  port and clean up your processes.

## Verification recipe

```bash
npm run dev -- --port 3177 &
curl -s -X POST localhost:3177/api/admin/jobs -H 'Content-Type: application/json' \
  -d '{"company":"X","role":"Y","jd":"..."}'          # create
curl -s -X POST localhost:3177/api/admin/jobs/fetch-posting \
  -H 'Content-Type: application/json' \
  -d '{"url":"https://boards.greenhouse.io/stripe/jobs/<id>"}'  # live autofill
npm run build   # must keep / and /[...slug] static (○/●), admin routes ƒ
```

Delete any smoke-test records afterwards — `content/jobs/` is YJ's real
private data.
