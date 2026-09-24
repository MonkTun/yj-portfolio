import type { HLJSApi, LanguageFn } from "highlight.js";

import type { CodeLanguage } from "@/lib/schema";

/** Display names for the Code block's language picker and header. */
export const CODE_LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  plaintext: "Plain text",
  cpp: "C++",
  c: "C",
  csharp: "C#",
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  glsl: "GLSL",
  lua: "Lua",
  rust: "Rust",
  go: "Go",
  java: "Java",
  swift: "Swift",
  json: "JSON",
  yaml: "YAML",
  bash: "Shell",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
};

/* Literal import paths (not a template string) so the bundler emits one
   small chunk per grammar and a page only fetches the ones it shows. */
const GRAMMARS: Record<
  Exclude<CodeLanguage, "plaintext">,
  () => Promise<{ default: LanguageFn }>
> = {
  cpp: () => import("highlight.js/lib/languages/cpp"),
  c: () => import("highlight.js/lib/languages/c"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  javascript: () => import("highlight.js/lib/languages/javascript"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  python: () => import("highlight.js/lib/languages/python"),
  glsl: () => import("highlight.js/lib/languages/glsl"),
  lua: () => import("highlight.js/lib/languages/lua"),
  rust: () => import("highlight.js/lib/languages/rust"),
  go: () => import("highlight.js/lib/languages/go"),
  java: () => import("highlight.js/lib/languages/java"),
  swift: () => import("highlight.js/lib/languages/swift"),
  json: () => import("highlight.js/lib/languages/json"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  bash: () => import("highlight.js/lib/languages/bash"),
  html: () => import("highlight.js/lib/languages/xml"),
  css: () => import("highlight.js/lib/languages/css"),
  sql: () => import("highlight.js/lib/languages/sql"),
};

let core: Promise<HLJSApi> | null = null;

/**
 * Highlighted HTML for `code` — highlight.js spans (`hljs-keyword`, …)
 * themed from tokens by `.code-listing` in globals.css. Loaded on demand
 * like pdf.js: the atom registry ships on every page, the highlighter
 * shouldn't. The output escapes the source, so it's safe to set as HTML.
 * Resolves null for plain text.
 */
export async function highlightCode(
  code: string,
  language: CodeLanguage,
): Promise<string | null> {
  if (language === "plaintext") return null;
  core ??= import("highlight.js/lib/core").then((m) => m.default);
  const hljs = await core;
  if (!hljs.getLanguage(language)) {
    const grammar = await GRAMMARS[language]();
    hljs.registerLanguage(language, grammar.default);
  }
  return hljs.highlight(code, { language, ignoreIllegals: true }).value;
}
