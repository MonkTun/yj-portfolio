"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  paletteToCssVars,
  paletteToFontVars,
  paletteToSizeVars,
  PALETTE_FIELDS,
  SIZE_FIELDS,
} from "@/lib/theme";
import {
  fontOptionsForRole,
  resolveFont,
  FONT_ROLES,
  FONT_ROLE_HINTS,
  FONT_ROLE_LABELS,
  type FontRole,
} from "@/lib/fonts";
import type {
  Palette,
  PaletteColors,
  PaletteSizes,
  Theme,
} from "@/lib/schema";

type Props = { initialTheme: Theme };

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function slugifyName(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-+|-+$/g, "") || `palette-${Date.now()}`
  );
}

function uniqueId(base: string, taken: Set<string>): string {
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export function ThemePanel({ initialTheme }: Props) {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>(initialTheme);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // commit() owns the round-trip: snapshot the previous theme, optimistically
  // update the UI, post to the server, and roll back on failure. Server's
  // validated copy wins on success so server-side defaults / id-uniqueness
  // tweaks aren't silently dropped on the client.
  function commit(next: Theme) {
    const previous = theme;
    setError(null);
    setTheme(next);
    fetch("/api/admin/theme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        if (body?.theme) setTheme(body.theme);
        startTransition(() => router.refresh());
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setTheme(previous);
      });
  }

  function activate(id: string) {
    if (id === theme.activePaletteId) return;
    commit({ ...theme, activePaletteId: id });
  }

  function update(id: string, patch: Partial<Palette>) {
    commit({
      ...theme,
      palettes: theme.palettes.map((p) =>
        p.id === id ? { ...p, ...patch } : p,
      ),
    });
  }

  function updateColor(id: string, key: keyof PaletteColors, value: string) {
    commit({
      ...theme,
      palettes: theme.palettes.map((p) =>
        p.id === id ? { ...p, colors: { ...p.colors, [key]: value } } : p,
      ),
    });
  }

  function updateFont(id: string, role: FontRole, value: string) {
    commit({
      ...theme,
      palettes: theme.palettes.map((p) =>
        p.id === id ? { ...p, fonts: { ...p.fonts, [role]: value } } : p,
      ),
    });
  }

  function updateSize(id: string, key: keyof PaletteSizes, value: number) {
    commit({
      ...theme,
      palettes: theme.palettes.map((p) =>
        p.id === id ? { ...p, sizes: { ...p.sizes, [key]: value } } : p,
      ),
    });
  }

  function remove(id: string) {
    if (theme.palettes.length <= 1) return;
    const remaining = theme.palettes.filter((p) => p.id !== id);
    const nextActive =
      id === theme.activePaletteId ? remaining[0].id : theme.activePaletteId;
    if (editingId === id) setEditingId(null);
    commit({ ...theme, palettes: remaining, activePaletteId: nextActive });
  }

  function duplicate(source: Palette) {
    const taken = new Set(theme.palettes.map((p) => p.id));
    const id = uniqueId(slugifyName(`${source.name}-copy`), taken);
    const next: Palette = {
      id,
      name: `${source.name} copy`,
      colors: { ...source.colors },
      fonts: { ...source.fonts },
      sizes: { ...source.sizes },
    };
    setEditingId(id);
    commit({ ...theme, palettes: [...theme.palettes, next] });
  }

  function createBlank() {
    const taken = new Set(theme.palettes.map((p) => p.id));
    const id = uniqueId(slugifyName("untitled"), taken);
    const active =
      theme.palettes.find((p) => p.id === theme.activePaletteId) ??
      theme.palettes[0];
    const next: Palette = {
      id,
      name: "Untitled",
      colors: { ...active.colors },
      fonts: { ...active.fonts },
      sizes: { ...active.sizes },
    };
    setEditingId(id);
    commit({ ...theme, palettes: [...theme.palettes, next] });
  }

  return (
    <section className="border border-border rounded-sm p-5 bg-surface/40 space-y-5">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="kicker">Palettes</p>
          <p className="text-foreground/60 italic text-sm mt-1">
            Edit colors and fonts together. Activate one to apply it
            site-wide — values are injected as CSS variables on{" "}
            <code className="font-sans">&lt;html&gt;</code>.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {pending && (
            <span className="kicker text-foreground/40">Saving…</span>
          )}
          <button
            type="button"
            onClick={createBlank}
            className="kicker px-3 py-1.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
          >
            + New palette
          </button>
        </div>
      </header>

      <ul className="space-y-3">
        {theme.palettes.map((palette) => (
          <PaletteRow
            key={palette.id}
            palette={palette}
            isActive={palette.id === theme.activePaletteId}
            isEditing={editingId === palette.id}
            canDelete={theme.palettes.length > 1}
            onActivate={() => activate(palette.id)}
            onToggleEdit={() =>
              setEditingId(editingId === palette.id ? null : palette.id)
            }
            onDuplicate={() => duplicate(palette)}
            onDelete={() => remove(palette.id)}
            onChangeName={(name) => update(palette.id, { name })}
            onChangeColor={(key, value) => updateColor(palette.id, key, value)}
            onChangeFont={(role, value) => updateFont(palette.id, role, value)}
            onChangeSize={(key, value) => updateSize(palette.id, key, value)}
          />
        ))}
      </ul>

      {error && (
        <p className="text-sm italic text-accent">Couldn&apos;t save: {error}</p>
      )}
    </section>
  );
}

function PaletteRow({
  palette,
  isActive,
  isEditing,
  canDelete,
  onActivate,
  onToggleEdit,
  onDuplicate,
  onDelete,
  onChangeName,
  onChangeColor,
  onChangeFont,
  onChangeSize,
}: {
  palette: Palette;
  isActive: boolean;
  isEditing: boolean;
  canDelete: boolean;
  onActivate: () => void;
  onToggleEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onChangeName: (name: string) => void;
  onChangeColor: (key: keyof PaletteColors, value: string) => void;
  onChangeFont: (role: FontRole, value: string) => void;
  onChangeSize: (key: keyof PaletteSizes, value: number) => void;
}) {
  // Standalone preview: render the swatch row inside its own scope so the
  // values represent THIS palette's colors, not the active one. The inline
  // style just sets local CSS variables that the swatches read.
  const previewStyle = useMemo(
    () => paletteToCssVars(palette.colors),
    [palette.colors],
  );

  // Full preview style — includes colors, fonts AND sizes — so the combined
  // type-hierarchy preview inside the editing pane reflects every knob.
  const fullPreviewStyle = useMemo(
    () => ({
      ...paletteToCssVars(palette.colors),
      ...paletteToFontVars(palette.fonts),
      ...paletteToSizeVars(palette.sizes),
    }),
    [palette.colors, palette.fonts, palette.sizes],
  );

  return (
    <li
      className={`border rounded-sm transition-colors ${
        isActive ? "border-accent" : "border-border"
      }`}
    >
      <div
        className="flex items-center gap-4 px-4 py-3"
        style={previewStyle}
      >
        <Swatches colors={palette.colors} />
        <div className="flex-1 min-w-0">
          <p
            className="font-display text-xl truncate"
            style={{ color: "var(--foreground)" }}
          >
            {palette.name}
          </p>
          <p className="kicker mt-0.5">{palette.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {isActive ? (
            <span className="kicker px-2 py-1 rounded-sm bg-accent text-accent-foreground">
              Active
            </span>
          ) : (
            <button
              type="button"
              onClick={onActivate}
              className="kicker px-2 py-1 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
            >
              Activate
            </button>
          )}
          <button
            type="button"
            onClick={onToggleEdit}
            className="kicker px-2 py-1 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
          >
            {isEditing ? "Done" : "Edit"}
          </button>
          <button
            type="button"
            onClick={onDuplicate}
            className="kicker px-2 py-1 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={onDelete}
            disabled={!canDelete}
            title={canDelete ? "Delete palette" : "Need at least one palette"}
            className="kicker px-2 py-1 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Delete
          </button>
        </div>
      </div>

      {isEditing && (
        <div className="border-t border-border px-4 py-4 space-y-6">
          <TypePreview style={fullPreviewStyle} paletteName={palette.name} />

          <label className="block">
            <span className="kicker block mb-1.5">Name</span>
            <input
              value={palette.name}
              onChange={(e) => onChangeName(e.target.value)}
              className="w-full bg-background border border-border rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-accent transition-colors"
            />
          </label>

          <div>
            <p className="kicker mb-3">Colors</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PALETTE_FIELDS.map(({ key, label, hint }) => (
                <ColorField
                  key={key}
                  label={label}
                  hint={hint}
                  value={palette.colors[key]}
                  onCommit={(next) => onChangeColor(key, next)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="kicker mb-3">Fonts</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FONT_ROLES.map((role) => (
                <FontField
                  key={role}
                  role={role}
                  value={palette.fonts[role]}
                  onChange={(next) => onChangeFont(role, next)}
                />
              ))}
            </div>
          </div>

          <div>
            <p className="kicker mb-3">Sizes</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SIZE_FIELDS.map((field) => (
                <SizeField
                  key={field.key}
                  field={field}
                  value={palette.sizes[field.key]}
                  onCommit={(next) => onChangeSize(field.key, next)}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </li>
  );
}

/** Combined type-hierarchy preview. Renders kicker → display → body inline,
 *  using the palette being previewed (via inline CSS vars on the wrapper)
 *  rather than the globally-active one. Sizes scale from the palette's
 *  --text-header / --text-body so the preview reflects the size knobs too.
 */
function TypePreview({
  style,
  paletteName,
}: {
  style: React.CSSProperties;
  paletteName: string;
}) {
  return (
    <div
      className="rounded-sm border overflow-hidden"
      style={{
        ...style,
        background: "var(--background)",
        color: "var(--foreground)",
        borderColor: "var(--border)",
      }}
    >
      <div className="px-6 py-7 sm:px-8 sm:py-9">
        <p className="kicker">§ {paletteName} — type preview</p>
        <p
          className="font-display mt-3 leading-[0.9] tracking-[-0.02em] font-black"
          style={{ fontSize: "calc(var(--text-header) * 0.34)" }}
        >
          The quick brown fox
        </p>
        <p
          className="mt-4 max-w-prose"
          style={{
            fontFamily: "var(--font-body)",
            fontSize: "var(--text-body)",
            lineHeight: 1.55,
          }}
        >
          Pack my box with five dozen liquor jugs — running text in the body
          face. <em>Italics handle nuance, publications, and asides.</em>
        </p>
      </div>
    </div>
  );
}

function FontField({
  role,
  value,
  onChange,
}: {
  role: FontRole;
  value: string;
  onChange: (next: string) => void;
}) {
  const options = useMemo(() => fontOptionsForRole(role), [role]);
  const resolved = resolveFont(value, role);

  return (
    <label className="block">
      <span className="kicker block mb-1.5">{FONT_ROLE_LABELS[role]}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-background border border-border rounded-sm px-3 py-2 font-sans text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
      >
        {/* Surface unknown ids so the user can see what's saved on disk
            without it silently snapping to the role default. */}
        {!options.some((o) => o.id === value) && (
          <option value={value}>(missing) {value}</option>
        )}
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.label}
          </option>
        ))}
      </select>
      <p className="text-xs italic text-foreground/40 mt-1">
        {resolved.flavour} — {FONT_ROLE_HINTS[role]}
      </p>
    </label>
  );
}

function SizeField({
  field,
  value,
  onCommit,
}: {
  field: (typeof SIZE_FIELDS)[number];
  value: number;
  onCommit: (next: number) => void;
}) {
  // Same draft pattern as ColorField — we accept partial keystrokes and
  // only commit when the value parses to a number in range.
  const [draft, setDraft] = useState(String(value));
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(String(value));
  }

  function clamp(n: number) {
    return Math.max(field.min, Math.min(field.max, n));
  }

  function commitDraft(raw: string) {
    const parsed = Number(raw);
    if (Number.isFinite(parsed)) {
      const clamped = clamp(parsed);
      if (clamped !== value) onCommit(clamped);
      else setDraft(String(value));
    } else {
      setDraft(String(value));
    }
  }

  return (
    <label className="block">
      <span className="kicker block mb-1.5">{field.label}</span>
      <div className="flex items-stretch gap-2">
        <input
          type="number"
          step={field.step}
          min={field.min}
          max={field.max}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitDraft(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft(draft.trim());
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="flex-1 min-w-0 bg-background border border-border rounded-sm px-3 py-2 font-sans text-sm focus:outline-none focus:border-accent transition-colors"
        />
        <span className="kicker self-center text-foreground/40">rem</span>
      </div>
      <p className="text-xs italic text-foreground/40 mt-1">{field.hint}</p>
    </label>
  );
}

function Swatches({ colors }: { colors: PaletteColors }) {
  const order: Array<{ key: keyof PaletteColors; ring?: boolean }> = [
    { key: "background" },
    { key: "surface" },
    { key: "foreground" },
    { key: "mutedForeground" },
    { key: "border" },
    { key: "accent", ring: true },
    { key: "accentForeground" },
  ];
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {order.map(({ key, ring }) => (
        <span
          key={key}
          title={key}
          className="block h-7 w-7 rounded-sm border border-border"
          style={{
            background: colors[key],
            outline: ring ? "1px solid var(--accent)" : undefined,
            outlineOffset: ring ? "1px" : undefined,
          }}
        />
      ))}
    </div>
  );
}

function ColorField({
  label,
  hint,
  value,
  onCommit,
}: {
  label: string;
  hint: string;
  value: string;
  onCommit: (next: string) => void;
}) {
  // Mirror the prop into local state so users can type a half-finished hex
  // (#5C8) without us hammering the network on every keystroke. We only push
  // up when the value is well-formed, on blur, or via the native picker.
  // The `lastValue` shadow lets us re-sync the draft when the canonical
  // prop changes from outside (server normalized casing, palette swap, etc.)
  // — set-state-during-render is the React-blessed pattern for derived state.
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }

  function commitDraft(next: string) {
    if (HEX_RE.test(next) && next.toLowerCase() !== value.toLowerCase()) {
      onCommit(next.toUpperCase());
    } else if (!HEX_RE.test(next)) {
      // Snap back to the last good value if the user typed garbage.
      setDraft(value);
    }
  }

  return (
    <label className="block">
      <span className="kicker block mb-1.5">{label}</span>
      <div className="flex items-stretch gap-2">
        <span className="relative inline-block h-9 w-9 shrink-0 rounded-sm border border-border overflow-hidden">
          <span
            className="absolute inset-0"
            style={{ background: draft }}
            aria-hidden
          />
          <input
            type="color"
            value={HEX_RE.test(draft) ? draft : value}
            onChange={(e) => {
              setDraft(e.target.value.toUpperCase());
              onCommit(e.target.value.toUpperCase());
            }}
            className="absolute inset-0 opacity-0 cursor-pointer"
            aria-label={`${label} color picker`}
          />
        </span>
        <input
          type="text"
          value={draft}
          spellCheck={false}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commitDraft(e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitDraft(draft.trim());
              (e.target as HTMLInputElement).blur();
            }
          }}
          placeholder="#000000"
          className="flex-1 min-w-0 bg-background border border-border rounded-sm px-3 font-sans text-sm focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <p className="text-xs italic text-foreground/40 mt-1">{hint}</p>
    </label>
  );
}
