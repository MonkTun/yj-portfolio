"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";

import type { AnnouncementConfig } from "@/lib/schema";
import { cn } from "@/lib/utils";

/**
 * Dismissable announcement strip that slides down over the top of every
 * public page — the e-commerce "free shipping" bar: white frosted glass
 * with dark IBM Plex Mono type, centered, and a plain × to close.
 *
 * Config: content/site.json → `announcement`, edited at /admin/routing.
 * Mounted beside `SiteNav` by the (site) layout and the root not-found.
 *
 * It renders nothing on the server: whether this visitor already dismissed
 * the message lives in localStorage, and a server-rendered bar would flash
 * in and out for everyone who did. It overlays the page (fixed), so
 * mounting after hydration shifts no layout — it just slides in.
 */
export function SiteAnnouncement({
  announcement,
}: {
  announcement: AnnouncementConfig;
}) {
  const id = announcementId(announcement);
  const dismissed = useSyncExternalStore(
    subscribe,
    readDismissed,
    () => undefined,
  );
  // Fallbacks for when storage is unavailable (private mode): the bar
  // still goes away for the rest of the visit.
  const [closedId, setClosedId] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);

  if (!isShowable(announcement)) return null;
  if (dismissed === undefined || dismissed === id || closedId === id) {
    return null;
  }

  function finishDismiss() {
    setClosedId(id);
    setLeaving(false);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage blocked — closedId already hides it for this visit.
    }
    notify();
  }

  return (
    <AnnouncementBar
      announcement={announcement}
      className="fixed inset-x-0 top-0 z-[53]"
      leaving={leaving}
      onDismiss={() => setLeaving(true)}
      onAnimationEnd={(e) => {
        if (e.animationName.startsWith("announcement-out")) finishDismiss();
      }}
    />
  );
}

/**
 * The bar itself, without positioning or persistence — shared by the live
 * site and the admin panel's preview so the two can't drift apart.
 */
export function AnnouncementBar({
  announcement,
  className,
  leaving = false,
  onDismiss,
  onAnimationEnd,
}: {
  announcement: AnnouncementConfig;
  className?: string;
  leaving?: boolean;
  onDismiss?: () => void;
  onAnimationEnd?: React.AnimationEventHandler<HTMLDivElement>;
}) {
  const { label, message, linkLabel, href } = announcement;
  const hasLink = linkLabel.trim() !== "" && href.trim() !== "";
  return (
    <div
      role="region"
      aria-label="Announcement"
      data-leaving={leaving}
      onAnimationEnd={onAnimationEnd}
      className={cn("announcement", className)}
    >
      <div className="relative flex items-center justify-center px-12 py-4 md:px-16">
        <p className="text-balance text-center font-mono text-[0.9375rem] leading-relaxed">
          {label.trim() && (
            <span className="mr-3 font-semibold uppercase tracking-[0.14em] max-sm:hidden">
              {label}
            </span>
          )}
          {message}
          {hasLink && (
            <>
              {" "}
              <Link
                href={href}
                className="underline underline-offset-4 decoration-1 hover:decoration-2"
              >
                {linkLabel} →
              </Link>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 font-mono text-lg leading-none opacity-60 transition-opacity duration-[var(--duration-fast)] ease-[var(--ease)] hover:opacity-100 md:right-6"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
    </div>
  );
}

const STORAGE_KEY = "yj-announcement-dismissed";

function isShowable(a: AnnouncementConfig): boolean {
  return a.enabled && a.message.trim() !== "";
}

/** Stable per-message id — a new message, link, or revision invalidates an
 *  old dismissal, so an edited or re-announced message reaches everyone. */
function announcementId(a: AnnouncementConfig): string {
  const text = `${a.message}\u0000${a.linkLabel}\u0000${a.href}\u0000${a.revision}`;
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = (h * 33) ^ text.charCodeAt(i);
  return (h >>> 0).toString(36);
}

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

/** The dismissed id, or null. Never undefined on the client — undefined is
 *  the server snapshot, meaning "don't know yet, render nothing". */
function readDismissed(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
