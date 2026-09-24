"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const slugRegex = /^[a-z0-9][a-z0-9-/]*$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9/-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\/+/g, "/");
}

/** Today as YYYY-MM-DD in local time — the date format the post list uses. */
function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

type Kind = "page" | "post";

const inputClass =
  "w-full bg-background border border-border rounded-sm px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors";

export function NewPageForm({ existing }: { existing: string[] }) {
  const router = useRouter();
  const [kind, setKind] = useState<Kind>("page");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [summary, setSummary] = useState("");
  // A post's slug follows its title until it's typed over.
  const [slugTouched, setSlugTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isPost = kind === "post";
  const leaf = slugify(isPost && !slugTouched ? title : slug);
  const cleanSlug = isPost ? (leaf ? `blog/${leaf}` : "") : leaf;
  const collides = cleanSlug.length > 0 && existing.includes(cleanSlug);
  const slugInvalid = cleanSlug.length > 0 && !slugRegex.test(cleanSlug);
  const submittable =
    cleanSlug.length > 0 &&
    !collides &&
    !slugInvalid &&
    !busy &&
    (!isPost || title.trim().length > 0);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submittable) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: cleanSlug,
          title: title.trim() || cleanSlug,
          ...(isPost
            ? { post: { date: date.trim() || today(), summary: summary.trim() } }
            : {}),
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      router.push(`/admin/edit/${cleanSlug}`);
    } catch (e) {
      setBusy(false);
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mt-12 border border-border rounded-sm p-5 space-y-4 bg-surface/40"
    >
      <div className="flex items-center justify-between gap-4">
        <p className="kicker">New {isPost ? "blog post" : "page"}</p>
        <div className="flex gap-1" role="radiogroup" aria-label="Kind">
          {(["page", "post"] as const).map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={kind === k}
              onClick={() => {
                // The slug field means a full slug for a page but only the
                // part after blog/ for a post — start it fresh either way.
                setKind(k);
                setSlug("");
                setSlugTouched(false);
              }}
              className={`kicker px-2.5 py-1 rounded-sm transition-colors ${
                kind === k
                  ? "bg-accent text-accent-foreground"
                  : "text-foreground/50 hover:text-accent"
              }`}
            >
              {k === "page" ? "Page" : "Blog post"}
            </button>
          ))}
        </div>
      </div>

      {isPost ? (
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_10rem] gap-3">
          <label className="block">
            <span className="kicker block mb-1.5">title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Crashball #2"
              className={`${inputClass} font-body`}
            />
          </label>
          <label className="block">
            <span className="kicker block mb-1.5">date</span>
            <input
              value={date}
              onChange={(e) => setDate(e.target.value)}
              placeholder="2026-09-23"
              className={`${inputClass} font-sans [font-feature-settings:'tnum']`}
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="kicker block mb-1.5">summary (optional)</span>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="One line for the blog list and the standfirst."
              className={`${inputClass} font-body`}
            />
          </label>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <label className={`block ${isPost ? "sm:col-span-2" : ""}`}>
          <span className="kicker block mb-1.5">slug</span>
          <div className="flex items-center">
            {isPost && (
              <span className="px-3 py-2 border border-r-0 border-border rounded-l-sm text-sm font-sans text-foreground/50">
                blog/
              </span>
            )}
            <input
              value={isPost && !slugTouched ? leaf : slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSlugTouched(true);
              }}
              placeholder={
                isPost ? "crashball-2" : "about, work/dawngeon, contact"
              }
              className={`${inputClass} font-sans ${isPost ? "rounded-l-none" : ""}`}
            />
          </div>
          {cleanSlug && (
            <span className="block mt-1 text-xs text-foreground/60 font-sans">
              /{cleanSlug}
            </span>
          )}
        </label>
        {!isPost && (
          <label className="block">
            <span className="kicker block mb-1.5">title (optional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="About — Youngje Park"
              className={`${inputClass} font-body`}
            />
          </label>
        )}
        <button
          type="submit"
          disabled={!submittable}
          className="kicker px-4 py-2.5 rounded-sm bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Creating…" : isPost ? "Create post" : "Create page"}
        </button>
      </div>
      {isPost && (
        <p className="text-xs italic text-foreground/60">
          Sets up the post header, a body section, the outro (post list +
          back to the blog) and the footer, and adds the post to the top of
          the blog list.
        </p>
      )}
      {collides && (
        <p className="text-xs italic text-foreground/70">
          A page with that slug already exists.
        </p>
      )}
      {slugInvalid && (
        <p className="text-xs italic text-foreground/70">
          Slug must start with a letter or digit and use only{" "}
          <code className="font-sans">a–z 0–9 - /</code>.
        </p>
      )}
      {err && (
        <p className="text-xs italic text-foreground/70">Error: {err}</p>
      )}
    </form>
  );
}
