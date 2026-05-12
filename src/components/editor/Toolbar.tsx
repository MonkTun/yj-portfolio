"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { Device } from "@/lib/responsive";

type Status = "idle" | "saving" | "saved" | "error";

type Props = {
  slug: string;
  dirty: boolean;
  status: Status;
  errorMessage?: string;
  canUndo: boolean;
  canRedo: boolean;
  device: Device;
  onDeviceChange: (device: Device) => void;
  /** Auto-derive a mobile layout from the desktop layout, restacking
   *  side-by-side blocks into a vertical column. Wipes existing mobile
   *  overrides — the toolbar prompts before calling. */
  onAutoStack: () => void;
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
  device,
  onDeviceChange,
  onAutoStack,
  previewAnchor,
  onUndo,
  onRedo,
  onSave,
}: Props) {
  function handleAutoStack() {
    const ok = window.confirm(
      "Auto-stack the page for mobile?\n\nThis replaces every block's mobile layout with a top-to-bottom stack derived from the desktop layout. Existing mobile layout overrides will be overwritten.\n\n(Block-level style overrides — fontSize, hidden, etc. — are kept.)",
    );
    if (ok) onAutoStack();
  }
  // Every editable page renders through the public root with a `?preview=`
  // override, so the editor preview link bypasses the construction-page
  // default no matter which slug is being edited.
  const baseHref = `/?preview=${encodeURIComponent(slug)}`;
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

  // Internal nav out of the editor. The browser-level beforeunload guard in
  // Editor.tsx covers refresh/close, but Next.js client-side navigation
  // doesn't trigger it — so we intercept the click here when dirty.
  function handleLeaveEditor(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!dirty) return;
    const ok = window.confirm(
      "You have unsaved changes. Leave anyway?\n\n(Save first to keep your edits.)"
    );
    if (!ok) e.preventDefault();
  }

  return (
    <header className="h-14 shrink-0 glass-strong border-b border-border flex items-center px-4 gap-4 z-50">
      <Link
        href="/admin"
        onClick={handleLeaveEditor}
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

      <div
        role="group"
        aria-label="Device"
        className="flex items-center rounded-sm border border-border overflow-hidden"
      >
        <DeviceButton
          active={device === "desktop"}
          onClick={() => onDeviceChange("desktop")}
          label="Desktop view"
        >
          {DesktopIcon}
        </DeviceButton>
        <DeviceButton
          active={device === "mobile"}
          onClick={() => onDeviceChange("mobile")}
          label="Mobile view"
        >
          {MobileIcon}
        </DeviceButton>
      </div>

      {device === "mobile" && (
        <button
          type="button"
          onClick={handleAutoStack}
          title="Replace mobile layout with a vertical stack derived from desktop"
          className="kicker px-3 py-1.5 rounded-sm border border-border text-foreground/80 hover:bg-surface hover:text-accent transition-colors"
        >
          Auto-stack
        </button>
      )}

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

function DeviceButton({
  active,
  onClick,
  label,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "h-8 w-9 flex items-center justify-center transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "text-foreground/70 hover:bg-surface hover:text-accent"
      )}
    >
      {children}
    </button>
  );
}

const DesktopIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="3" y="4" width="18" height="12" rx="1.5" />
    <path d="M9 20h6M12 16v4" />
  </svg>
);

const MobileIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <rect x="7" y="3" width="10" height="18" rx="1.75" />
    <path d="M11 18h2" />
  </svg>
);
