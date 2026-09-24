"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const SIZES = {
  md: "max-w-lg",
  lg: "max-w-2xl",
} as const;

/**
 * Centered glass dialog for editor chrome (image picker, block picker).
 * Portaled to <body> so section / device-frame overflow can't clip it;
 * Escape and backdrop clicks close it, and the page scroll is locked while
 * it's open. The panel caps at 85vh and scrolls, so long lists stay
 * reachable on short screens.
 */
export function Modal({
  title,
  onClose,
  size = "md",
  children,
}: {
  title: string;
  onClose: () => void;
  size?: keyof typeof SIZES;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "glass-panel relative z-10 w-full max-h-[85vh] overflow-y-auto rounded-md border border-border p-5 shadow-2xl",
          SIZES[size]
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg text-foreground">{title}</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-sm border border-border text-foreground/60 hover:bg-foreground/10 hover:text-accent transition-colors"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
