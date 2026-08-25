"use client";

import { useEffect, useRef, useState } from "react";
import { applyResumeEdits, chatStream, type ParagraphEditInput } from "./api";

type Message =
  | { role: "user"; text: string }
  | { role: "note"; text: string }
  | { role: "assistant"; text: string; streaming?: boolean };

/** Pull a {"edits":[...]} list out of an assistant reply's fenced block. */
function parseEdits(text: string): ParagraphEditInput[] | null {
  const fence = text.match(/```(?:edits|json)\s*([\s\S]*?)```/);
  if (!fence) return null;
  try {
    const parsed = JSON.parse(fence[1]) as { edits?: unknown };
    if (!Array.isArray(parsed.edits) || parsed.edits.length === 0) return null;
    const edits: ParagraphEditInput[] = [];
    for (const e of parsed.edits) {
      const cand = e as { paragraph?: unknown; text?: unknown };
      if (typeof cand.paragraph !== "number" || typeof cand.text !== "string") {
        return null;
      }
      edits.push({ paragraph: cand.paragraph, text: cand.text });
    }
    return edits;
  } catch {
    return null;
  }
}

/** Fence stripped for display — the Apply card stands in for the JSON. */
function displayText(text: string): string {
  return text.replace(/```(?:edits|json)\s*[\s\S]*?(```|$)/, "").trim();
}

/**
 * Studio chat (headless `claude -p --resume` under the hood). The server
 * re-reads the open docx every turn, so "tighten paragraph 12" style asks
 * always see the current document; proposed edit lists render as an Apply
 * card that patches the file on disk and reloads the editor.
 */
export function ChatPanel({
  file,
  appId,
  dirty,
  onApplied,
}: {
  file: string;
  appId?: string;
  dirty: boolean;
  onApplied: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>();
  const [streaming, setStreaming] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function send() {
    const message = input.trim();
    if (!message || streaming) return;
    setInput("");
    setErr(null);
    setStreaming(true);
    setMessages((m) => [
      ...m,
      { role: "user", text: message },
      { role: "assistant", text: "", streaming: true },
    ]);
    const patchLast = (fn: (prev: string) => string, done = false) =>
      setMessages((m) => {
        const next = [...m];
        const last = next[next.length - 1];
        if (last?.role === "assistant") {
          next[next.length - 1] = {
            role: "assistant",
            text: fn(last.text),
            streaming: !done,
          };
        }
        return next;
      });
    try {
      await chatStream({ message, file, appId, sessionId }, (ev) => {
        if (ev.type === "delta") patchLast((prev) => prev + ev.text);
        else if (ev.type === "done") {
          setSessionId(ev.sessionId);
          patchLast(() => ev.result, true);
        } else if (ev.type === "error") {
          setErr(ev.error);
          patchLast((prev) => prev, true);
        }
      });
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      patchLast((prev) => prev, true);
    } finally {
      setStreaming(false);
    }
  }

  async function apply(edits: ParagraphEditInput[]) {
    setApplying(true);
    setErr(null);
    try {
      const res = await applyResumeEdits(file, edits);
      setMessages((m) => [
        ...m,
        {
          role: "note",
          text: `Applied ${res.applied} edits — document reloaded (${res.words} words).`,
        },
      ]);
      onApplied();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <p className="text-xs italic text-foreground/40 leading-relaxed">
            Chat about {file}
            {appId ? " and its target JD" : ""} — ask for rewrites, cuts, or a
            critique. Proposed edits arrive as an Apply card that patches the
            document directly.
          </p>
        )}
        {messages.map((msg, i) => {
          if (msg.role === "note") {
            return (
              <p key={i} className="kicker text-accent text-center">
                {msg.text}
              </p>
            );
          }
          if (msg.role === "user") {
            return (
              <div key={i} className="ml-8">
                <p className="text-sm font-sans bg-surface border border-border rounded-sm px-3 py-2 text-foreground/90 whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>
            );
          }
          const edits = msg.streaming ? null : parseEdits(msg.text);
          const text = msg.streaming
            ? msg.text.split("```")[0]
            : displayText(msg.text);
          return (
            <div key={i} className="mr-4 space-y-2">
              {(text || msg.streaming) && (
                <p className="text-sm font-body text-foreground/85 whitespace-pre-wrap leading-relaxed">
                  {text}
                  {msg.streaming && <span className="text-accent">▍</span>}
                </p>
              )}
              {edits && (
                <div className="border border-accent/40 rounded-sm px-3 py-2.5 bg-surface/40 space-y-2">
                  <p className="kicker">
                    {edits.length} proposed {edits.length === 1 ? "edit" : "edits"}
                  </p>
                  <ul className="space-y-1 max-h-40 overflow-y-auto">
                    {edits.map((e, j) => (
                      <li key={j} className="text-xs font-sans text-foreground/70">
                        <span className="text-foreground/40">[{e.paragraph}]</span>{" "}
                        {e.text === "" ? (
                          <em className="text-accent">delete paragraph</em>
                        ) : (
                          e.text
                        )}
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => void apply(edits)}
                    disabled={applying || dirty}
                    title={dirty ? "Save the document first" : undefined}
                    className="kicker px-3 py-1.5 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
                  >
                    {applying ? "Applying…" : dirty ? "Save doc first" : "Apply to document"}
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {err && <p className="text-xs italic text-foreground/70">Error: {err}</p>}
      </div>

      <div className="shrink-0 border-t border-border p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder="Tighten the Overdawn bullets… (Enter to send)"
          className="flex-1 bg-background border border-border rounded-sm px-3 py-2 font-sans text-sm resize-none focus:outline-none focus:border-accent transition-colors"
        />
        <button
          type="button"
          onClick={() => void send()}
          disabled={!input.trim() || streaming}
          className="kicker px-3 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          {streaming ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
}
