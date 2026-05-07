"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeletePageButton({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onDelete() {
    if (busy) return;
    const ok = window.confirm(
      `Delete /${slug}?\n\nThis removes content/pages/${slug}.json and can't be undone from the UI.`
    );
    if (!ok) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/page", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      router.refresh();
    } catch (e) {
      window.alert(`Couldn't delete: ${e instanceof Error ? e.message : e}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void onDelete();
      }}
      disabled={busy}
      title={`Delete /${slug}`}
      className="kicker text-foreground/40 hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      {busy ? "…" : "Delete"}
    </button>
  );
}
