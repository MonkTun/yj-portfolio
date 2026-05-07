# CLAUDE.md

Project memory for Claude Code working in this repo.

## What this is

YJ's (Youngje Park's) personal portfolio. Two surfaces share the same codebase:

1. **Public portfolio** — the site visitors see.
2. **Admin / editor** — a self-built, Framer-style visual editor where YJ can drag, drop, and arrange UI elements freely without writing code for every change. Think: DIY Framer. The output of the editor is what the public site renders.

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

The site is **kinetic**, not restrained — closer to [measured.site](https://www.measured.site/) than to a static print spread. Motion is a primary expressive medium, not a finishing touch; without it, the layout is half-built.

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

No purples. No blue greys. No pure white *as a body / background color* — white is reserved for text sitting on `--accent`.

**Typography** (registered via `next/font`):

- `--font-display` — **Karepefx** (local OTFs in `src/fonts/karepefx`, weights 300/400/500/700/800/900). Used for hero, headlines, section titles, large pull quotes, drop caps. Distinctive geometric/futurist face — the visual signature of the site. Display sizes lean into the heavier weights (700–900); body-display sizes stay at 400–500.
- `--font-body` — **Newsreader** (variable, Google Fonts). Used for all running text. Italic is the working italic — use it freely (publications, dates, foreign words).
- `--font-mono` — **IBM Plex Mono**. Used for metadata: dates, credit lines, image captions, section numbers (`§ 02 — Selected work`), URLs, and editor UI labels.

**Banned (per the design contract)**: Inter, Roboto, Arial, system-ui as primary face, Space Grotesk, Geist Sans/Mono as primary faces, and Fraunces (was the previous direction; replaced by Karepefx). Sans-serif body in general — body is serif on this site.

**Type rules**:

- Display sizes use Karepefx with letter-spacing slightly negative (~`-0.02em`) and tight leading (~`0.92`). Pair heavy weights (800/900) at large sizes; lighten to 500 at medium.
- Body in Newsreader at 17–19px with leading ~`1.6`. Italics for publications/dates inline.
- Mono labels are uppercase, tracked out (`+0.14em`), small (11–12px), in `--muted-foreground`. They sit above headlines like print kickers.
- Numbers use `font-feature-settings: "tnum"` everywhere they appear in tabular contexts (dates, credits).

**Layout sensibility**:

- Asymmetric magazine grid; deliberate offsets (a headline starts at column 3 of 12; an image bleeds to column 9). Not chaotic — *composed*.
- Generous dark space. A spread can be mostly empty.
- Numbered sections (`§ 01`, `§ 02`). Hairline dividers (1px `--border`) between major sections.

**Motion vocabulary**:

The reference is [measured.site](https://www.measured.site/) — kinetic, scroll-driven, dimensional — translated into the dark editorial palette. Motion carries the layout.

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

## Gotchas

- This is a fresh template — nothing from the previous Vite codebase (components, routes, assets under `public/projects`, `resume.pdf`) was carried over. If YJ asks for "the old X," it has to be pulled from git history (`git log --all`) or the GitHub UI, not assumed to exist on disk.
- The Vercel project is the same one that served the Vite build, so build settings on Vercel may still reference Vite. If a deploy fails, check Vercel's framework preset / build command before assuming a code issue.
- shadcn/ui and React Bits aren't installed yet — `src/components/ui` and `src/components/bits` are conventions, not existing folders. First component install will create them.
