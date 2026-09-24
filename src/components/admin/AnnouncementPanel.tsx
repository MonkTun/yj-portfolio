"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { AnnouncementConfig } from "@/lib/schema";
import { AnnouncementBar } from "@/components/site/SiteAnnouncement";
import { Switch, inputCls } from "./NavPanel";

type Props = {
  initialAnnouncement: AnnouncementConfig;
  pages: string[];
};

/**
 * Editor for the site-wide announcement strip (content/site.json →
 * `announcement`). Saves on an explicit button like the navigation panel —
 * it's public chrome, so a half-typed message shouldn't ship mid-edit. The
 * preview renders the real `AnnouncementBar`, so what you see here is what
 * slides in on the site.
 */
export function AnnouncementPanel({ initialAnnouncement, pages }: Props) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialAnnouncement);
  const [draft, setDraft] = useState(initialAnnouncement);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  // Bumped to remount the preview, replaying its entrance animation.
  const [replay, setReplay] = useState(0);

  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  const invalid = draft.enabled && !draft.message.trim();

  function set(patch: Partial<AnnouncementConfig>) {
    setDraft((d) => ({ ...d, ...patch }));
  }

  async function save() {
    if (!dirty || invalid || busy) return;
    setBusy(true);
    setError(null);
    const cleaned: AnnouncementConfig = {
      ...draft,
      label: draft.label.trim(),
      message: draft.message.trim(),
      linkLabel: draft.linkLabel.trim(),
      href: draft.href.trim(),
    };
    try {
      const res = await fetch("/api/admin/site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcement: cleaned }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      const next: AnnouncementConfig = body?.config?.announcement ?? cleaned;
      setSaved(next);
      setDraft(next);
      startTransition(() => router.refresh());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const pageValue = draft.href.replace(/^\//, "");

  return (
    <section className="border border-border rounded-sm p-5 bg-surface/40 space-y-5">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="kicker">Announcement</p>
          <p className="text-foreground/60 italic text-sm mt-1">
            A dismissable strip that slides down over the top of every public
            page. Each visitor&apos;s dismissal is remembered per message, so
            changing the text — or Re-announce — shows it to everyone again.
          </p>
        </div>
        {pending && <span className="kicker text-foreground/40">Refreshing…</span>}
      </header>

      <div className="flex items-center gap-3">
        <Switch on={draft.enabled} onChange={(on) => set({ enabled: on })} />
        <p className="text-sm text-foreground/70">
          {draft.enabled
            ? "Announcement is shown"
            : "Announcement is hidden on the public site"}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[12rem_1fr] gap-3">
        <label className="block">
          <span className="kicker block mb-1.5">label (optional)</span>
          <input
            value={draft.label}
            onChange={(e) => set({ label: e.target.value })}
            placeholder="Heads up"
            maxLength={30}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="kicker block mb-1.5">message</span>
          <textarea
            value={draft.message}
            onChange={(e) => set({ message: e.target.value })}
            placeholder="What should visitors know?"
            maxLength={300}
            rows={2}
            className={`${inputCls} resize-y`}
          />
        </label>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="block">
          <span className="kicker block mb-1.5">link label (optional)</span>
          <input
            value={draft.linkLabel}
            onChange={(e) => set({ linkLabel: e.target.value })}
            placeholder="Read more"
            maxLength={40}
            className={inputCls}
          />
        </label>
        <label className="block">
          <span className="kicker block mb-1.5">page</span>
          <select
            value={pages.includes(pageValue) ? pageValue : ""}
            onChange={(e) => {
              if (e.target.value) set({ href: `/${e.target.value}` });
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
            value={draft.href}
            onChange={(e) => set({ href: e.target.value })}
            placeholder="/blog, /#sec_footer, https://…"
            className={`${inputCls} font-sans text-xs`}
          />
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="kicker">preview</span>
          <button
            type="button"
            onClick={() => setReplay((n) => n + 1)}
            className="kicker text-foreground/60 hover:text-accent transition-colors"
          >
            ↻ Replay entrance
          </button>
        </div>
        <div className="relative overflow-hidden rounded-sm border border-border bg-background h-32">
          {draft.message.trim() ? (
            <AnnouncementBar key={replay} announcement={draft} />
          ) : (
            <p className="absolute inset-0 grid place-items-center text-sm italic text-foreground/40">
              Type a message to preview it.
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4 pt-1">
        <button
          type="button"
          onClick={save}
          disabled={!dirty || invalid || busy}
          className="kicker px-4 py-2.5 rounded-sm bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Saving…" : "Save announcement"}
        </button>
        <button
          type="button"
          onClick={() => set({ revision: saved.revision + 1 })}
          disabled={busy || draft.revision !== saved.revision}
          title="Show this message again to visitors who dismissed it"
          className="kicker px-3 py-2.5 rounded-sm border border-border text-foreground/70 transition-colors hover:text-accent hover:border-accent disabled:opacity-40 disabled:cursor-not-allowed"
        >
          ↻ Re-announce
        </button>
        {dirty && !invalid && !busy && (
          <span className="kicker text-foreground/40">
            {draft.revision !== saved.revision
              ? "Save to show it to everyone again"
              : "Unsaved changes"}
          </span>
        )}
        {invalid && (
          <span className="text-xs italic text-foreground/60">
            An enabled announcement needs a message.
          </span>
        )}
        {error && (
          <span className="text-sm italic text-accent">Couldn&apos;t save: {error}</span>
        )}
      </div>
    </section>
  );
}
