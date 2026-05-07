"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SiteConfig } from "@/lib/schema";

type Props = {
  initialConfig: SiteConfig;
  pages: string[];
};

const ROLE_LABELS: Record<keyof Omit<SiteConfig, "constructionMode">, string> = {
  homeSlug: "Home",
  constructionSlug: "Construction",
  notFoundSlug: "404",
};

const ROLE_HINTS: Record<keyof Omit<SiteConfig, "constructionMode">, string> = {
  homeSlug: "Renders at / when construction mode is off.",
  constructionSlug: "Renders at / when construction mode is on.",
  notFoundSlug: "Served for unknown URLs (Next.js not-found route).",
};

export function RoutingPanel({ initialConfig, pages }: Props) {
  const router = useRouter();
  const [config, setConfig] = useState<SiteConfig>(initialConfig);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // The server merges patches with the current config, so we only send the
  // changed field. This keeps optimistic UI honest if two fields race.
  function patch(next: Partial<SiteConfig>) {
    const optimistic = { ...config, ...next };
    setConfig(optimistic);
    setError(null);
    fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
        // Trust server's validated config (defaults filled in, etc.)
        if (body?.config) setConfig(body.config);
        startTransition(() => router.refresh());
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : String(e));
        setConfig(config); // rollback
      });
  }

  return (
    <section className="border border-border rounded-sm p-5 bg-surface/40 space-y-5">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <p className="kicker">Routing</p>
          <p className="text-foreground/60 italic text-sm mt-1">
            Decides which page renders at <code className="font-mono">/</code>{" "}
            and what shows up for unknown URLs.
          </p>
        </div>
        {pending && <span className="kicker text-foreground/40">Saving…</span>}
      </header>

      <div className="flex items-center gap-3">
        <ConstructionToggle
          on={config.constructionMode}
          onChange={(on) => patch({ constructionMode: on })}
        />
        <p className="text-sm text-foreground/70">
          Construction mode —{" "}
          {config.constructionMode ? (
            <span className="text-foreground">
              <code className="font-mono">/</code> shows{" "}
              <code className="font-mono">{config.constructionSlug}</code>
            </span>
          ) : (
            <span className="text-foreground">
              <code className="font-mono">/</code> shows{" "}
              <code className="font-mono">{config.homeSlug}</code>
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(ROLE_LABELS) as Array<keyof typeof ROLE_LABELS>).map(
          (role) => (
            <RoleAssignment
              key={role}
              label={ROLE_LABELS[role]}
              hint={ROLE_HINTS[role]}
              value={config[role] as string}
              pages={pages}
              onChange={(slug) => patch({ [role]: slug } as Partial<SiteConfig>)}
            />
          )
        )}
      </div>

      {error && (
        <p className="text-sm italic text-accent">Couldn&apos;t save: {error}</p>
      )}
    </section>
  );
}

function ConstructionToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative h-6 w-11 rounded-full transition-colors border ${
        on
          ? "bg-accent border-accent"
          : "bg-background border-border"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full transition-transform ${
          on
            ? "translate-x-5 bg-accent-foreground"
            : "translate-x-0 bg-foreground/70"
        }`}
      />
    </button>
  );
}

function RoleAssignment({
  label,
  hint,
  value,
  pages,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  pages: string[];
  onChange: (slug: string) => void;
}) {
  return (
    <label className="block">
      <span className="kicker">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full bg-background border border-border rounded-sm px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent transition-colors appearance-none cursor-pointer"
      >
        {!pages.includes(value) && (
          <option value={value}>(missing) {value}</option>
        )}
        {pages.map((slug) => (
          <option key={slug} value={slug}>
            {slug}
          </option>
        ))}
      </select>
      <p className="text-xs italic text-foreground/40 mt-1">{hint}</p>
    </label>
  );
}
