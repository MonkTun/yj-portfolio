"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

type Status = "idle" | "saving" | "saved" | "error";

type Props = {
  slug: string;
  dirty: boolean;
  status: Status;
  errorMessage?: string;
  canUndo: boolean;
  canRedo: boolean;
  /** id of the selected section or block — appended as the preview URL hash. */
  previewAnchor?: string | null;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => Promise<void> | void;
};

export function Toolbar({
  slug,
  dirty,
  status,
  errorMessage,
  canUndo,
  canRedo,
  previewAnchor,
  onUndo,
  onRedo,
  onSave,
}: Props) {
  const baseHref = slug === "home" ? "/" : `/${slug}`;
  const previewHref = previewAnchor ? `${baseHref}#${previewAnchor}` : baseHref;

  // If there are unsaved changes, the public route would render stale JSON
  // (image src, transform props, etc. wouldn't be there yet). Open the tab
  // immediately so the popup blocker doesn't intervene, then save in the
  // background and reload the tab once the file is on disk.
  function handlePreview(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    e.preventDefault();
    const tab = window.open(previewHref, "_blank");
    Promise.resolve(onSave()).then(() => {
      try {
        tab?.location.reload();
      } catch {
        // If the tab navigated cross-origin in the meantime, ignore.
      }
    });
  }
  const statusLabel = (() => {
    if (status === "saving") return "Saving…";
    if (status === "saved") return "Saved";
    if (status === "error") return errorMessage ?? "Error";
    if (dirty) return "Unsaved changes";
    return "Up to date";
  })();
  const statusClass =
    status === "error"
      ? "text-accent"
      : dirty
        ? "text-foreground"
        : "text-foreground/50";

  return (
    <header className="h-14 shrink-0 glass-strong border-b border-border flex items-center px-4 gap-4 z-50">
      <Link
        href="/admin"
        className="kicker hover:text-accent transition-colors"
      >
        ← Pages
      </Link>
      <div className="kicker text-foreground/60">/{slug}</div>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <ToolButton onClick={onUndo} disabled={!canUndo} title="Undo (⌘Z)">
          ↶
        </ToolButton>
        <ToolButton onClick={onRedo} disabled={!canRedo} title="Redo (⇧⌘Z)">
          ↷
        </ToolButton>
      </div>

      <span className={cn("kicker", statusClass)}>{statusLabel}</span>

      <Link
        href={previewHref}
        target="_blank"
        onClick={handlePreview}
        className="kicker text-foreground/70 hover:text-accent transition-colors"
        title={dirty ? "Saves first, then opens" : "Open public page"}
      >
        Preview ↗
      </Link>

      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || status === "saving"}
        className={cn(
          "kicker px-4 py-2 rounded-sm transition-all",
          dirty
            ? "bg-accent text-accent-foreground hover:opacity-90 shadow-[0_8px_24px_-8px_rgba(92,138,58,0.6)]"
            : "glass-subtle text-foreground/40 cursor-not-allowed"
        )}
      >
        Save
      </button>
    </header>
  );
}

function ToolButton({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "h-8 w-8 rounded-sm border border-border text-base flex items-center justify-center transition-colors",
        disabled
          ? "text-foreground/30 cursor-not-allowed"
          : "text-foreground hover:bg-surface hover:text-accent"
      )}
    >
      {children}
    </button>
  );
}
