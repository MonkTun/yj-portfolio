"use client";

import { useEffect, useRef, useState } from "react";
import type { Application } from "@/lib/jobs/schema";
import { tailorStream, type TailorResult } from "./api";
import { ScoreBadge } from "./ScoreBadge";

/** Progress % per pipeline stage — the model stage crawls with tokens. */
const STAGE_PCT: Record<string, number> = {
  score: 10,
  gap: 20,
  model: 30,
  retry: 45,
  check: 75,
  enforce: 85,
  apply: 90,
};

/**
 * Full-screen overlay that runs the tailor pipeline once on mount and shows
 * a stage progress bar plus Claude's live output (its tailoring plan streams
 * in token-by-token; the JSON edit list itself is hidden once the fence
 * starts).
 */
export function TailorOverlay({
  appId,
  onDone,
  onClose,
}: {
  appId: string;
  onDone: (app: Application) => void;
  onClose: () => void;
}) {
  const [stages, setStages] = useState<{ stage: string; label: string }[]>([]);
  const [thoughts, setThoughts] = useState("");
  const [result, setResult] = useState<TailorResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pct, setPct] = useState(4);
  const thoughtsRef = useRef<HTMLDivElement>(null);
  const started = useRef(false);

  // Run once on mount — the stream drives all state (external-system sync).
  useEffect(() => {
    if (started.current) return; // Strict-mode double-mount guard.
    started.current = true;
    tailorStream(appId, (ev) => {
      if (ev.type === "stage") {
        setStages((s) => [...s, { stage: ev.stage, label: ev.label }]);
        setPct((p) => Math.max(p, STAGE_PCT[ev.stage] ?? p));
        if (ev.stage === "retry") setThoughts("");
      } else if (ev.type === "thought") {
        setThoughts((t) => t + ev.text);
        // Crawl the bar through the model stage as tokens arrive.
        setPct((p) => (p >= 30 && p < 72 ? Math.min(72, p + 0.4) : p));
      } else if (ev.type === "result") {
        setPct(100);
        setResult(ev);
        onDone(ev.application);
      } else if (ev.type === "error") {
        setError(ev.detail ? `${ev.error} — ${ev.detail}` : ev.error);
      }
    }).catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId]);

  // Keep the live plan scrolled to the newest tokens.
  useEffect(() => {
    thoughtsRef.current?.scrollTo({ top: thoughtsRef.current.scrollHeight });
  }, [thoughts]);

  // The model's plan is the prose before the ```json fence — hide the JSON.
  const visibleThoughts = thoughts.split("```")[0].trimStart();
  const running = !result && !error;
  const currentLabel = stages[stages.length - 1]?.label ?? "Starting…";

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-background/70 p-6">
      <div className="w-full max-w-lg glass-strong border border-border rounded-sm p-6 space-y-4">
        <div className="flex items-center gap-3">
          <p className="kicker flex-1">✦ Tailoring resume</p>
          {result && <ScoreBadge score={result.after} />}
          {!running && (
            <button
              type="button"
              onClick={onClose}
              className="kicker text-foreground/50 hover:text-foreground transition-colors"
            >
              Close
            </button>
          )}
        </div>

        {/* progress bar */}
        <div>
          <div className="h-1 rounded-full bg-border overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-[var(--duration)] ease-[var(--ease)]"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="kicker text-foreground/50 mt-2 normal-case tracking-normal">
            {error ? "Failed" : result ? "Done" : currentLabel}
          </p>
        </div>

        {/* live model plan */}
        {visibleThoughts && (
          <div
            ref={thoughtsRef}
            className="max-h-48 overflow-y-auto border border-border rounded-sm bg-surface/40 px-3 py-2.5"
          >
            <p className="text-sm font-body text-foreground/80 whitespace-pre-wrap leading-relaxed">
              {visibleThoughts}
              {running && <span className="text-accent">▍</span>}
            </p>
          </div>
        )}

        {/* stage log */}
        <ul className="space-y-1">
          {stages.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-xs font-sans">
              <span
                className={
                  i === stages.length - 1 && running
                    ? "text-accent"
                    : "text-foreground/30"
                }
              >
                {i === stages.length - 1 && running ? "◌" : "●"}
              </span>
              <span className="text-foreground/60">{s.label}</span>
            </li>
          ))}
        </ul>

        {result && (
          <div className="border-t border-border pt-4 space-y-3">
            <p className="text-sm font-body text-foreground/80">
              {result.edits} edits from <em>{result.variant}</em> — score{" "}
              {result.before} → {result.after}, {result.words} words, ~
              {result.lines} lines (source {result.sourceLines} — one page).
            </p>
            {result.report.missing.length > 0 && (
              <p className="text-xs font-sans text-foreground/50">
                Still missing: {result.report.missing.join(", ")}
              </p>
            )}
            <a
              href={`/admin/jobs/resume?file=${encodeURIComponent(
                result.file
              )}&app=${encodeURIComponent(appId)}`}
              className="kicker inline-block px-4 py-2.5 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
            >
              Open in studio →
            </a>
          </div>
        )}

        {error && (
          <p className="text-xs italic text-foreground/70 border-t border-border pt-4">
            Error: {error}
          </p>
        )}
      </div>
    </div>
  );
}
