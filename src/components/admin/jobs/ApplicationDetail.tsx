"use client";

import { useMemo, useState } from "react";
import {
  STATUS_LABELS,
  type Application,
  type ApplicationEvent,
  type ApplicationStatus,
  type Contact,
} from "@/lib/jobs/schema";
import { daysAgo, removeApplication, updateApplication } from "./api";

type Status = "idle" | "saving" | "saved" | "error";

/** Slide-over editor for one application. */
export function ApplicationDetail({
  application,
  resumeFiles,
  onClose,
  onSaved,
  onDeleted,
}: {
  application: Application;
  resumeFiles: string[];
  onClose: () => void;
  onSaved: (app: Application) => void;
  onDeleted: (id: string) => void;
}) {
  const [draft, setDraft] = useState(application);
  const [status, setStatus] = useState<Status>("idle");
  const [err, setErr] = useState<string | null>(null);
  const [touchNote, setTouchNote] = useState("");
  const [touchKind, setTouchKind] =
    useState<ApplicationEvent["kind"]>("note");

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(application),
    [draft, application]
  );

  function set<K extends keyof Application>(key: K, value: Application[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  async function save(extraEvent?: ApplicationEvent) {
    setStatus("saving");
    setErr(null);
    try {
      const { application: saved } = await updateApplication(
        draft.id,
        {
          company: draft.company,
          role: draft.role,
          url: draft.url,
          location: draft.location,
          status: draft.status,
          jd: draft.jd,
          notes: draft.notes,
          contacts: draft.contacts,
          resumeVersion: draft.resumeVersion,
          deadline: draft.dates.deadline,
        },
        extraEvent
      );
      onSaved(saved);
      setDraft(saved);
      setStatus("saved");
    } catch (e) {
      setStatus("error");
      setErr(e instanceof Error ? e.message : String(e));
    }
  }

  async function logTouch() {
    const event: ApplicationEvent = {
      date: new Date().toISOString(),
      kind: touchKind,
      note: touchNote.trim(),
    };
    setTouchNote("");
    await save(event);
  }

  async function onDelete() {
    if (
      !window.confirm(
        `Delete ${application.company} — ${application.role}? This can't be undone.`
      )
    ) {
      return;
    }
    try {
      await removeApplication(application.id);
      onDeleted(application.id);
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    }
  }

  const inputClass =
    "w-full bg-background border border-border rounded-sm px-3 py-2 font-sans text-sm focus:outline-none focus:border-accent transition-colors";

  const statusLabel = (() => {
    switch (status) {
      case "saving":
        return "Saving…";
      case "saved":
        return dirty ? "Unsaved changes" : "Saved";
      case "error":
        return "Save failed";
      default:
        return dirty ? "Unsaved changes" : "";
    }
  })();

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-background/60"
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-label={`${application.company} — ${application.role}`}
        onClick={(e) => e.stopPropagation()}
        className="h-full w-full max-w-xl glass-strong border-l border-border overflow-y-auto"
      >
        {/* header */}
        <header className="sticky top-0 z-10 glass-strong border-b border-border px-6 h-14 flex items-center gap-4">
          <button
            type="button"
            onClick={onClose}
            className="kicker text-foreground/60 hover:text-foreground transition-colors"
          >
            ← Close
          </button>
          <div className="flex-1" />
          <span className="kicker text-foreground/40">{statusLabel}</span>
          <button
            type="button"
            onClick={() => save()}
            disabled={!dirty || status === "saving"}
            className={
              dirty
                ? "kicker px-4 py-2 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
                : "kicker px-4 py-2 rounded-sm glass-subtle text-foreground/40 cursor-not-allowed"
            }
          >
            Save
          </button>
        </header>

        <div className="px-6 py-6 space-y-6">
          <div>
            <p className="kicker">
              {STATUS_LABELS[draft.status]} · saved {daysAgo(draft.dates.saved)}
            </p>
            <h2 className="font-display text-4xl mt-2 leading-tight">
              {draft.company}
            </h2>
            <p className="font-body italic text-foreground/70 mt-1">
              {draft.role}
            </p>
          </div>

          {/* core fields */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="company">
              <input
                value={draft.company}
                onChange={(e) => set("company", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="role">
              <input
                value={draft.role}
                onChange={(e) => set("role", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="location">
              <input
                value={draft.location}
                onChange={(e) => set("location", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="status">
              <select
                value={draft.status}
                onChange={(e) =>
                  set("status", e.target.value as ApplicationStatus)
                }
                className={inputClass}
              >
                {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  )
                )}
              </select>
            </Field>
            <Field label="deadline">
              <input
                type="date"
                value={draft.dates.deadline}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    dates: { ...d.dates, deadline: e.target.value },
                  }))
                }
                className={inputClass}
              />
            </Field>
            <Field label="resume sent">
              <select
                value={draft.resumeVersion}
                onChange={(e) => set("resumeVersion", e.target.value)}
                className={inputClass}
              >
                <option value="">—</option>
                {resumeFiles.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="posting url" className="col-span-2">
              <div className="flex gap-2">
                <input
                  value={draft.url}
                  onChange={(e) => set("url", e.target.value)}
                  className={inputClass}
                />
                {draft.url && (
                  <a
                    href={draft.url}
                    target="_blank"
                    rel="noreferrer"
                    className="kicker shrink-0 px-3 py-2.5 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors"
                  >
                    Open ↗
                  </a>
                )}
              </div>
            </Field>
          </div>

          {/* log a touch */}
          <section className="border border-border rounded-sm p-4 bg-surface/40 space-y-3">
            <p className="kicker">Log a touch</p>
            <div className="flex gap-2">
              <select
                value={touchKind}
                onChange={(e) =>
                  setTouchKind(e.target.value as ApplicationEvent["kind"])
                }
                className={`${inputClass} w-36 shrink-0`}
              >
                <option value="note">Note</option>
                <option value="applied">Applied</option>
                <option value="followup">Follow-up</option>
                <option value="oa">OA</option>
                <option value="interview">Interview</option>
                <option value="offer">Offer</option>
                <option value="rejection">Rejection</option>
              </select>
              <input
                value={touchNote}
                onChange={(e) => setTouchNote(e.target.value)}
                placeholder="Recruiter replied, sent follow-up…"
                className={inputClass}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void logTouch();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void logTouch()}
                disabled={status === "saving"}
                className="kicker shrink-0 px-3 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
              >
                Log
              </button>
            </div>
            {draft.events.length > 0 && (
              <ul className="space-y-1.5 pt-1">
                {draft.events
                  .slice()
                  .reverse()
                  .map((ev, i) => (
                    <li key={i} className="flex gap-3 text-sm">
                      <span className="kicker text-foreground/40 shrink-0 w-16">
                        {daysAgo(ev.date)}
                      </span>
                      <span className="kicker text-accent shrink-0">
                        {ev.kind}
                      </span>
                      <span className="font-body text-foreground/80 min-w-0">
                        {ev.note}
                      </span>
                    </li>
                  ))}
              </ul>
            )}
          </section>

          {/* contacts */}
          <ContactsEditor
            contacts={draft.contacts}
            onChange={(contacts) => set("contacts", contacts)}
            inputClass={inputClass}
          />

          {/* notes + JD */}
          <Field label="notes">
            <textarea
              value={draft.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={4}
              className={`${inputClass} font-body resize-y`}
            />
          </Field>
          <Field
            label={`job description ${
              draft.jd ? `(${draft.jd.length.toLocaleString()} chars)` : ""
            }`}
          >
            <textarea
              value={draft.jd}
              onChange={(e) => set("jd", e.target.value)}
              rows={10}
              className={`${inputClass} font-body resize-y`}
            />
          </Field>

          {err && (
            <p className="text-xs italic text-foreground/70">Error: {err}</p>
          )}

          <div className="pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => void onDelete()}
              className="kicker text-foreground/40 hover:text-accent transition-colors"
            >
              Delete application
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="kicker block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function ContactsEditor({
  contacts,
  onChange,
  inputClass,
}: {
  contacts: Contact[];
  onChange: (contacts: Contact[]) => void;
  inputClass: string;
}) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");

  function add() {
    if (!name.trim()) return;
    onChange([
      ...contacts,
      { name: name.trim(), role: role.trim(), email: email.trim(), notes: "" },
    ]);
    setName("");
    setRole("");
    setEmail("");
  }

  return (
    <section className="border border-border rounded-sm p-4 bg-surface/40 space-y-3">
      <p className="kicker">Contacts</p>
      {contacts.length > 0 && (
        <ul className="space-y-1.5">
          {contacts.map((c, i) => (
            <li key={i} className="flex items-baseline gap-3 text-sm">
              <span className="font-body text-foreground/90">{c.name}</span>
              {c.role && (
                <span className="kicker text-foreground/40">{c.role}</span>
              )}
              {c.email && (
                <span className="font-sans text-xs text-foreground/60">
                  {c.email}
                </span>
              )}
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => onChange(contacts.filter((_, j) => j !== i))}
                className="kicker text-foreground/30 hover:text-accent transition-colors"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name"
          className={inputClass}
        />
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role"
          className={inputClass}
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!name.trim()}
          className="kicker shrink-0 px-3 py-2 rounded-sm border border-border hover:border-accent hover:text-accent transition-colors disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </section>
  );
}
