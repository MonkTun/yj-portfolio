"use client";

import { useEffect, useMemo, useState } from "react";
import {
  daysAgo,
  dismissLead,
  fetchLeads,
  promoteLead,
  type Lead,
  type LeadsResponse,
} from "./api";
import { ScoreBadge } from "./ScoreBadge";

type Status = "loading" | "refreshing" | "idle" | "error";

/** Discovery feed (phase 5): SimplifyJobs listings + watchlist ATS boards,
 *  ranked by best-variant match score. Promote → Bookmarked application. */
export function DiscoverList() {
  const [data, setData] = useState<LeadsResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load(refresh: boolean) {
    setStatus(refresh ? "refreshing" : "loading");
    setErr(null);
    try {
      setData(await fetchLeads(refresh));
      setStatus("idle");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  }

  // External-system sync: the feed lives server-side (cached leads.json).
  // Initial state is already "loading", so only the async completion sets
  // state — no synchronous setState in the effect body.
  useEffect(() => {
    let cancelled = false;
    fetchLeads(false)
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setStatus("idle");
      })
      .catch((e) => {
        if (cancelled) return;
        setErr(e instanceof Error ? e.message : String(e));
        setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const leads = useMemo(() => {
    if (!data) return [];
    const q = filter.trim().toLowerCase();
    if (!q) return data.leads;
    return data.leads.filter((l) =>
      `${l.company} ${l.role} ${l.location}`.toLowerCase().includes(q)
    );
  }, [data, filter]);

  async function onPromote(lead: Lead) {
    setBusyId(lead.id);
    setNotice(null);
    try {
      await promoteLead(lead.id);
      setData((d) =>
        d ? { ...d, leads: d.leads.filter((l) => l.id !== lead.id) } : d
      );
      setNotice(`Tracking ${lead.company} — ${lead.role} (bookmarked).`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function onDismiss(lead: Lead) {
    setBusyId(lead.id);
    try {
      await dismissLead(lead.id);
      setData((d) =>
        d ? { ...d, leads: d.leads.filter((l) => l.id !== lead.id) } : d
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  const inputClass =
    "bg-background border border-border rounded-sm px-3 py-2 font-sans text-sm focus:outline-none focus:border-accent transition-colors";

  return (
    <div className="mt-10">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by company, role, location…"
          className={`${inputClass} flex-1 min-w-48`}
        />
        <button
          type="button"
          onClick={() => void load(true)}
          disabled={status === "loading" || status === "refreshing"}
          className="kicker px-4 py-2.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
        >
          {status === "refreshing" ? "Refreshing feeds…" : "Refresh"}
        </button>
      </div>

      <p className="kicker text-foreground/40 mt-3">
        {data
          ? `${leads.length} leads · ${data.watchlistCount} watchlist ${
              data.watchlistCount === 1 ? "company" : "companies"
            } · fetched ${data.fetchedAt ? daysAgo(data.fetchedAt) : "never"}`
          : status === "loading"
            ? "Loading feed…"
            : ""}
      </p>
      {data && data.watchlistCount === 0 && (
        <p className="mt-2 text-xs italic text-foreground/50">
          Add companies to{" "}
          <code className="font-sans">content/jobs/watchlist.json</code> to poll
          their Greenhouse / Lever / Ashby boards with full-JD scoring — Simplify
          listings rank by title match only.
        </p>
      )}
      {notice && <p className="mt-2 text-xs italic text-accent">{notice}</p>}
      {err && (
        <p className="mt-2 text-xs italic text-foreground/70">Error: {err}</p>
      )}

      <ul className="mt-4 divide-y divide-border">
        {leads.map((lead) => (
          <li key={lead.id} className="py-4 flex items-start gap-4">
            <div className="min-w-0 flex-1">
              <p className="kicker flex items-center gap-2 flex-wrap">
                <span>{lead.company}</span>
                <ScoreBadge score={lead.score} />
                <span className="px-1.5 py-0.5 rounded-sm bg-surface border border-border text-foreground/50 text-[10px]">
                  {lead.via === "watchlist" ? lead.source : "simplify"}
                </span>
                {lead.terms.map((t) => (
                  <span key={t} className="text-[10px] text-foreground/40">
                    {t}
                  </span>
                ))}
              </p>
              <p className="font-display text-xl mt-1 leading-tight">
                {lead.role}
              </p>
              <p className="kicker text-foreground/40 mt-1.5 normal-case tracking-normal">
                {[
                  lead.location,
                  lead.postedAt ? `posted ${daysAgo(lead.postedAt)}` : "",
                  lead.variant ? `vs ${lead.variant}` : "",
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {lead.matchedTop.length > 0 && (
                <p className="mt-1 text-[11px] font-sans text-foreground/50">
                  {lead.matchedTop.join(" · ")}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 pt-0.5">
              <a
                href={lead.url}
                target="_blank"
                rel="noreferrer"
                className="kicker text-foreground/40 hover:text-accent transition-colors"
              >
                Open ↗
              </a>
              <button
                type="button"
                onClick={() => void onPromote(lead)}
                disabled={busyId === lead.id}
                className="kicker px-3 py-1.5 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-40"
              >
                Track
              </button>
              <button
                type="button"
                onClick={() => void onDismiss(lead)}
                disabled={busyId === lead.id}
                className="kicker px-3 py-1.5 rounded-sm border border-border text-foreground/50 hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
      {status === "idle" && leads.length === 0 && (
        <p className="mt-6 text-foreground/60 italic">
          No leads match — refresh the feed or loosen the filter.
        </p>
      )}
    </div>
  );
}
