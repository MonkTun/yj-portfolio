# Markdown pages

Every `.md` file in this folder is a page on the site. The slug is the file
path minus the extension: `content/docs/work/thang.md` → `/work/thang`.
Grid pages (`content/pages/*.json`, made in the admin editor) share the same
route space; a JSON page with the same slug wins over a markdown page.

Files named `README.md` or starting with `_` or `.` are ignored.

Rendered by `src/components/MarkdownPage.tsx` through the same type system as
the grid atoms — write plain markdown and it comes out in the site's editorial
style automatically.

## Frontmatter

```yaml
---
title: "Thang — Youngje Park"        # required; browser tab / SEO title
description: "One-line summary."     # optional; meta description
published: false                     # optional; hides from production builds
---
```

## Conventions

| You write | You get |
|---|---|
| `#### Anything` (an H4 heading) | a kicker label (mono, uppercase, muted) |
| `#### 01` immediately before a `## Heading` | the kicker + hairline + H2 section lockup |
| `# Heading` (first thing on the page) | full-height hero treatment for the opening run |
| `## Heading` / `### Heading` | display headings (Karepefx), same classes as grid pages |
| `![alt](public/projects/foo.png)` | full-width figure through next/image |
| `![alt](public/a.png "A caption")` | image title becomes a mono caption below |
| several images on adjacent lines, no blank line between | a side-by-side gallery row (2–3 columns) |
| a bare YouTube URL on its own line | embedded video player |
| `[Label](https://…)` alone in a paragraph | a button (several links in one paragraph = a button row) |
| `[← Back](/)` | ghost-variant button (label starts with `←`) |
| `---` | hairline rule |
| `> quote` with a final `— Name` line | the pull-quote atom with attribution |
| `- **Status** — Ongoing` (every item starts bold) | a stacked label list, no bullets — the Vital-signs pattern |
| `- plain item` | bulleted list with accent markers |
| `![alt\|300](public/a.png)` (Obsidian resize syntax) | image capped at that display width |
| lists, tables, `code` | token-styled; tables render in mono |

## Images from Obsidian

The repo root is the Obsidian vault (`.obsidian/app.json` is committed).
Pasting an image into a note drops the file into `public/attachments/` and
writes a standard markdown link — the site serves it automatically. For
hero-quality art, drop the original into `public/projects/` yourself and
reference it as `public/projects/foo.png`.

**Always write image paths vault-relative, starting with `public/`** (no
leading slash) — that's the form both Obsidian and the site understand: the
renderer strips the `public/` prefix, so `public/projects/foo.png` is served
at `/projects/foo.png`. A site-rooted path like `/projects/foo.png` still
renders on the site but shows as a broken image inside Obsidian.
