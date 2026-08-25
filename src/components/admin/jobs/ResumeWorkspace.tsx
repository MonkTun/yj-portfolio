"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import "superdoc/style.css";

/**
 * Resume studio — SuperDoc (Google-Docs-style docx editing, client-side
 * only) over files in content/jobs/resume/. The docx file IS the source of
 * truth; Save exports the edited document and PUTs the binary back.
 */

type SuperDocInstance = {
  export: (params?: {
    exportType?: string[];
    triggerDownload?: boolean;
    exportedName?: string;
  }) => Promise<Blob>;
  destroy: () => void;
};

type Status = "idle" | "loading" | "saving" | "saved" | "error";

function normalizeDocxName(raw: string): string {
  const base = raw
    .toLowerCase()
    .replace(/\.docx$/i, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  return base ? `${base}.docx` : "";
}

export function ResumeWorkspace({ initialFiles }: { initialFiles: string[] }) {
  const [files, setFiles] = useState<string[]>(initialFiles);
  const [active, setActive] = useState<string | null>(initialFiles[0] ?? null);
  const [status, setStatus] = useState<Status>("idle");
  const [dirty, setDirty] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const superdocRef = useRef<SuperDocInstance | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Guards against a stale async mount finishing after a newer one started.
  const mountSeq = useRef(0);

  const destroyEditor = useCallback(() => {
    try {
      superdocRef.current?.destroy();
    } catch {
      // Tearing down a half-initialized editor is best-effort.
    }
    superdocRef.current = null;
    if (editorRef.current) editorRef.current.innerHTML = "";
    if (toolbarRef.current) toolbarRef.current.innerHTML = "";
  }, []);

  const openFile = useCallback(
    async (name: string) => {
      const seq = ++mountSeq.current;
      setStatus("loading");
      setErr(null);
      setDirty(false);
      destroyEditor();
      try {
        const res = await fetch(
          `/api/admin/jobs/resume?file=${encodeURIComponent(name)}`
        );
        if (!res.ok) throw new Error(`Couldn't load ${name} (HTTP ${res.status})`);
        const blob = await res.blob();
        const { SuperDoc } = await import("superdoc");
        if (seq !== mountSeq.current || !editorRef.current) return;
        superdocRef.current = new SuperDoc({
          selector: editorRef.current,
          toolbar: toolbarRef.current ?? undefined,
          document: new File([blob], name.split("/").pop() ?? name, {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
          documentMode: "editing",
          onReady: () => {
            if (seq === mountSeq.current) setStatus("idle");
          },
          onEditorUpdate: () => {
            if (seq === mountSeq.current) setDirty(true);
          },
          onContentError: (payload: { error?: unknown }) => {
            if (seq === mountSeq.current) {
              setStatus("error");
              setErr(`SuperDoc couldn't open this file: ${String(payload?.error ?? "unknown error")}`);
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any) as unknown as SuperDocInstance;
      } catch (e) {
        if (seq === mountSeq.current) {
          setStatus("error");
          setErr(e instanceof Error ? e.message : String(e));
        }
      }
    },
    [destroyEditor]
  );

  // Mount / switch documents — loading a docx into SuperDoc is external-system
  // sync; the setState calls inside are async UI feedback on that load.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) void openFile(active);
    return destroyEditor;
  }, [active, openFile, destroyEditor]);

  const save = useCallback(async () => {
    const superdoc = superdocRef.current;
    if (!superdoc || !active) return;
    setStatus("saving");
    setErr(null);
    try {
      const blob = await superdoc.export({
        exportType: ["docx"],
        triggerDownload: false,
      });
      const res = await fetch(
        `/api/admin/jobs/resume?file=${encodeURIComponent(active)}`,
        { method: "PUT", body: blob }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setDirty(false);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, [active]);

  // ⌘S / Ctrl+S saves; warn before closing with unsaved changes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void save();
      }
    }
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) e.preventDefault();
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [save, dirty]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const name = normalizeDocxName(file.name);
    if (!name) {
      setErr("Couldn't derive a valid file name from that upload.");
      return;
    }
    if (
      files.includes(name) &&
      !window.confirm(`${name} already exists — overwrite it?`)
    ) {
      return;
    }
    setErr(null);
    try {
      const res = await fetch(
        `/api/admin/jobs/resume?file=${encodeURIComponent(name)}&create=1`,
        { method: "PUT", body: file }
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setFiles((prev) => (prev.includes(name) ? prev : [...prev, name].sort()));
      setActive(name);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function onDeleteFile(name: string) {
    if (!window.confirm(`Delete ${name}? This can't be undone.`)) return;
    try {
      const res = await fetch("/api/admin/jobs/resume", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
      setFiles((prev) => prev.filter((f) => f !== name));
      if (active === name) setActive(null);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }

  const statusLabel = (() => {
    switch (status) {
      case "loading":
        return "Opening…";
      case "saving":
        return "Saving…";
      case "saved":
        return dirty ? "Unsaved changes" : "Saved";
      case "error":
        return "Error";
      default:
        return dirty ? "Unsaved changes" : active ? "Ready" : "";
    }
  })();

  return (
    // admin-light: paper tokens so the chrome matches SuperDoc's white page
    // (see globals.css).
    <div className="admin-light h-screen flex flex-col bg-background text-foreground">
      {/* top chrome — mirrors the editor toolbar pattern */}
      <header className="h-14 shrink-0 glass-strong border-b border-border flex items-center px-4 gap-4 z-50">
        <Link
          href="/admin/jobs"
          className="kicker text-foreground/60 hover:text-foreground transition-colors"
        >
          ← Jobs
        </Link>
        <span className="kicker text-foreground/40">
          {active ?? "Resume studio"}
        </span>
        <div className="flex-1" />
        <span className="kicker text-foreground/40">{statusLabel}</span>
        {active && (
          <a
            href={`/api/admin/jobs/resume?file=${encodeURIComponent(active)}`}
            download
            className="kicker px-3 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
          >
            Download
          </a>
        )}
        <button
          type="button"
          onClick={() => void save()}
          disabled={!dirty || status === "saving" || !active}
          className={
            dirty && active
              ? "kicker px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
              : "kicker px-4 py-2 rounded-sm glass-subtle text-foreground/40 cursor-not-allowed"
          }
        >
          Save
        </button>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* file rail */}
        <aside className="w-64 shrink-0 border-r border-border overflow-y-auto px-4 py-6 space-y-6">
          <div>
            <p className="kicker">Documents</p>
            <ul className="mt-3 space-y-0.5">
              {files.map((f) => (
                <li key={f} className="group flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActive(f)}
                    className={cn(
                      "flex-1 text-left px-2 py-1.5 rounded-sm font-sans text-sm truncate transition-colors",
                      active === f
                        ? "bg-surface text-foreground"
                        : "text-foreground/60 hover:text-foreground hover:bg-surface/60"
                    )}
                  >
                    {f}
                  </button>
                  <button
                    type="button"
                    onClick={() => void onDeleteFile(f)}
                    aria-label={`Delete ${f}`}
                    className="kicker text-foreground/0 group-hover:text-foreground/40 hover:text-accent! transition-colors"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            {files.length === 0 && (
              <p className="mt-3 text-xs italic text-foreground/40">
                No documents yet — upload your resume (.docx) below. From
                Google Docs: File → Download → Microsoft Word.
              </p>
            )}
          </div>

          <div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="kicker w-full px-3 py-2.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
            >
              Upload .docx
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => void onUpload(e)}
              className="hidden"
            />
          </div>

          {err && (
            <p className="text-xs italic text-foreground/70">Error: {err}</p>
          )}
        </aside>

        {/* editor surface */}
        <main className="flex-1 min-w-0 flex flex-col">
          <div
            ref={toolbarRef}
            className="shrink-0 glass-panel border-b border-border"
          />
          <div className="resume-studio flex-1 overflow-auto">
            {active ? (
              <div ref={editorRef} className="min-h-full" />
            ) : (
              <div className="h-full flex items-center justify-center">
                <p className="text-foreground/40 italic font-body">
                  Select or upload a document to start editing.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
