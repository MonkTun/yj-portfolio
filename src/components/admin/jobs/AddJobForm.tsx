"use client";

import { useState } from "react";
import type { Application } from "@/lib/jobs/schema";
import { createApplication, fetchPosting } from "./api";

/**
 * Add-a-job form. Paste a posting URL and Autofill hits the public
 * Greenhouse / Lever / Ashby JSON APIs server-side; everything else falls
 * back to the JD textarea.
 */
export function AddJobForm({
  onCreated,
}: {
  onCreated: (app: Application) => void;
}) {
  const [url, setUrl] = useState("");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [deadline, setDeadline] = useState("");
  const [jd, setJd] = useState("");
  const [source, setSource] = useState<Application["source"]>("manual");
  const [fetching, setFetching] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submittable = company.trim().length > 0 && role.trim().length > 0 && !busy;

  async function onAutofill() {
    if (!url.trim() || fetching) return;
    setFetching(true);
    setErr(null);
    setNotice(null);
    try {
      const { posting } = await fetchPosting(url.trim());
      if (posting.company) setCompany(posting.company);
      if (posting.role) setRole(posting.role);
      if (posting.location) setLocation(posting.location);
      if (posting.jd) setJd(posting.jd);
      setSource(posting.source);
      setNotice(
        posting.source === "manual"
          ? "Fetched the page text — double-check the fields."
          : `Autofilled from ${posting.source}.`
      );
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setFetching(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!submittable) return;
    setBusy(true);
    setErr(null);
    try {
      const { application } = await createApplication({
        company: company.trim(),
        role: role.trim(),
        url: url.trim(),
        location: location.trim(),
        deadline,
        jd,
        source,
      });
      onCreated(application);
      setUrl("");
      setCompany("");
      setRole("");
      setLocation("");
      setDeadline("");
      setJd("");
      setSource("manual");
      setNotice(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    "w-full bg-background border border-border rounded-sm px-3 py-2 font-sans text-sm focus:outline-none focus:border-accent transition-colors";

  return (
    <form
      onSubmit={onSubmit}
      className="mt-12 border border-border rounded-sm p-5 space-y-4 bg-surface/40"
    >
      <p className="kicker">Track a job</p>

      <div className="flex gap-3 items-end">
        <label className="block flex-1">
          <span className="kicker block mb-1.5">posting url</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://boards.greenhouse.io/…, jobs.lever.co/…, jobs.ashbyhq.com/…"
            className={inputClass}
          />
        </label>
        <button
          type="button"
          onClick={onAutofill}
          disabled={!url.trim() || fetching}
          className="kicker px-4 py-2.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {fetching ? "Fetching…" : "Autofill"}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <label className="block">
          <span className="kicker block mb-1.5">company</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="kicker block mb-1.5">role</span>
          <input
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="kicker block mb-1.5">location</span>
          <input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="block">
          <span className="kicker block mb-1.5">deadline</span>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block">
        <span className="kicker block mb-1.5">
          job description {jd && `(${jd.length.toLocaleString()} chars)`}
        </span>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          rows={5}
          placeholder="Paste the JD here (snapshotted — postings get taken down)."
          className={`${inputClass} font-body resize-y`}
        />
      </label>

      <div className="flex items-center justify-between gap-4">
        <p className="text-xs italic text-foreground/50">
          {notice ?? "Company + role are enough to start tracking."}
        </p>
        <button
          type="submit"
          disabled={!submittable}
          className="kicker px-4 py-2.5 rounded-sm bg-accent text-accent-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {busy ? "Adding…" : "Add to board"}
        </button>
      </div>

      {err && <p className="text-xs italic text-foreground/70">Error: {err}</p>}
    </form>
  );
}
