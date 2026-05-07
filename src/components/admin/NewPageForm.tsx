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

export function NewPageForm({ existing }: { existing: string[] }) {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cleanSlug = slugify(slug);
  const collides = cleanSlug.length > 0 && existing.includes(cleanSlug);
  const slugInvalid = cleanSlug.length > 0 && !slugRegex.test(cleanSlug);
  const submittable =
    cleanSlug.length > 0 && !collides && !slugInvalid && !busy;

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
      <p className="kicker">New page</p>
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-3 items-end">
        <label className="block">
          <span className="kicker block mb-1.5">slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="about, work/dawngeon, contact"
            className="w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent transition-colors"
          />
          {cleanSlug && (
            <span className="block mt-1 text-xs text-foreground/60 font-mono">
              /{cleanSlug}
            </span>
          )}
        </label>
        <label className="block">
          <span className="kicker block mb-1.5">title (optional)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="About — Youngje Park"
            className="w-full bg-background border border-border rounded-sm px-3 py-2 font-body text-sm focus:outline-none focus:border-accent transition-colors"
          />
        </label>
        <button
          type="submit"
          disabled={!submittable}
          className="kicker px-4 py-2.5 rounded-sm bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Creating…" : "Create page"}
        </button>
      </div>
      {collides && (
        <p className="text-xs italic text-foreground/70">
          A page with that slug already exists.
        </p>
      )}
      {slugInvalid && (
        <p className="text-xs italic text-foreground/70">
          Slug must start with a letter or digit and use only{" "}
          <code className="font-mono">a–z 0–9 - /</code>.
        </p>
      )}
      {err && (
        <p className="text-xs italic text-foreground/70">Error: {err}</p>
      )}
    </form>
  );
}
