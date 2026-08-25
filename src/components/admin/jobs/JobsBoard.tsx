"use client";

import { useMemo, useState } from "react";
import {
  BOARD_COLUMNS,
  STALE_AFTER_DAYS,
  STATUS_LABELS,
  type Application,
  type ApplicationStatus,
} from "@/lib/jobs/schema";
import { cn } from "@/lib/utils";
import { daysAgo, daysSince, updateApplication } from "./api";
import { AddJobForm } from "./AddJobForm";
import { ApplicationDetail } from "./ApplicationDetail";
import { ScoreBadge } from "./ScoreBadge";

type View = "board" | "list";

const OPEN_STATUSES: ApplicationStatus[] = [
  "bookmarked",
  "applied",
  "oa",
  "interviewing",
];

export function JobsBoard({
  initial,
  resumeFiles,
}: {
  initial: Application[];
  resumeFiles: string[];
}) {
  const [apps, setApps] = useState<Application[]>(initial);
  const [view, setView] = useState<View>("board");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = apps.find((a) => a.id === selectedId) ?? null;

  function replace(app: Application) {
    setApps((prev) => prev.map((a) => (a.id === app.id ? app : a)));
  }

  async function moveStatus(app: Application, status: ApplicationStatus) {
    const before = apps;
    // Optimistic move; adopt the server's version (it stamps dates) on success.
    setApps((prev) =>
      prev.map((a) => (a.id === app.id ? { ...a, status } : a))
    );
    try {
      const { application } = await updateApplication(app.id, { status });
      replace(application);
    } catch (e) {
      setApps(before);
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }

  const byRecency = useMemo(
    () =>
      apps
        .slice()
        .sort((a, b) => b.dates.lastTouch.localeCompare(a.dates.lastTouch)),
    [apps]
  );

  return (
    <div className="mt-10">
      <div className="flex items-center justify-between gap-4">
        <div
          role="group"
          aria-label="View"
          className="flex items-center rounded-sm border border-border overflow-hidden"
        >
          <ViewButton active={view === "board"} onClick={() => setView("board")}>
            Board
          </ViewButton>
          <ViewButton active={view === "list"} onClick={() => setView("list")}>
            List
          </ViewButton>
        </div>
        <span className="kicker text-foreground/40">
          {apps.length} tracked ·{" "}
          {apps.filter((a) => OPEN_STATUSES.includes(a.status)).length} open
        </span>
      </div>

      {view === "board" ? (
        <Board apps={apps} onSelect={setSelectedId} onMove={moveStatus} />
      ) : (
        <ListView apps={byRecency} onSelect={setSelectedId} />
      )}

      <AddJobForm onCreated={(app) => setApps((prev) => [app, ...prev])} />

      {selected && (
        // Keyed by id so opening a different card remounts with fresh draft
        // state instead of re-seeding via effects.
        <ApplicationDetail
          key={selected.id}
          application={selected}
          resumeFiles={resumeFiles}
          onClose={() => setSelectedId(null)}
          onSaved={replace}
          onDeleted={(id) => {
            setApps((prev) => prev.filter((a) => a.id !== id));
            setSelectedId(null);
          }}
        />
      )}
    </div>
  );
}

/* ---------------- board ---------------- */

function Board({
  apps,
  onSelect,
  onMove,
}: {
  apps: Application[];
  onSelect: (id: string) => void;
  onMove: (app: Application, status: ApplicationStatus) => void;
}) {
  return (
    <div className="mt-6 -mx-2 overflow-x-auto pb-2">
      <div className="flex gap-3 min-w-max px-2">
        {BOARD_COLUMNS.map((col) => {
          const cards = apps.filter((a) => col.statuses.includes(a.status));
          return (
            <section key={col.key} className="w-56 shrink-0">
              <header className="flex items-baseline justify-between pb-2 border-b border-border">
                <h2 className="kicker text-foreground">{col.label}</h2>
                <span className="kicker text-foreground/40">
                  {cards.length}
                </span>
              </header>
              <ul className="mt-3 space-y-2">
                {cards.map((app) => (
                  <Card
                    key={app.id}
                    app={app}
                    onSelect={onSelect}
                    onMove={onMove}
                  />
                ))}
              </ul>
              {cards.length === 0 && (
                <p className="mt-3 text-xs italic text-foreground/30">Empty</p>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Card({
  app,
  onSelect,
  onMove,
}: {
  app: Application;
  onSelect: (id: string) => void;
  onMove: (app: Application, status: ApplicationStatus) => void;
}) {
  const stale =
    OPEN_STATUSES.includes(app.status) &&
    daysSince(app.dates.lastTouch) >= STALE_AFTER_DAYS;
  return (
    <li className="rounded-sm border border-border bg-surface/40 hover:border-accent/60 transition-colors">
      <button
        type="button"
        onClick={() => onSelect(app.id)}
        className="block w-full text-left px-3 pt-3"
      >
        <p className="kicker flex items-center gap-1.5">
          {stale && (
            <span
              title={`No touch in ${STALE_AFTER_DAYS}+ days — follow up`}
              className="h-1.5 w-1.5 rounded-full bg-accent shrink-0"
            />
          )}
          <span className="truncate flex-1">{app.company}</span>
          {app.matchScore && <ScoreBadge score={app.matchScore.score} />}
        </p>
        <p className="font-display text-lg leading-tight mt-1">{app.role}</p>
        <p className="kicker text-foreground/40 mt-2 normal-case tracking-normal">
          {[app.location, daysAgo(app.dates.lastTouch)]
            .filter(Boolean)
            .join(" · ")}
        </p>
      </button>
      <div className="px-3 py-2 mt-1 border-t border-border/60">
        <select
          aria-label={`Status for ${app.company} — ${app.role}`}
          value={app.status}
          onChange={(e) => onMove(app, e.target.value as ApplicationStatus)}
          className="w-full bg-transparent kicker text-foreground/60 focus:outline-none focus:text-accent cursor-pointer"
        >
          {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
            <option key={s} value={s} className="bg-surface text-foreground">
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
    </li>
  );
}

/* ---------------- list ---------------- */

function ListView({
  apps,
  onSelect,
}: {
  apps: Application[];
  onSelect: (id: string) => void;
}) {
  if (apps.length === 0) {
    return (
      <p className="mt-8 text-foreground/60 italic">
        Nothing tracked yet — add your first application below.
      </p>
    );
  }
  return (
    <ul className="mt-4 divide-y divide-border">
      {apps.map((app) => {
        const stale =
          OPEN_STATUSES.includes(app.status) &&
          daysSince(app.dates.lastTouch) >= STALE_AFTER_DAYS;
        return (
          <li key={app.id}>
            <button
              type="button"
              onClick={() => onSelect(app.id)}
              className="group w-full text-left flex items-baseline justify-between gap-6 py-5 transition-colors hover:bg-surface/40 px-2 -mx-2"
            >
              <div className="min-w-0">
                <p className="kicker flex items-center gap-2 flex-wrap">
                  <span>{app.company}</span>
                  <span className="px-1.5 py-0.5 rounded-sm bg-surface border border-border text-foreground/60 text-[10px]">
                    {STATUS_LABELS[app.status]}
                  </span>
                  {stale && (
                    <span className="px-1.5 py-0.5 rounded-sm bg-accent/15 text-accent text-[10px]">
                      follow up
                    </span>
                  )}
                  {app.matchScore && <ScoreBadge score={app.matchScore.score} />}
                </p>
                <p className="font-display text-2xl mt-1.5 truncate">
                  {app.role}
                </p>
              </div>
              <span className="kicker text-foreground/40 shrink-0">
                {daysAgo(app.dates.lastTouch)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- bits ---------------- */

function ViewButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "kicker px-3 py-1.5 transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground/70 hover:bg-surface hover:text-accent"
      )}
    >
      {children}
    </button>
  );
}
