"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "error";

type Props = {
  slug: string;
  /** Full frontmatter object as authored — unknown keys are preserved. */
  initialData: Record<string, unknown>;
  /** Markdown body, frontmatter stripped. */
  initialBody: string;
};

type MetaState = {
  title: string;
  description: string;
  published: boolean;
};

function metaFromData(data: Record<string, unknown>): MetaState {
  return {
    title: typeof data.title === "string" ? data.title : "",
    description:
      typeof data.description === "string" ? data.description : "",
    published: data.published !== false,
  };
}

/**
 * The writing-first counterpart to the grid Editor: raw markdown source on
 * the left, the real rendered page (the public /<slug> route, in an iframe)
 * on the right. Saving writes content/docs/<slug>.md through the dev-only
 * doc API and reloads the preview — dev renders on demand, so what the
 * iframe shows after a save is exactly what ships.
 */
export function MarkdownEditor({ slug, initialData, initialBody }: Props) {
  const router = useRouter();
  const [meta, setMeta] = useState<MetaState>(() => metaFromData(initialData));
  const [body, setBody] = useState(initialBody);
  const [saved, setSaved] = useState(() => ({
    meta: metaFromData(initialData),
    body: initialBody,
  }));
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const dirty =
    body !== saved.body ||
    meta.title !== saved.meta.title ||
    meta.description !== saved.meta.description ||
    meta.published !== saved.meta.published;

  // Frontmatter keys beyond the ones this editor edits (Obsidian plugins,
  // future fields) ride along untouched on every save.
  const extraData = useMemo(() => {
    const rest = { ...initialData };
    delete rest.title;
    delete rest.description;
    delete rest.published;
    return rest;
  }, [initialData]);

  const save = useCallback(async () => {
    if (!meta.title.trim()) {
      setStatus("error");
      setErrorMessage("Title is required (frontmatter needs one).");
      return;
    }
    setStatus("saving");
    setErrorMessage(undefined);
    const data: Record<string, unknown> = {
      ...extraData,
      title: meta.title.trim(),
      ...(meta.description.trim()
        ? { description: meta.description.trim() }
        : {}),
      published: meta.published,
    };
    try {
      const res = await fetch("/api/admin/doc", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, data, body }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail?.error ?? detail?.detail ?? `HTTP ${res.status}`);
      }
      setSaved({ meta, body });
      setStatus("saved");
      router.refresh();
      try {
        iframeRef.current?.contentWindow?.location.reload();
      } catch {
        // Cross-origin drift in the preview tab — ignore.
      }
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 1500);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  }, [slug, meta, body, extraData, router]);

  /* ---------------- keyboard + unload guards ---------------- */

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (dirty && status !== "saving") void save();
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dirty, status, save]);

  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function handleLeaveEditor(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    const ok = window.confirm(
      "You have unsaved changes. Leave anyway?\n\n(Save first to keep your edits.)"
    );
    if (!ok) e.preventDefault();
  }

  /* ---------------- preview ---------------- */

  const previewHref = `/${slug.split("/").map(encodeURIComponent).join("/")}`;

  // Same pattern as the grid Toolbar: open the tab synchronously so the
  // popup blocker stays quiet, save, then reload it with fresh content.
  function handlePreview(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    e.preventDefault();
    const tab = window.open(previewHref, "_blank");
    void Promise.resolve(save()).then(() => {
      try {
        tab?.location.reload();
      } catch {
        // Tab navigated cross-origin — ignore.
      }
    });
  }

  const statusLabel = (() => {
    if (status === "saving") return "Saving…";
    if (status === "saved") return "Saved";
    if (status === "error") return errorMessage ?? "Error";
    if (dirty) return "Unsaved changes";
    return "Up to date";
  })();
  const statusClass =
    status === "error"
      ? "text-accent"
      : dirty
        ? "text-foreground"
        : "text-foreground/50";

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 shrink-0 glass-strong border-b border-border flex items-center px-4 gap-4 z-50">
        <Link
          href="/admin"
          onClick={handleLeaveEditor}
          className="kicker hover:text-accent transition-colors"
        >
          ← Pages
        </Link>
        <div className="kicker text-foreground/60 flex items-center gap-2">
          <span>/{slug}</span>
          <span className="px-1.5 py-0.5 rounded-sm bg-surface border border-border text-[10px]">
            markdown
          </span>
        </div>

        <div className="flex-1" />

        <label className="kicker flex items-center gap-2 cursor-pointer select-none text-foreground/70 hover:text-foreground transition-colors">
          <input
            type="checkbox"
            checked={meta.published}
            onChange={(e) =>
              setMeta((m) => ({ ...m, published: e.target.checked }))
            }
            className="accent-accent"
          />
          Published
        </label>

        <span className={cn("kicker", statusClass)}>{statusLabel}</span>

        <Link
          href={previewHref}
          target="_blank"
          onClick={handlePreview}
          className="kicker text-foreground/70 hover:text-accent transition-colors"
          title={dirty ? "Saves first, then opens" : "Open public page"}
        >
          Preview ↗
        </Link>

        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || status === "saving"}
          className={cn(
            "kicker px-4 py-2 rounded-sm transition-all",
            dirty
              ? "bg-accent text-accent-foreground hover:opacity-90"
              : "glass-subtle text-foreground/40 cursor-not-allowed"
          )}
        >
          Save
        </button>
      </header>

      <div className="shrink-0 glass-panel border-b border-border px-4 py-2.5 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="kicker block mb-1">title</span>
          <input
            value={meta.title}
            onChange={(e) =>
              setMeta((m) => ({ ...m, title: e.target.value }))
            }
            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-body text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </label>
        <label className="block">
          <span className="kicker block mb-1">description (optional)</span>
          <input
            value={meta.description}
            onChange={(e) =>
              setMeta((m) => ({ ...m, description: e.target.value }))
            }
            className="w-full bg-background border border-border rounded-sm px-3 py-1.5 font-body text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </label>
      </div>

      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          spellCheck={false}
          aria-label="Markdown source"
          className="h-full w-full resize-none bg-background border-r border-border p-5 font-sans text-sm leading-relaxed focus:outline-none"
        />
        <iframe
          ref={iframeRef}
          src={previewHref}
          title={`Preview of /${slug}`}
          className="hidden lg:block h-full w-full bg-background"
        />
      </div>
    </div>
  );
}
