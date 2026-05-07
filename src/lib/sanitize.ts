/**
 * Tiny HTML sanitizer for the editor's rich-text fields. We only allow a
 * very small whitelist of inline tags. Anything else is stripped (its text
 * children are preserved, the tag itself is dropped). Browser-only path uses
 * DOMParser which is robust against malformed HTML; server falls back to a
 * permissive regex pass since pageSchema validation already happened
 * upstream.
 */

const ALLOWED = new Set(["strong", "em", "br"]);

export function sanitizeRichText(html: string): string {
  if (typeof document === "undefined") {
    // Server-side: light pass — strip script/style and event handlers.
    return html
      .replace(/<\/?(script|style|iframe|object|embed)[^>]*>/gi, "")
      .replace(/\son[a-z]+="[^"]*"/gi, "")
      .replace(/\son[a-z]+='[^']*'/gi, "");
  }
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  return walk(wrap).replace(/(<br>\s*)+$/g, "");
}

function walk(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return escape(node.textContent ?? "");
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  const raw = el.tagName.toLowerCase();
  // Normalize the deprecated tags execCommand still produces.
  const tag = raw === "b" ? "strong" : raw === "i" ? "em" : raw;
  const inner = Array.from(el.childNodes).map(walk).join("");

  if (tag === "br") return "<br>";
  if (ALLOWED.has(tag)) return `<${tag}>${inner}</${tag}>`;
  // Block-ish wrappers contentEditable creates on Enter — convert to a
  // line break so multiline content survives the round-trip.
  if (tag === "div" || tag === "p") return inner + "<br>";
  // Anything else: drop the tag, keep its content.
  return inner;
}

function escape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
