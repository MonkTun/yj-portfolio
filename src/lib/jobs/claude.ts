import { spawn } from "node:child_process";

/**
 * Shared headless `claude` CLI runner for the job tracker (tailor + studio
 * chat). Subscription-billed — NEVER wire an API key. Runs with
 * --output-format stream-json --include-partial-messages so callers can
 * surface the model's output token-by-token (progress / thought process),
 * and supports --resume for multi-turn studio chat sessions.
 */

export type ClaudeStreamEvent =
  | { type: "delta"; text: string }
  | { type: "thinking"; text: string };

export type ClaudeRunResult = {
  /** Final assistant text (the full reply). */
  result: string;
  /** Session id — pass back as `resume` to continue the conversation. */
  sessionId: string;
};

export function streamClaude(params: {
  prompt: string;
  cwd: string;
  /** Session id from a previous run to continue that conversation. */
  resume?: string;
  systemPrompt?: string;
  timeoutMs?: number;
  onEvent?: (ev: ClaudeStreamEvent) => void;
}): Promise<ClaudeRunResult> {
  const { prompt, cwd, resume, systemPrompt, timeoutMs = 280_000, onEvent } = params;
  return new Promise((resolve, reject) => {
    const args = [
      "-p",
      "--output-format",
      "stream-json",
      "--verbose",
      "--include-partial-messages",
    ];
    if (resume) args.push("--resume", resume);
    if (systemPrompt) args.push("--append-system-prompt", systemPrompt);

    const child = spawn("claude", args, { cwd });
    const killTimer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`claude CLI timed out after ${timeoutMs / 1000}s`));
    }, timeoutMs);

    let sessionId = "";
    let result = "";
    let sawResult = false;
    let stderrTail = "";
    let lineBuf = "";

    child.stdout.on("data", (chunk: Buffer) => {
      lineBuf += chunk.toString("utf8");
      let nl: number;
      while ((nl = lineBuf.indexOf("\n")) !== -1) {
        const line = lineBuf.slice(0, nl).trim();
        lineBuf = lineBuf.slice(nl + 1);
        if (!line) continue;
        let ev: {
          type?: string;
          subtype?: string;
          session_id?: string;
          result?: string;
          is_error?: boolean;
          event?: {
            type?: string;
            delta?: { type?: string; text?: string; thinking?: string };
          };
        };
        try {
          ev = JSON.parse(line);
        } catch {
          continue; // Non-JSON noise on stdout — skip.
        }
        if (ev.session_id) sessionId = ev.session_id;
        if (ev.type === "stream_event") {
          const delta = ev.event?.delta;
          if (delta?.type === "text_delta" && delta.text) {
            onEvent?.({ type: "delta", text: delta.text });
          } else if (delta?.type === "thinking_delta" && delta.thinking) {
            onEvent?.({ type: "thinking", text: delta.thinking });
          }
        } else if (ev.type === "result") {
          sawResult = true;
          if (ev.is_error) {
            clearTimeout(killTimer);
            reject(new Error(`claude returned an error: ${String(ev.result).slice(0, 2000)}`));
            return;
          }
          result = typeof ev.result === "string" ? ev.result : "";
        }
      }
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderrTail = (stderrTail + chunk.toString("utf8")).slice(-2000);
    });

    child.on("error", (err) => {
      clearTimeout(killTimer);
      reject(new Error(`Couldn't spawn claude CLI: ${err.message}`));
    });

    child.on("close", (code) => {
      clearTimeout(killTimer);
      if (sawResult) resolve({ result, sessionId });
      else {
        reject(
          new Error(
            `claude CLI exited (code ${code}) without a result.\n${stderrTail}`
          )
        );
      }
    });

    child.stdin.write(prompt);
    child.stdin.end();
  });
}

/** Count words the way the one-page budget counts them. */
export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
