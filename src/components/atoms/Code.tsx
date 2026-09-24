"use client";

import { useEffect, useState } from "react";

import type { CodeLanguage, CodeProps } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useEdit } from "@/components/EditContext";
import { CODE_LANGUAGE_LABELS, highlightCode } from "@/lib/code-languages";
import { ExpandIcon, Overlay, OverlayAction } from "./Overlay";

/**
 * Code atom. The block is a framed, syntax-highlighted excerpt: a header
 * bar (file name + language) over the listing at the block's `fontSize`,
 * clipped to the block with the overflow fading out at the bottom. On the
 * public site a click opens the whole listing in a full-screen viewer with
 * a copy button; in the editor clicks select the block.
 *
 * Highlighting is loaded on demand (lib/code-languages.ts), so the first
 * paint is the plain listing and the colors land a beat later.
 */
export function Code({
  code,
  language,
  filename,
  lineNumbers,
  fontSize,
  radius,
}: CodeProps) {
  const editing = useEdit() !== null;
  const [open, setOpen] = useState(false);
  // A trailing newline would add a numbered but empty last line.
  const source = code.replace(/\n+$/, "");
  const html = useHighlighted(source, language);
  const label = CODE_LANGUAGE_LABELS[language];
  const name = filename || label;

  return (
    <>
      <div
        className={cn(
          "viewer-frame group relative flex h-full w-full flex-col overflow-clip",
          radius === 0 && "rounded-sm",
        )}
        style={{ borderRadius: radius ? `${radius}px` : undefined }}
      >
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-3 py-2">
          <span className="min-w-0 flex-1 truncate font-code text-xs text-foreground/80">
            {name}
          </span>
          {filename && <span className="kicker shrink-0">{label}</span>}
          <ExpandIcon className="shrink-0 text-muted-foreground transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] group-hover:text-accent" />
        </div>
        {/* clip, not hidden: a hidden box can still be scrolled (find-in-
            page, scrollIntoView), which would slide the listing under the
            sticky gutter. */}
        <div className="fade-bottom min-h-0 flex-1 overflow-clip p-3">
          <CodeListing
            code={source}
            html={html}
            lineNumbers={lineNumbers}
            style={{ fontSize }}
          />
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label={`Open code: ${name}`}
            className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
          />
        )}
      </div>

      {open && (
        <CodeViewer
          code={source}
          html={html}
          name={name}
          label={filename ? label : null}
          lineNumbers={lineNumbers}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/** Highlighted HTML for the current code, or null until it's ready (and
 *  for plain text) — render the raw source meanwhile. */
function useHighlighted(code: string, language: CodeLanguage) {
  const key = `${language}\n${code}`;
  const [result, setResult] = useState<{ key: string; html: string | null }>();

  useEffect(() => {
    let cancelled = false;
    highlightCode(code, language).then(
      (html) => {
        if (!cancelled) setResult({ key, html });
      },
      (err: unknown) => console.warn("[code] highlight failed:", err),
    );
    return () => {
      cancelled = true;
    };
  }, [code, language, key]);

  return result?.key === key ? result.html : null;
}

/** Gutter + listing. The gutter is one pre-formatted column of numbers at
 *  the same leading as the code, so rows line up without per-line markup
 *  (highlight.js spans can cross lines). */
function CodeListing({
  code,
  html,
  lineNumbers,
  className,
  style,
}: {
  code: string;
  html: string | null;
  lineNumbers: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const lines = code.split("\n").length;
  return (
    <div className={cn("code-listing flex min-w-fit", className)} style={style}>
      {lineNumbers && (
        <div
          aria-hidden
          className="code-gutter sticky left-0 shrink-0 select-none whitespace-pre pr-4 text-right tabular-nums"
        >
          {Array.from({ length: lines }, (_, i) => i + 1).join("\n")}
        </div>
      )}
      <pre className="m-0 flex-1 whitespace-pre">
        {html !== null ? (
          <code dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <code>{code}</code>
        )}
      </pre>
    </div>
  );
}

function CodeViewer({
  code,
  html,
  name,
  label,
  lineNumbers,
  onClose,
}: {
  code: string;
  html: string | null;
  name: string;
  /** Language name, shown beside a file name (null when `name` is it). */
  label: string | null;
  lineNumbers: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const lines = code.split("\n").length;

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(false), 1600);
    return () => clearTimeout(t);
  }, [copied]);

  return (
    <Overlay
      label={`Code: ${name}`}
      onClose={onClose}
      title={
        <p className="kicker truncate">
          <span className="font-code normal-case tracking-normal text-foreground">
            {name}
          </span>
          <span className="ml-3 tabular-nums">
            {label && `${label} · `}
            {lines} {lines === 1 ? "line" : "lines"}
          </span>
        </p>
      }
      actions={
        <OverlayAction
          onClick={() => {
            navigator.clipboard.writeText(code).then(
              () => setCopied(true),
              (err: unknown) => console.warn("[code] copy failed:", err),
            );
          }}
          className="w-16 justify-center"
        >
          {copied ? "Copied" : "Copy"}
        </OverlayAction>
      }
    >
      {/* Click-through around the panel, so the margin is backdrop. */}
      <div className="absolute inset-0 flex items-center justify-center p-3 md:p-8">
        <div className="viewer-frame pointer-events-auto max-h-full w-full max-w-5xl overflow-auto overscroll-contain rounded-sm">
          <CodeListing
            code={code}
            html={html}
            lineNumbers={lineNumbers}
            className="p-4 text-[12.5px] md:p-6 md:text-sm"
          />
        </div>
      </div>
    </Overlay>
  );
}
