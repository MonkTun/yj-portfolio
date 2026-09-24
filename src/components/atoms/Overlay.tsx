"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

const CloseCtx = createContext<() => void>(() => {});

/** Ask the enclosing overlay to close — plays the exit animation first. */
export function useOverlayClose() {
  return useContext(CloseCtx);
}

/**
 * Full-screen viewer shell shared by the image lightbox, the PDF reader and
 * the code viewer. A native modal <dialog> (top layer — above the nav, the
 * grain and the vignette; focus is trapped and Escape is handled by the
 * browser) portaled to <body> so it reads the page's own tokens rather than
 * a reverse section's swapped ones.
 *
 * Mount it to open, and unmount it from `onClose` — which fires only after
 * the exit animation (`.overlay` in globals.css) has played, the same
 * leave-then-unmount contract as SiteAnnouncement.
 *
 * Clicks on the dark backdrop close. The content layer is click-through
 * (pointer-events: none), so children opt their own surfaces back in with
 * `pointer-events-auto`; anything they leave transparent closes too.
 */
export function Overlay({
  label,
  title,
  actions,
  onClose,
  children,
}: {
  /** Accessible name of the dialog. */
  label: string;
  /** Left of the header bar — a kicker / title line. */
  title?: React.ReactNode;
  /** Right of the header bar, before the close button. */
  actions?: React.ReactNode;
  /** Called once the exit animation has finished — unmount here. */
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [closing, setClosing] = useState(false);
  const close = useCallback(() => setClosing(true), []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    dialog.showModal();
    // showModal focuses the first control, which would open every viewer
    // with a focus ring on its first action. Hold focus on the dialog;
    // Tab still walks into the controls.
    dialog.focus();
    // A modal dialog doesn't stop the page behind it from scrolling.
    const root = document.documentElement;
    const prevOverflow = root.style.overflow;
    root.style.overflow = "hidden";
    return () => {
      root.style.overflow = prevOverflow;
      if (dialog.open) dialog.close();
    };
  }, []);

  return createPortal(
    <dialog
      ref={ref}
      aria-label={label}
      tabIndex={-1}
      data-closing={closing}
      className="overlay fixed inset-0 m-0 h-full max-h-none w-full max-w-none overflow-hidden border-0 bg-transparent p-0 text-foreground outline-none backdrop:bg-transparent"
      onCancel={(e) => {
        // Escape — animate out instead of the browser's instant close.
        e.preventDefault();
        close();
      }}
      // The browser may close it anyway: Escape can't be cancelled without
      // recent user activation, or when pressed twice. A closed dialog is
      // display:none, so the exit animation would never end — unmount now.
      // `close` fires a task later, so skip it if the dialog is open again
      // by then: dev Strict Mode runs the effect's cleanup (close) and then
      // the effect again (showModal) on mount, and that stale event would
      // otherwise unmount the overlay the instant it opens.
      onClose={(e) => {
        if (!e.currentTarget.open) onClose();
      }}
      onAnimationEnd={(e) => {
        if (e.animationName === "overlay-backdrop-out") onClose();
      }}
    >
      <div aria-hidden className="overlay-backdrop absolute inset-0" onClick={close} />
      <CloseCtx.Provider value={close}>
        <div className="overlay-panel pointer-events-none relative flex h-full flex-col">
          <header className="pointer-events-auto flex items-center gap-2 border-b border-border px-4 py-2 md:gap-4 md:px-8">
            <div className="min-w-0 flex-1">{title}</div>
            {actions}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="-mr-2 p-2 font-mono text-xl leading-none text-foreground/70 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] hover:text-accent"
            >
              ×
            </button>
          </header>
          <div className="relative min-h-0 flex-1">{children}</div>
        </div>
      </CloseCtx.Provider>
    </dialog>,
    document.body,
  );
}

const actionCls =
  "kicker inline-flex shrink-0 items-center gap-1 px-2 py-2 text-foreground/80 transition-colors duration-[var(--duration-fast)] ease-[var(--ease)] hover:text-accent disabled:opacity-40 disabled:hover:text-foreground/80";

/** A header-bar action — a link when `href` is set, otherwise a button. */
export function OverlayAction({
  href,
  download,
  newTab,
  onClick,
  disabled,
  label,
  className,
  children,
}: {
  href?: string;
  download?: boolean;
  newTab?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  /** aria-label, for glyph-only actions. */
  label?: string;
  className?: string;
  children: React.ReactNode;
}) {
  if (href) {
    return (
      <a
        href={href}
        download={download || undefined}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        aria-label={label}
        className={cn(actionCls, className)}
      >
        {children}
      </a>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(actionCls, className)}
    >
      {children}
    </button>
  );
}

/** Four-corner "expand" glyph — the affordance on blocks that open an
 *  overlay. Inherits the text color. */
export function ExpandIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={cn("h-3.5 w-3.5", className)}
    >
      <path d="M2 6V2h4M10 2h4v4M14 10v4h-4M6 14H2v-4" />
    </svg>
  );
}
