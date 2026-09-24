"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { NavConfig, NavItem } from "@/lib/schema";

type Props = {
  initialNav: NavConfig;
  pages: string[];
};

/**
 * Editor for the site-wide navigation bar (content/site.json → `nav`).
 * Unlike the routing roles above it, this is a small form with several
 * fields, so it saves on an explicit button rather than per keystroke —
 * the bar is public chrome and a half-typed label shouldn't ship mid-edit.
 */
export function NavPanel({ initialNav, pages }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState<NavConfig>(initialNav);
  const [nav, setNav] = useState<NavConfig>(initialNav);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();

  const dirty = JSON.stringify(nav) !== JSON.stringify(saved);
  const invalid = nav.items.some((it) => !it.label.trim() || !it.href.trim());

  function setItem(i: number, patch: Partial<NavItem>) {
    setNav((n) => ({
      ...n,
      items: n.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }));
  }
  function addItem() {
    setNav((n) => ({ ...n, items: [...n.items, { label: "", href: "/" }] }));
  }
  function removeItem(i: number) {
    setNav((n) => ({ ...n, items: n.items.filter((_, idx) => idx !== i) }));
  }
  function move(i: number, dir: -1 | 1) {
    setNav((n) => {
      const j = i + dir;
      if (j < 0 || j >= n.items.length) return n;
      const items = n.items.slice();
      [items[i], items[j]] = [items[j], items[i]];
      return { ...n, items };
    });
  }

  async function save() {
    if (!dirty || invalid || busy) return;
    setBusy(true);
    setError(null);
    const cleaned: NavConfig = {
      ...nav,
      items: nav.items.map((it) => ({
        label: it.label.trim(),
        href: it.href.trim(),
      })),
    };
    try {
      const res = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nav: cleaned }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      const next: NavConfig = body?.config?.nav ?? cleaned;
      setSaved(next);
      setNav(next);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="border border-border rounded-sm p-5 bg-surface/40 space-y-5">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="kicker">Navigation</p>
          <p className="text-foreground/60 italic text-sm mt-1">
            A floating Menu pill at the top right of every public page — it
            unfolds to the left on desktop, and opens a full-screen overlay
            on phones. A link can
            be a page, a section anchor (
            <code className="font-sans">/#sec_id</code>), or a full URL.
          </p>
        </div>
        {pending && <span className="kicker text-foreground/40">Refreshing…</span>}
      </header>

      <div className="flex items-center gap-3">
        <Switch
          on={nav.enabled}
          onChange={(on) => setNav((n) => ({ ...n, enabled: on }))}
        />
        <p className="text-sm text-foreground/70">
          {nav.enabled ? "Menu is shown" : "Menu is hidden on the public site"}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="kicker">links · {nav.items.length}</span>
          <button
            type="button"
            onClick={addItem}
            className="kicker px-2 py-1.5 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
          >
            + Add link
          </button>
        </div>

        {nav.items.length === 0 && (
          <p className="text-sm italic text-foreground/50">
            No links — the menu button opens an empty panel.
          </p>
        )}

        <ul className="space-y-3">
          {nav.items.map((item, i) => (
            <li
              key={i}
              className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-3 items-end rounded-sm border border-border bg-background/40 p-3"
            >
              <label className="block">
                <span className="kicker block mb-1.5">label</span>
                <input
                  value={item.label}
                  onChange={(e) => setItem(i, { label: e.target.value })}
                  placeholder="Blog"
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className="kicker block mb-1.5">page</span>
                <select
                  value={pages.includes(item.href.replace(/^\//, "")) ? item.href.replace(/^\//, "") : ""}
                  onChange={(e) => {
                    if (e.target.value) setItem(i, { href: `/${e.target.value}` });
                  }}
                  className={`${inputCls} appearance-none cursor-pointer`}
                >
                  <option value="">(custom — type beside)</option>
                  {pages
                    .filter((s) => s !== "404" && s !== "construction")
                    .map((slug) => (
                      <option key={slug} value={slug}>
                        /{slug}
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                <span className="kicker block mb-1.5">href</span>
                <input
                  value={item.href}
                  onChange={(e) => setItem(i, { href: e.target.value })}
                  placeholder="/blog, /#sec_footer, https://…"
                  className={`${inputCls} font-sans text-xs`}
                />
              </label>
              <div className="flex gap-1 pb-0.5">
                <RowBtn label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                  ↑
                </RowBtn>
                <RowBtn
                  label="Move down"
                  disabled={i === nav.items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </RowBtn>
                <RowBtn label="Remove" onClick={() => removeItem(i)}>
                  ✕
                </RowBtn>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || invalid || busy}
          className="kicker px-4 py-2.5 rounded-sm bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Saving…" : "Save navigation"}
        </button>
        {dirty && !invalid && !busy && (
          <span className="kicker text-foreground/40">Unsaved changes</span>
        )}
        {invalid && (
          <span className="text-xs italic text-foreground/60">
            Every link needs a label and an href.
          </span>
        )}
        {error && (
          <span className="text-sm italic text-accent">Couldn&apos;t save: {error}</span>
        )}
      </div>
    </section>
  );
}

export const inputCls =
  "mt-1.5 w-full bg-background border border-border rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-accent transition-colors";

export function Switch({ on, onChange }: { on: boolean; onChange: (on: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 rounded-full transition-colors border ${
        on ? "bg-accent border-accent" : "bg-background border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform ${
          on ? "translate-x-5 bg-accent-foreground" : "translate-x-0 bg-foreground/70"
        }`}
      />
    </button>
  );
}

function RowBtn({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="grid h-9 w-9 place-items-center rounded-sm border border-border text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-accent disabled:opacity-30 disabled:pointer-events-none"
    >
      {children}
    </button>
  );
}
