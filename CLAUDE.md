# CLAUDE.md

Project memory for Claude Code working in this repo.

## What this is

YJ's (Youngje Park's) personal portfolio. Two surfaces share the same codebase:

1. **Public portfolio** — the site visitors see.
2. **Admin / editor** — a self-built, Framer-style visual editor where YJ can drag, drop, and arrange UI elements freely without writing code for every change. Think: DIY Framer. The output of the editor is what the public site renders.

All pages are **grid pages** — `content/pages/<slug>.json`, made in the admin editor: home, 404, construction, and everything under `work/` (the case studies plus the art pages neighborhoods and banana-republic, which moved from root slugs to `work/` during the markdown era and stayed there).

> A markdown authoring format (`content/docs/*.md` + Obsidian vault + `MarkdownPage.tsx`/`MarkdownEditor.tsx`/`src/lib/markdown.ts`) existed briefly (2026-08-24 → 2026-08-27, commit `7bee8ed` onward) and was **removed on purpose** — YJ found it no easier than the visual editor. The `work/*` case studies were re-migrated back to grid JSON from the pre-2026-08-24 history (row edges halved for the 16px grid, `§` prefixes stripped, post-migration overdawn copy edits ported). Don't reintroduce a second page format; if the markdown renderer is ever wanted again, it's in git history around `7bee8ed`. An unpublished `work/crashball-ultimate` placeholder stub existed only as markdown and was dropped (recoverable from history if ever needed).

The repo was reset from a Vite SPA to a Next.js project on 2026-05-05 to keep the existing Vercel project (and its domain settings) intact while moving to a stack better suited to mixing static portfolio pages with an authoring tool.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (via `@tailwindcss/postcss`)
- **shadcn/ui** for headless primitives (Button, Dialog, Input, Tabs, Sheet, Popover, etc.) — installed via `npx shadcn@latest add <component>`, source lives in `src/components/ui`
- **React Bits** for motion-heavy / decorative pieces (animated text, transitions, scroll effects) — copy in via the React Bits CLI, source lives in `src/components/bits`
- **Motion** (`motion/react`, formerly Framer Motion) for app-level animations
- ESLint (`eslint-config-next`)
- Source under `src/`, alias `@/*` → `src/*`

No backend or database is wired up yet. Persistence for the editor (where layouts/content are stored) is an open design question — pick it when the editor work begins, not before.

## Design language — non-negotiables

The portfolio and the editor must look like **one product**, not two. Coherence is enforced through tokens and a single component set; deviations require updating the tokens, not bypassing them.

### 1. Pick a direction and commit

Before writing UI, the aesthetic must be decided (brutalist editorial, refined minimal, retro-futuristic, organic, luxury, etc.). Once chosen, document the direction at the bottom of this section under **Current direction**. Every subsequent component decision serves that direction. Don't blend directions to be "safe" — a clear, opinionated aesthetic always beats a hedged one.

The default Next.js template look (white background, geometric SVGs, Geist Sans) is a placeholder. Treat it as scaffolding to delete, not a baseline to build on.

### 2. Design tokens are the source of truth

All visual values live as CSS variables in `src/app/globals.css` under `@theme` (Tailwind v4) and `:root` / `.dark`:

- **Color** — dominant + sharp accents (no timid evenly-distributed palettes). Light and dark themes share the same token names; only the values differ.
- **Typography** — `--font-display` and `--font-body` registered via `next/font` in `src/app/layout.tsx`. Pair a distinctive display face with a refined body face. **Banned defaults**: Inter, Roboto, Arial, system-ui as the primary face, and Space Grotesk (overused). Pick something with character.
- **Spacing, radii, shadows, motion durations/easings** — tokenized too. No magic numbers in components.

Components read tokens via Tailwind utilities (`bg-background`, `text-foreground`, `font-display`, `rounded-card`, `shadow-elevated`, etc.). Hard-coded hex values, font names, or `px` shadows in JSX are a smell.

### 3. Component discipline (DRY, hard line)

- **shadcn primitives** in `src/components/ui` — unstyled-ish, owned source. Theme them via tokens, never with one-off classes.
- **App components** in `src/components/<domain>` (e.g. `marketing/`, `case-study/`, `editor/`) — compose primitives + tokens into the actual building blocks the site uses. **The editor places these, not raw shadcn primitives.**
- **React Bits / Motion** pieces wrapped before use: drop the React Bits source into `src/components/bits`, then re-export from an app-level component that applies tokens (typography, color, timing) so it matches the rest of the site. Don't render React Bits components directly in pages.
- If you'd copy-paste a chunk of JSX a second time, extract a component first.
- A new variant of an existing component → add a `variant` prop (cva). Do not fork the file.
- Inline ad-hoc styling that bypasses tokens (arbitrary color values, `style={{}}` for visuals, raw font stacks) is rejected unless explicitly justified.

### 4. Motion

The site is **kinetic**, not restrained — closer to [measured.site](https://www.measured.site/) and [aaronlee.design](https://aaronlee.design/) than to a static print spread. Motion is a primary expressive medium, not a finishing touch; without it, the layout is half-built.

- **measured.site** is the reference for *layout-level* motion: scroll-driven scale, pinned section sequences, parallax, kinetic marquees, dimensional case-study reveals.
- **aaronlee.design** is the reference for *signature 3D / WebGL moments*: Three.js / Blender-style hero set-pieces and one-off animated artworks that anchor a page. The existing WebGL components in [src/components/bits/](src/components/bits/) (LiquidEther, PrismaticBurst, Grainient, etc.) are the on-disk vocabulary for this — wrap and theme them through the registry, don't drop in new WebGL libraries casually.

- Use `motion/react` for app-level animation and scroll-driven motion (`useScroll`, `useTransform`, `whileInView`, `whileHover`, `LazyMotion`).
- **Scroll is a first-class input.** Pinning, parallax, scale-on-scroll, scroll-linked transforms, sticky stacked cards, horizontal scroll sections, kinetic marquees — all in vocabulary, all encouraged when they serve the composition.
- **Hover scale is allowed and encouraged** where it adds presence: images, cards, media tiles, buttons can grow `scale: 1 → 1.02–1.06`, tilt slightly, lift with a token shadow. Magnitude stays tasteful; easing comes from `var(--ease)`. Bouncy spring overshoots / wobbles are still out.
- A page can have many animated moments — what matters is that each is **deliberate and on-tempo**, not that the page is sparse. Compose, don't sprinkle. If two motions fight for attention in the same viewport, one of them is wrong.
- Durations and easings come from tokens (`--duration-fast`, `--duration`, `--duration-slow`, `--ease`, plus any new ones you add). Literals in JSX are still a smell.
- Respect `prefers-reduced-motion` — collapse all decorative scroll / scale / parallax / marquee motion to opacity-only fades when set. Non-negotiable.
- The editor exposes motion as **first-class, per-instance props** (see § 6). YJ should be able to give any block a reveal style, hover behavior, scroll-linked transform, and pin behavior without writing code.

Still out: spring overshoots on hover, neon glows / halos, scanlines, reveal-on-every-block confetti, scroll-jacked snap-section nav that hijacks the wheel.

### 5. Atmosphere over flatness

Solid white-on-white is the AI-slop default. Add depth deliberately: gradient meshes, grain/noise overlays, layered transparencies, dramatic but token-driven shadows, decorative borders, or custom cursors — whatever serves the chosen direction. Pick one or two atmospheric devices and apply them consistently; don't stack every effect.

### 6. Editor ↔ renderer contract

The admin editor and the public site render from the **same component registry**. A placeable element is a tuple of `{ component, propsSchema, defaults }`; the editor edits the props, the renderer renders the component. This is what keeps the two surfaces visually identical and prevents the editor from drifting into its own look.

Practical consequence: when adding a new visual block, register it in the component registry (location TBD when editor work starts) so the editor can place it. Don't build editor-only versions of components.

**Motion is a first-class prop, not a behavior baked into a component.** Every placeable block exposes a `motion` prop bag — reveal style, hover behavior (scale / tilt / shadow lift / tint), scroll-linked transform (scale, translate, rotate, opacity, blur), pin / sticky behavior, parallax depth, transition timing — that the editor's properties panel edits directly. Schema lives next to the registry; defaults are sensible (a block placed with zero configuration still feels alive). This is what lets YJ build measured.site-grade dynamic landing pages without forking components per scroll trick.

The editor must also support **per-element keyframe authoring** (start state, end state, scroll range or trigger) so a block isn't limited to the prebuilt presets. Presets are the fast path; raw keyframes are the escape hatch.

### Current direction — organic but dark editorial

The site reads like a printed magazine pressed into warm ink: deep, near-black backgrounds, cream type, one earthy accent, humanist serifs with character, paper-grade grain. Refined like a print spread, organic like something hand-set — never sterile, never glossy.

**Palette** (tokens in `src/app/globals.css`):

- `--background` — `#0F0D0B` (warm near-black, NOT `#000`)
- `--foreground` — `#E8DFCF` (warm cream)
- `--muted-foreground` — `#8A8275` (sepia mid-grey)
- `--surface` — `#1A1714` (cards / elevated panels)
- `--border` — `#2A2520`
- `--accent` — `#5C8A3A` (moss / forest green) — the *only* loud color; use sparingly: links, single-letter drop caps, lockup marks, hover states
- `--accent-foreground` — `#FFFFFF` (pure white — the one place white is permitted, for legibility on the saturated accent)

No purples. No blue greys. No pure white *as a body / background color* — white is reserved for text sitting on `--accent`. (One deliberate exception, YJ's call: the announcement strip is white glass, via the `--announcement` token.)

**Typography** (registered via `next/font`, with one exception — see below):

- `--font-display` — **Karepefx** (local woff2 in `src/fonts/karepefx`, subset from the source OTFs kept alongside; weights 300/400/500/700/800/900). Used for hero, headlines, section titles, large pull quotes, drop caps. Distinctive geometric/futurist face — the visual signature of the site. Display sizes lean into the heavier weights (700–900); body-display sizes stay at 400–500.
- **Pixel faces (Galmuri9, PF Stardust, PF Stardust S) are NOT in next/font.** They're hand-written `@font-face` rules in `globals.css`, split into latin/hangul woff2 slices (`public/fonts/`) with `unicode-range` so visitors fetch ~8KB of latin glyphs instead of the 4.6MB source TTF — the hangul slice only downloads if Korean text renders. next/font can't express unicode-range slices. Their `--font-*` variables are bound in `globals.css :root`, not by a `.variable` class. If a new pixel/CJK font is added, follow this pattern (subset with `pyftsubset --flavor=woff2`), don't feed a multi-MB TTF to next/font.
- `--font-body` — **Newsreader** (variable, Google Fonts). Used for all running text. Italic is the working italic — use it freely (publications, dates, foreign words).
- `--font-mono` — **IBM Plex Mono**. Used for metadata: dates, credit lines, image captions, section numbers (`02 — Selected work`), URLs, and editor UI labels.

**Banned (per the design contract)**: Inter, Roboto, Arial, system-ui as primary face, Space Grotesk, Geist Sans/Mono as primary faces, and Fraunces (was the previous direction; replaced by Karepefx). Sans-serif body in general — body is serif on this site.

**Type rules**:

- Display sizes use Karepefx with letter-spacing slightly negative (~`-0.02em`) and tight leading (~`0.92`). Pair heavy weights (800/900) at large sizes; lighten to 500 at medium.
- Body in Newsreader at 17–19px with leading ~`1.6`. Italics for publications/dates inline.
- Mono labels are uppercase, tracked out (`+0.14em`), small (11–12px), in `--muted-foreground`. They sit above headlines like print kickers.
- Numbers use `font-feature-settings: "tnum"` everywhere they appear in tabular contexts (dates, credits).

**Layout sensibility**:

- Asymmetric magazine grid; deliberate offsets (a headline starts at column 3 of 12; an image bleeds to column 9). Not chaotic — *composed*.
- Generous dark space. A spread can be mostly empty.
- Numbered sections (`01`, `02`) — plain numbers, no `§` mark (dropped Aug 2026; do not reintroduce it in kickers, templates, or editor chrome). Hairline dividers (1px `--border`) between major sections.

**Motion vocabulary**:

The references are [measured.site](https://www.measured.site/) (scroll-driven layout motion) and [aaronlee.design](https://aaronlee.design/) (signature 3D / WebGL hero moments) — both translated into the dark editorial palette. Motion carries the layout.

- **Tempo**: default `600ms`, fast `200ms` (hovers, micro-states), slow `900ms` (scroll-linked reveals, hero entrances). Signature easing `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo). Tokens: `--duration-fast`, `--duration`, `--duration-slow`, `--ease`.
- **Scroll-driven motion** (use freely):
  - Scale-on-scroll: hero / featured images scale `0.9 → 1` (or `1 → 1.05`) as they pass through the viewport.
  - Pinned sections: `position: sticky` + `useScroll` to drive transforms while a section is held — stacked-card reveals, image-stack shuffles, kinetic type that scrubs as you scroll.
  - Parallax: foreground / background move at different rates (subtle, ±40–80px, token-driven).
  - Horizontal scroll lockups for selected-work strips and image grids.
  - Marquee bands (logos, kinetic display type) at constant velocity, pause on hover.
  - Scroll-progress-driven typography: leading / tracking / weight transitions tied to scroll position on hero or section breaks.
- **Hover** (allowed and encouraged):
  - `scale: 1 → 1.02–1.06` for images and cards, `1 → 1.04` for buttons. `var(--duration-fast)` with `var(--ease)`.
  - Slight tilt (rotateX/Y up to 4deg) on media tiles when desired, gated behind an editor prop.
  - Token-driven shadow lift, accent tint, accent underline (left-to-right draw on links).
  - Custom cursor: oversized circular cursor that grows / inverts when over interactive elements — implement once globally.
- **Page transitions**: orchestrated entrances per route — hero text mask-reveals, image clip-paths open, accent lines scribble in. Each route has a signature opening, not just a generic fade.
- **Reduced motion**: collapse all scroll-linked transforms, scale, parallax, marquees to opacity-only fades. Grain and vignette stay static regardless.

**Atmospheric devices** (capped at three — *do not stack more*):

1. **Grain** — a fixed-position SVG turbulence overlay at ~6% opacity, screen blend mode, pointer-events none. Lives in `<body>`, not per-component.
2. **Warm vignette** — a radial-gradient body overlay, very subtle (≤ 35% darkening at corners).
3. **Glassmorphism** — frosted surfaces for floating chrome (the editor toolbar, palette, properties panel, popovers, hover-state floating block toolbars). Use the `.glass-panel` token utility in `globals.css`. Never apply glass to long-form content blocks — it stays a chrome-only treatment so reading remains crisp on the dark base.

That's it. No purple gradients, no neon, no glow halos, no scanlines, no mesh blobs.

**Don'ts (keep this list honest, add as we go)**:

- Don't lighten the background to "soften" the design — the dark IS the design.
- Don't introduce a second accent color "for variety". Hierarchy comes from type weight and scale, not color.
- Don't switch sans for "readability" on long body — Newsreader at the right size IS readable. If it's not, fix the size, not the font.
- **Don't apply scroll-linked transforms, parallax, scale, or hover scale to long-form body copy.** Reveals on body paragraphs are opacity-only (with a small Y offset at most). Kinetics belong on display type, media, and chrome — readability beats motion when there's a paragraph to read.
- **Never hardcode color literals (`#abc`, `rgb(...)`, `rgba(...)`) inside JSX `className` strings or inline `style`** — even for shadows, glows, ring colors, tinted overlays, or one-off rgba tints. Read tokens through Tailwind utilities (`bg-accent`, `text-accent-foreground`, `border-accent`, `ring-accent`) or `var(--token)` in CSS. If you need a tinted shadow off the accent, add a token (e.g. `--accent-glow`) — don't paste the rgb of the current accent in 12 places, because the next palette swap turns them stale and the editor and site go out of sync. The terracotta-shadow regression in `Toolbar.tsx` / `BlockToolbar.tsx` / `atoms/Button.tsx` (May 2026) is exactly this failure.
- **Shared component CSS classes in `globals.css` that set `color`, `background`, or `border` MUST live inside `@layer components`.** Unlayered CSS sits *after* Tailwind's utilities in the cascade, so `.kicker { color: var(--muted-foreground) }` defined at the top level will silently clobber `text-accent-foreground` on any element that has both classes — which is exactly how the editor's right-panel toggle buttons ended up with sepia-grey text on the green accent. If you're tempted to add a class to `globals.css`, wrap it in `@layer components` unless it is intentionally meant to win against utilities (and document why it's unlayered if so).

## Conventions

- App Router only — no `pages/` directory.
- Keep the public portfolio and admin editor as sibling route groups under `src/app` (e.g. `src/app/(site)/...` and `src/app/admin/...`) once both exist.
- Server Components by default; opt into `"use client"` only where interactivity requires it (the editor will need it; most portfolio surfaces won't).
- Tailwind for styling. Avoid one-off CSS files unless there's a real reason; global tokens in `globals.css` are the exception.
- Don't reintroduce Vite, CRA, or any non-Next build tooling.

## Mirrors (Aug 2026)

A **mirror** is the editor's component/instance system: one source of truth, placeable any number of times on any page.

- **Source**: `MirrorDef { id, name, source: { type, props } }` in `content/site.json → mirrors` (next to the tag library — same load/save channel, same debounced `/api/admin/site` POST from the editor via `useSiteLibrary` in `Editor.tsx`). A source is a block minus its position; `blockContentSchema` in `schema.ts` is that shape, and `blockSchema` variants are built by `.extend`-ing it. A mirror can't mirror a mirror.
- **Instance**: a `mirror` block whose props are only `{ mirrorId }`. Layout / bleed / `mobile.hidden` / `mobile.layout` stay per-instance (where it sits is local; what it is is shared). `MOBILE_OVERRIDABLE_KEYS.mirror = []`.
- **Rendering**: the `Mirror` atom (`atoms/Mirror.tsx`) looks the id up in `MirrorLibraryContext` (provided by `PageRenderer` on the public site — every `(site)` route passes `config.mirrors` — and by `Editor` with a live copy) and renders the source's registry component. In the editor it re-wraps that atom in an `EditProvider` whose updaters write to the source, so inline edits on any instance propagate to all of them. It imports `atomRegistry` while the registry imports it — intentional cycle, safe because the registry is read at render time only.
- **Editor**: "Make mirror" in a plain block's panel header promotes it in place (same block id → selection/position don't jump; the library saves immediately, the page still needs Save). A mirror's panel edits the source (banner says so), renames, "Detach copy", "Delete mirror" (instances elsewhere then render an *unlinked* placeholder in the editor and nothing on the public site — they're never rewritten behind your back). "+ Add block" lists each mirror by name and spawns an instance already pointed at it (`onAdd(type, props?)`).
- **The site footer is five mirrors** (`mir_footer_kicker` / `mir_footer_email` / `mir_footer_nav` / `mir_footer_colophon` / `mir_footer_social` — mirrors are per-block, there is no section mirror). Home's `sec_footer` holds the original instances; every other page except `404` ends with a `sec_footer` section (`blog.json` kept its earlier `sec_footer_blog` id) of `reverse` background / `lg` padding carrying the same five instances at the same layout. Change the email or socials on any page and every footer follows; a page that should lose the footer just drops the section.
- **The home "All projects" carousel is `mir_projects`**, and every `work/*` page has an instance of it directly above its back-to-home button (`col 1 / span 12 / rowSpan 8 / bleed both`, button shifted down 10 rows). Edit the carousel on any page — it's the same one.

## Blog + site navigation (Sep 2026)

The blog is **not a second page format** — it's the same grid-page pipeline as `work/*`, filed under `blog/`:

- **Index**: `content/pages/blog.json` (`/blog`). **Posts**: `content/pages/blog/<slug>.json`. The `Post header` section template (date kicker + H1 + standfirst + hairline) is the signature opening; the case-study outro pattern (a `mir_posts` instance + `← Back to the blog` button) closes a post.
- **Creating a post is one step** (Sep 2026): the **Blog post** mode of the New page form on `/admin/pages` (title / date / summary; slug follows the title under `blog/`) calls `createPost` in `src/lib/blog.ts`, which writes the page already scaffolded — Post header filled in (auto-stacked for mobile), one body section, the outro, and a fresh copy of the blog index's footer section — and puts `{title, date, summary, href}` at the **top** of `mir_posts`. Deleting a page from `/admin/pages` takes its entry off the list (`unlistPage`), and rows the list links to carry an `in blog list` badge. The list entry is a copy made at creation: retitling a post later means editing its entry too.
- **`postList` block** (`atoms/PostList.tsx`, `postListPropsSchema`): a vertical, text-first index — running number · date · display title · summary · arrow, hairline rows. Items are curated in the panel (title / date / summary / href with the page picker), exactly like carousel items — there is no filesystem auto-index; the create-post flow above adds the entry, hand edits cover the rest. New entries are inserted at the top (newest first).
- **The list's box has to grow with it**: grid rows are fixed 16px inside `overflow-hidden` sections, so every entry makes each `mir_posts` instance taller than its block. `createPost` re-sizes every instance on every page with `growMirrorInstances` (`src/lib/post-list.ts`) — rows estimated per breakpoint from PostList's measured metrics, the phone height written as a `mobile.layout.rowSpan` override, blocks below pushed down on each breakpoint, never shrunk. Entries added by hand in the panel don't get this; stretch the block yourself (or add posts through the form). Keep the metrics in `post-list.ts` in step if `PostList.tsx`'s classes change.
- **`mir_posts`** is the one shared post list (site.json mirror), placed on the blog index and in every post's outro (**no bleed** — unlike the carousel, a bled list clips its number and arrow at the viewport edge). Add a post to it on any page and every instance follows — same rule as `mir_projects`.
- **Navigation (Sep 2026)**: the live navigation is the **footer nav** — `mir_footer_nav`, a `navLinks` block (`atoms/NavLinks.tsx`, `navLinksPropsSchema`: `items[{label, href}]`, `fontSize` px on md+ / `min(fontSize, 11vw)` below, `rules`, `highlightCurrent`, `newTab`). It's the phone-menu look set into the page: oversized Karepefx labels, one hairline row per destination, current route lit in the accent. Every footer (Sep 2026 layout, set on neighborhoods and copied to all pages) opens with the "Get in touch" kicker (row 1) and email (row 3, rowSpan 5) with socials at col 11 row 5, then the nav below (`col 1 / span 4 / row 11 / rowSpan 9` — the narrow span is what keeps the hairlines short — at `fontSize` 28 with a trailing ↗ `arrow` on each row; mobile span 8), colophon row 22; mobile is the same stack with socials at row 27 and the colophon at row 31. **Positions are per-instance** (mirrors share content, not layout), so a footer re-arrangement has to be copied to every page's `sec_footer` — a script over `content/pages/**` matching blocks by `mirrorId` does it. Edit the links on any page and every footer follows — same rule as the other footer mirrors. Items are curated by hand in the panel (page picker + free href), so adding a page = add its entry to the list.
- **The fixed navbar is dormant, not deleted**: `components/site/SiteNav.tsx` is still mounted from `src/app/(site)/layout.tsx` and the root `not-found.tsx`, but `content/site.json → nav.enabled` is `false`, so it renders nothing. Flip it back on in the **Navigation** panel on `/admin/routing` (which still edits `nav.items` — those feed only the navbar, not the footer block). What it does when enabled: on `md+` a full-width `glass-strong` bar with the links right-aligned on the column-12 edge, greyed out (no glass/blur, `--muted-foreground`, 60% opacity) while scrolling down and restored on scroll up / at the top / on hover (`useScrollingDown`); below `md` a frosted pill toggle opening a full-viewport overlay. `nav` uses zod `.prefault({})`, not `.default({})`, so a missing key still gets the nested defaults (zod 4 returns `.default()` values verbatim).

## Announcement banner (Sep 2026)

A dismissable strip that slides down over the top of every public page (`components/site/SiteAnnouncement.tsx`, mounted beside `SiteNav` in `(site)/layout.tsx` and the root `not-found.tsx`). White frosted glass (`--announcement` / `--announcement-foreground` tokens), centered Plex Mono, plain × — YJ rejected the cream, the accent hairline and the circular close button. Config is `content/site.json → announcement` (`enabled`, optional `label` kicker (empty by default), `message`, optional `linkLabel` + `href`; zod `.prefault({})` like `nav`), authored in the **Announcement** panel on `/admin/routing`, which previews the real `AnnouncementBar`. It renders nothing on the server — dismissal lives in localStorage keyed by a hash of message + link + `revision`, so a server-rendered bar would flash for visitors who dismissed it, and changing the message (or the panel's **Re-announce**, which bumps `revision`) re-shows it to everyone. Motion is CSS (`.announcement` in `globals.css`): slide down after `--duration`, slide up on dismiss (the component unmounts on `animationend` of `announcement-out*`); opacity-only under reduced motion.

## Projects page + project grid (Sep 2026)

`/projects` (`content/pages/projects.json`) is the visual index of the work — same grid-page pipeline, and it sits in `mir_footer_nav` between Home and Blog. It's built around one block:

- **`projectGrid`** (`atoms/ProjectGrid.tsx`, `projectGridPropsSchema`): a CSS grid of rectangular tiles. Each item is a background image (`src` + focal point) with **either a title image** (`titleSrc`, a logo/wordmark sized by `titleWidth` % of the tile) **or the `title` set in Karepefx** over a token scrim, plus an optional mono `meta` kicker and `href`. Tiles are **greyed out (`grayscale + brightness`) until hovered**, when they go full color and scale a touch (`.project-tile-media` in `globals.css`; always in color on phones — `hover: none` or below `md` — and on the editor's phone canvas; scale dropped under reduced motion). Items are curated by hand in the panel, like the carousel — adding a project = add its tile.
- **Columns are per-breakpoint via the mobile-override system, not a second prop**: `columns` (plus `gap` / `aspect`) is in `MOBILE_OVERRIDABLE_KEYS.projectGrid`, so the phone count is `block.mobile.props.columns`, edited in the panel's mobile mode. The registry's new `defaultMobileProps` (`{ columns: 1 }`) seeds that override when a grid is added, so a fresh 3-up grid lands 1-up on a phone without a hand edit. Use `defaultMobileProps` for any future block whose desktop default is wrong on a phone.
- The Holowand tile has assets (`holowandbanner` / `holowandlogo` in uploads) but no `work/` page yet, so it's unlinked until one exists.

## Work-page overview bullets (Sep 2026)

Every `work/*` page's description paragraph is followed by an `Overview` kicker (`text` / `kicker` / muted) and a `body` text block of literal `• ` bullet lines — one per role or task, short, echoing the tag-library keywords the project carries on home (C++, Blueprint, Unreal Engine, Unity, c#, UI, Programmer, Designer, Director, Artist). They're plain text blocks on purpose: a dedicated `overview` block type (numbered table rows, hairlines, panel-curated items) was built and dropped the same day as over-engineered and hard to read — don't reintroduce one. Edit the bullets inline in the editor like any other text.

## Image lightbox, PDF + Code viewers (Sep 2026)

One overlay shell, three uses. **`Overlay`** (`atoms/Overlay.tsx`) is a native modal `<dialog>` portaled to `<body>` (top layer — above nav, grain and vignette; reads the page's tokens, not a reverse section's), dark blurred backdrop, header bar (title · actions · ×), `.overlay` animations in `globals.css`. Mount to open; it calls `onClose` after the exit animation — **and** on the dialog's native `close` event (skipped if the dialog is open again when it arrives: dev Strict Mode's cleanup-then-rerun closes and reopens it on mount, and acting on that stale event unmounted every viewer the instant it opened), because Chrome won't let Escape be cancelled without recent user activation (or on a double press) and a natively closed dialog is `display:none`, so the exit animation would never end and the page would stay scroll-locked. Clicks on the backdrop close; the content layer is click-through, children opt surfaces back in with `pointer-events-auto`.

- **Image lightbox** (`components/Lightbox.tsx`): every Image block is click-to-enlarge on the public site — `lightbox` prop, default **on**, per-block toggle in the panel, ignored when `href` is set. `LightboxProvider` is mounted by `PageRenderer`, so the editor (which never renders PageRenderer) keeps click-to-select. The viewer pages through **every** lightbox image on the page in on-screen reading order (measured at open, so mobile layouts and hidden-on-mobile copies are right), ← → keys / swipe, click-to-zoom 2.5× toward the point (hover-pan with a mouse, drag-pan with a finger), `alt` as the caption. It keeps the block's color `filter`, drops its crop/zoom/rotate. **The img is sized from its aspect ratio and the measured stage, never its intrinsic size**: the optimizer's srcset advertises up to 3840w but never upscales, so a 1700px original gets a density-shrunk intrinsic width and sits small mid-screen.
- **`pdf` block** (`atoms/Pdf.tsx`, `lib/pdf.ts`): cover page in the block (`fit` contain = whole page, width = full width with the bottom fading; `page` picks the cover), caption strip (title · page count); click opens a reader with every page, zoom (50–300%), Open ↗ / Download. Rendered with **pdf.js** (`pdfjs-dist` legacy build, worker via `new URL(…, import.meta.url)` — Turbopack emits it to `/_next/static/media/`) so it's identical everywhere (native PDF iframes are blank on Android, one page on iOS). Upload/library in the panel: `/api/admin/upload` accepts `.pdf`, `/api/admin/uploads?kind=pdf` lists them.
- **`code` block** (`atoms/Code.tsx`, `lib/code-languages.ts`): framed listing (file name · language header, line numbers, `fontSize`), overflow fades at the bottom; click opens the full listing with Copy. **highlight.js** core + one grammar per language, themed from tokens by `.code-listing` in `globals.css` (lifted moss keywords, moss-tinted cream strings, sepia italic comments, weight for names — no new hues). Plex Mono via the `font-code` utility (bare `font-mono` is Tailwind's system stack).
- **pdf.js and highlight.js are dynamic imports and must stay that way**: `Mirror` imports the whole registry, so every atom's static imports ship on every page.
- PDF and code frames use `.viewer-frame`, which restores `--page-background` / `--page-foreground` (captured on `:root` before any section swap) so they stay dark windows on a reverse section. Inline clipping uses `overflow-clip`, not `hidden` — a hidden box is still programmatically scrollable (find-in-page, `scrollIntoView`) and slid the listing under its sticky gutter.

## Job tracker (dev-only, Aug 2026)

`/admin/jobs` is a private internship/job tracker + resume studio — a third admin surface next to the page editors, never deployed (same `src/proxy.ts` dev gate as the rest of admin).

- **Data**: `content/jobs/` — **gitignored** (private application data). `applications.json` (kanban records with JD snapshots, contacts, events) via `src/lib/jobs/{schema,store}.ts` (zod, same load/save pattern as `site.json`). Resume docx files live in `content/jobs/resume/` (+ `tailored/` subfolder), name-validated, binary round-tripped through `/api/admin/jobs/resume`.
- **Add-job autofill** (`/api/admin/jobs/fetch-posting`): Greenhouse / Lever / Ashby URLs are fetched server-side from their public no-auth JSON APIs (full JD text); other URLs get a best-effort page fetch. The paste-the-JD textarea is the permanent fallback — don't remove it.
- **Resume studio** (`/admin/jobs/resume`, full-bleed like `/admin/edit`): **SuperDoc** (`superdoc` npm, AGPL — fine here because the editor only runs on localhost dev) edits the docx in-browser; Save calls `superdoc.export({exportType:['docx'], triggerDownload:false})` and PUTs the Blob. SuperDoc requires its collaboration peers `@hocuspocus/provider` + `yjs` to be installed even when unused — removing them breaks the bundle with "Can't resolve '@hocuspocus/provider'". `?file=&app=` deep-links open a document with the tailor side panel (JD + missing-keyword checklist, re-scored on every save); "Duplicate as…" makes role-variant copies.
- **Keyword engine** (Aug 2026, all pure/no-LLM): `src/lib/jobs/skills.ts` (curated dictionary, hand-editable) + `keywords.ts` (n-gram match, requirements-section boost, Jobscan-style 60/15/10/15 scoring) + `docx.ts` (**dependency-free docx zip read/write via node:zlib** — text extraction, Google-Docs bullet normalization now auto-applied on upload, deterministic paragraph edits). `/api/admin/jobs/score` recomputes `matchScore`; badges + gap report in the board UI.
- **AI tailor** (`/api/admin/jobs/tailor`, Tailor button in the detail panel, `/tailor` skill in `.claude/skills/`): spawns headless `claude -p` via the shared streaming runner `src/lib/jobs/claude.ts` (`stream-json --include-partial-messages`; subscription-billed — do NOT wire an API key). The route **streams ndjson** (stage/thought/result) into `TailorOverlay` — progress bar + the model's live plan. Prompt contract (YJ's spec, details in the plan file): **one page NO MATTER WHAT — enforced as a line budget (85% of the source's estimated lines, `src/lib/jobs/onepage.ts`), with whole experiences dropped in pure JD-relevance order (section-agnostic — relevant ORGANIZATIONS entries are kept, filler PROJECTS entries drop) and a deterministic block-dropping fallback (`enforceOnePage`) if the model under-cuts**; words secondary at 475–600 aim ~550; XYZ bullet formula ("Accomplished X as measured by Y, by doing Z"); banned-buzzword list; keyword priority Preferred > Requirements > Responsibilities (also encoded as 2.5/2/1.5 section boosts in `keywords.ts`). Edits apply deterministically to `tailored/<app-id>.docx`.
- **Studio chat** (`/api/admin/jobs/chat` + `ChatPanel`, ✦ Chat in the studio chrome): streamed multi-turn chat over the open docx (session continuity via `claude --resume`; the route re-reads the docx every turn so paragraph indices stay fresh). ```edits fences in replies render as an Apply card → `/api/admin/jobs/resume/edits` patches the file and the editor reloads; Apply is blocked while the document has unsaved changes.
- **Discovery** (`/admin/jobs/discover`): SimplifyJobs internships/new-grad listings.json + `content/jobs/watchlist.json` ATS boards (fetchers in `src/lib/jobs/ats.ts`), scored vs every resume variant, cached in `leads.json` (6 h stale window); Track promotes to a Bookmarked application with the JD snapshotted.
- **The full roadmap + paid-for gotchas live in `.claude/jobs-tracker-plan.md`** (all five phases shipped 2026-08-25; remaining work is YJ hand-shaping role-variant docx files and filling the watchlist).

## Gotchas

- This is a fresh template — nothing from the previous Vite codebase (components, routes, assets under `public/projects`, `resume.pdf`) was carried over. If YJ asks for "the old X," it has to be pulled from git history (`git log --all`) or the GitHub UI, not assumed to exist on disk.
- The Vercel project is the same one that served the Vite build, so build settings on Vercel may still reference Vite. If a deploy fails, check Vercel's framework preset / build command before assuming a code issue.
- shadcn/ui and React Bits aren't installed yet — `src/components/ui` and `src/components/bits` are conventions, not existing folders. First component install will create them.
- **The public site is fully static** (Aug 2026): `/` prerenders and `[...slug]` uses `generateStaticParams`, safe because content is deploy-frozen in prod (admin is dev-only via `src/proxy.ts`). Don't reintroduce request-time APIs (`searchParams`, `headers()`, `cookies()`) into `(site)` routes — that silently flips them back to per-request serverless renders. The editor previews pages at their own `/<slug>` URL, not `/?preview=`.
- **Images go through `next/image` behind a local-path gate** (`isOptimizableImageSrc` in `atoms/imageStyles.ts`): only `/...` paths that aren't SVG use the optimizer; everything else (partial strings mid-keystroke in the editor, external URLs) falls back to a raw lazy `<img>`. Keep that gate when touching the Image atom, ProjectCarousel, or SectionImageBackground — `next/image` throws on invalid src and would crash the editor canvas.
- **WebGL background loops must pause offscreen**: every bit (LiquidEther, PrismaticBurst, Grainient, LightPillar, GridScan) gates its rAF render on an IntersectionObserver + `document.hidden`, and `SectionReactBitsBackground` swaps to the CSS fallback under `prefers-reduced-motion`. New backgrounds must follow the same pattern.
- **The layout grid is quantised on BOTH axes** (`src/lib/grid.ts`, Aug 2026): 12 columns across, 16px rows down, 16px gutter — one base unit for both. `ROW_HEIGHT_PX` went 8 → 16 and `content/` was migrated by halving row EDGES (`row'  = round((row-1)/2)+1`, `rowSpan' = mapEdge(row+rowSpan) - mapEdge(row)`) rather than rounding `row` and `rowSpan` independently — that's what preserved shared edges and stacking order, at the cost of ≤8px of edge drift. **A 24px rhythm can't land on a 16px grid, so don't "fix" the 8px offsets by re-rounding; re-migrate from git history if the unit ever changes again.** `moduleSnap` (`lib/rgl.ts`) snaps `y`/`h` on drag + resize and `SectionFrame` draws the matching rules, both off `ROWS_PER_MODULE` (currently 1 — the row is the module). Import the constants; don't re-declare `12`, `16`, or a bare row count in a component.
- **Write `-webkit-backdrop-filter` BEFORE `backdrop-filter` in hand-written CSS.** The build's CSS minifier folds the pair into one property and keeps only the last-written form, so the usual unprefixed-then-webkit order ships webkit-only and Chrome/Firefox get no blur. `.overlay-backdrop` is written the safe way; `.glass-panel` / `.glass-strong` / `.glass-subtle` / `.announcement` still have the old order (so no blur outside Safari) as of Sep 2026.
- The `@imgly/background-removal` import in PropertiesPanel is wrapped in `if (process.env.NODE_ENV === "development")` so its ~47MB of onnxruntime WASM stays out of production builds. Keep the import inside that statically-false branch (not merely after a dev-check throw), or the WASM comes back to every deploy.
