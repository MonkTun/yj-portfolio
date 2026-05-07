/* ============================================================
   Font registry.

   The set of fonts available to palettes is fixed at build time —
   `next/font` requires statically-resolvable imports, so we can't
   load arbitrary user-supplied fonts at request time.

   The flow:
     1. layout.tsx imports each font once via next/font and binds
        it to a per-font CSS variable (e.g. `--font-playfair-display`).
     2. The active palette names a font for each role (display, body,
        sans). layout.tsx maps those names back to the CSS variables
        and sets the role variables (--font-display, etc.) as inline
        style on <html>.
     3. globals.css and Tailwind utilities continue to read the role
        variables, oblivious to which concrete font is in use.
   ============================================================ */

export type FontRole = "display" | "body" | "sans";

export const FONT_ROLES: FontRole[] = ["display", "body", "sans"];

export const FONT_ROLE_LABELS: Record<FontRole, string> = {
  display: "Display",
  body: "Body",
  sans: "Sans",
};

export const FONT_ROLE_HINTS: Record<FontRole, string> = {
  display: "Hero, headlines, drop caps.",
  body: "Running text, captions, paragraphs.",
  sans: "Kickers, micro-labels, UI chrome.",
};

export type FontOption = {
  id: string;
  /** Human-friendly name shown in dropdowns. */
  label: string;
  /** CSS variable that next/font binds in layout.tsx. Without the
   *  leading `var(...)` — callers wrap as needed. */
  cssVar: string;
  /** Generic fallback class used in CSS font stacks. */
  fallback: "serif" | "sans-serif" | "monospace";
  /** One-word descriptor for the dropdown UI. */
  flavour: string;
  /** Roles this font can fill — drives the dropdown's option list. */
  roles: FontRole[];
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "karepefx",
    label: "Karepefx",
    cssVar: "--font-karepefx",
    fallback: "serif",
    flavour: "Geometric / futurist display",
    roles: ["display"],
  },
  {
    id: "playfair-display",
    label: "Playfair Display",
    cssVar: "--font-playfair-display",
    fallback: "serif",
    flavour: "High-contrast didone serif",
    roles: ["display", "body"],
  },
  {
    id: "newsreader",
    label: "Newsreader",
    cssVar: "--font-newsreader",
    fallback: "serif",
    flavour: "Workhorse editorial serif",
    roles: ["body"],
  },
  {
    id: "crimson-pro",
    label: "Crimson Pro",
    cssVar: "--font-crimson-pro",
    fallback: "serif",
    flavour: "Classical book serif",
    roles: ["body"],
  },
  {
    id: "bricolage",
    label: "Bricolage Grotesque",
    cssVar: "--font-bricolage",
    fallback: "sans-serif",
    flavour: "Quirky modern sans",
    roles: ["sans", "body"],
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    cssVar: "--font-dm-sans",
    fallback: "sans-serif",
    flavour: "Neutral geometric sans",
    roles: ["sans", "body"],
  },
  // ---- Monospaced faces, repurposed -------------------------------------
  // No dedicated mono role anymore — but the technical-feeling rhythm of a
  // monospace works as a body or kicker face when used deliberately.
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    cssVar: "--font-ibm-plex-mono",
    fallback: "monospace",
    flavour: "Editorial monospace",
    roles: ["body", "sans"],
  },
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    cssVar: "--font-jetbrains-mono",
    fallback: "monospace",
    flavour: "Technical monospace",
    roles: ["body", "sans"],
  },
  // ---- Pixel fonts (opt-in; preload:false in layout.tsx) -----------------
  // Allowed in display + sans only — pixel faces at body sizes get
  // unreadable fast.
  {
    id: "galmuri9",
    label: "Galmuri9",
    cssVar: "--font-galmuri9",
    fallback: "monospace",
    flavour: "9px Korean pixel display",
    roles: ["display", "sans"],
  },
  {
    id: "pf-stardust",
    label: "PF Stardust",
    cssVar: "--font-pf-stardust",
    fallback: "monospace",
    flavour: "Chunky pixel display",
    roles: ["display", "sans"],
  },
  {
    id: "pf-stardust-s",
    label: "PF Stardust S",
    cssVar: "--font-pf-stardust-s",
    fallback: "monospace",
    flavour: "Condensed pixel display",
    roles: ["display", "sans"],
  },
];

const FONT_BY_ID = new Map(FONT_OPTIONS.map((f) => [f.id, f]));

export const DEFAULT_FONTS: Record<FontRole, string> = {
  display: "karepefx",
  body: "playfair-display",
  sans: "bricolage",
};

export function fontOptionsForRole(role: FontRole): FontOption[] {
  return FONT_OPTIONS.filter((f) => f.roles.includes(role));
}

/** Resolve a font id to a `FontOption`, falling back to the role default
 *  when the id is missing or doesn't fit the requested role. Keeps the
 *  app rendering cleanly even if theme.json names an unknown font. */
export function resolveFont(id: string, role: FontRole): FontOption {
  const opt = FONT_BY_ID.get(id);
  if (opt && opt.roles.includes(role)) return opt;
  return FONT_BY_ID.get(DEFAULT_FONTS[role])!;
}

export function fontExists(id: string): boolean {
  return FONT_BY_ID.has(id);
}

export function fontFitsRole(id: string, role: FontRole): boolean {
  const opt = FONT_BY_ID.get(id);
  return Boolean(opt && opt.roles.includes(role));
}
