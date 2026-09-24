"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavConfig } from "@/lib/schema";
import { cn } from "@/lib/utils";

/**
 * Fixed site navigation — DORMANT since Sep 2026. `content/site.json →
 * nav.enabled` is false, so this renders nothing; the live navigation is the
 * footer's `mir_footer_nav` mirror (a `navLinks` block — the oversized-label
 * list that used to be this component's phone overlay). Kept mounted and
 * intact so it can be switched back on from /admin/routing.
 *
 * When enabled it is the one piece of public chrome that isn't a page
 * block. There is no wordmark, and what the chrome looks like depends on the
 * viewport:
 *  - md and up: a full-width navbar — a frosted strip across the top of the
 *    viewport with every link laid out inline, right-aligned on the section
 *    safe area's column-12 edge. No toggle. Scrolling DOWN "hides" it by
 *    greying it out: the glass background and blur drop away and the labels
 *    fall back to the muted sepia, so the strip reads as a faint watermark
 *    over the content. Scrolling UP (or reaching the top, or hovering it)
 *    brings the frosted bar and full-strength labels back. It never leaves
 *    the viewport.
 *  - below md: a single frosted pill at the column-12 edge whose toggle opens
 *    a full-viewport overlay with oversized links, since an inline strip has
 *    no room on a phone. It closes on Escape, on a click outside, on a link,
 *    or on route change, and locks body scroll while open.
 * Reduced motion collapses every slide to a plain fade; the desktop dimming
 * is already colour/opacity-only.
 *
 * Config comes from content/site.json → `nav` (edited at /admin/routing).
 * Rendered by the (site) layout and the not-found route — the admin editor
 * never shows it, so the canvas stays a clean preview of the page's blocks.
 */
export function SiteNav({ nav }: { nav: NavConfig }) {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const dimmed = useScrollingDown();
  const rootRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpen(false), []);

  // Route change (a link was followed, or back/forward) closes the menu.
  // State adjusted during render rather than in an effect so the closed
  // frame paints together with the new route.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);

    // The overlay covers the page, so lock scroll underneath it.
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus to the overlay's first link; hand it back to the toggle on
    // close.
    const focusTimer = window.setTimeout(() => {
      if (document.activeElement !== document.body) return;
      rootRef.current
        ?.querySelector<HTMLAnchorElement>("[data-menu-link]")
        ?.focus();
    }, 50);
    const toggle = toggleRef.current;
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
      document.body.style.overflow = prevOverflow;
      window.clearTimeout(focusTimer);
      toggle?.focus();
    };
  }, [open, close]);

  if (!nav.enabled) return null;

  return (
    <div ref={rootRef}>
      <div className="fixed inset-x-0 top-0 z-[52] pointer-events-none">
        {/* Desktop navbar: a bar across the full viewport width. `dimmed`
            swaps the frosted strip for a bare, greyed one while scrolling
            down. The glass hairline border sits on the viewport edges on
            three sides, so only its bottom edge reads. */}
        <nav
          aria-label="Site"
          data-dimmed={dimmed || undefined}
          className={cn(
            "pointer-events-auto hidden md:block",
            "transition-[opacity,background-color,border-color,backdrop-filter] duration-[var(--duration)] ease-[var(--ease)]",
            dimmed
              ? "border-b border-transparent opacity-60 hover:opacity-100"
              : "glass-strong opacity-100",
          )}
        >
          {/* Same safe-area container as SectionRenderer so the last label
              ends on the page's column-12 edge (the -mr cancels its padding). */}
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-end px-6 md:px-10">
            <ol className="-mr-3 flex items-center gap-2">
              {nav.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={`${item.label}-${item.href}`}>
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "kicker block whitespace-nowrap px-3 py-2 outline-none",
                        "hover:text-accent focus-visible:text-accent",
                        "transition-colors duration-[var(--duration)] ease-[var(--ease)]",
                        dimmed
                          ? "text-muted-foreground"
                          : active
                            ? "text-accent"
                            : "text-foreground",
                      )}
                    >
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ol>
          </div>
        </nav>

        {/* Phone: a lone frosted pill on the column-12 edge — the toggle
            that opens the overlay. */}
        <div className="mx-auto flex max-w-7xl justify-end px-6 md:hidden">
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="site-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className={cn(
              "pointer-events-auto mt-4 glass-strong kicker flex h-10 items-center gap-3 rounded-full pl-4 pr-3.5 outline-none",
              "text-foreground hover:text-accent focus-visible:text-accent",
              "transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
              open && "text-accent",
            )}
          >
            <span>{open ? "Close" : "Menu"}</span>
            <MenuGlyph open={open} />
          </button>
        </div>
      </div>

      <Overlay nav={nav} open={open} pathname={pathname} onClose={close} />
    </div>
  );
}

/**
 * True while the page is being scrolled DOWN (and isn't at the very top);
 * flips back the moment it scrolls up. Small deltas are ignored so trackpad
 * jitter and rubber-banding don't flicker the state; reads are batched to
 * one per frame.
 */
function useScrollingDown(threshold = 4, topOffset = 8): boolean {
  const [down, setDown] = useState(false);
  useEffect(() => {
    let lastY = window.scrollY;
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        const y = window.scrollY;
        const delta = y - lastY;
        if (y <= topOffset) setDown(false);
        else if (delta > threshold) setDown(true);
        else if (delta < -threshold) setDown(false);
        lastY = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [threshold, topOffset]);
  return down;
}

/** Two hairlines that fold into a cross when the menu is open. */
function MenuGlyph({ open }: { open: boolean }) {
  const line =
    "absolute left-0 h-px w-full bg-current transition-transform duration-[var(--duration)] ease-[var(--ease)]";
  return (
    <span aria-hidden className="relative block h-3 w-5">
      <span className={cn(line, "top-[3px]", open && "translate-y-[3px] rotate-45")} />
      <span className={cn(line, "bottom-[3px]", open && "-translate-y-[3px] -rotate-45")} />
    </span>
  );
}

/** Phone (below md): full-viewport overlay with oversized links. */
function Overlay({
  nav,
  open,
  pathname,
  onClose,
}: {
  nav: NavConfig;
  open: boolean;
  pathname: string;
  onClose: () => void;
}) {
  return (
    <div
      id="site-menu"
      role="dialog"
      aria-modal={open}
      aria-label="Site menu"
      aria-hidden={!open}
      onClick={onClose}
      className={cn(
        // Above the vignette (z-50) so the corners don't double-darken, below
        // the grain (z-60) so the paper texture still sits on top, and below
        // the pill (z-52) which doubles as the close control.
        "md:hidden fixed inset-0 z-[51] bg-background/95 backdrop-blur-xl",
        "transition-[opacity,visibility] duration-[var(--duration)] ease-[var(--ease)]",
        open ? "opacity-100 visible" : "opacity-0 invisible pointer-events-none",
      )}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex h-full flex-col px-6 pt-24 pb-10"
      >
        <p className="kicker mb-8">Navigation</p>
        <ol className="divide-y divide-border border-y border-border">
          {nav.items.map((item, i) => {
            const active = isActive(pathname, item.href);
            return (
              <li
                key={`${item.label}-${item.href}`}
                style={{ ["--i" as string]: i } as React.CSSProperties}
                className={cn(
                  "transition-[opacity,transform] duration-[var(--duration-slow)] ease-[var(--ease)]",
                  open
                    ? "opacity-100 translate-y-0 [transition-delay:calc(var(--stagger)*var(--i))]"
                    : "opacity-0 motion-safe:translate-y-4 delay-0",
                )}
              >
                <Link
                  data-menu-link
                  href={item.href}
                  onClick={onClose}
                  tabIndex={open ? 0 : -1}
                  aria-current={active ? "page" : undefined}
                  className="group flex items-baseline py-5 outline-none focus-visible:text-accent"
                >
                  <span
                    className={cn(
                      "font-display font-black leading-[0.92] tracking-[-0.03em] text-[clamp(2.5rem,11vw,4.5rem)]",
                      active ? "text-accent" : "text-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

/**
 * A link is "current" when its path matches the route or is a parent
 * folder of it (`/blog` stays lit on `/blog/hello-world`). Hash and external
 * links never count — they point at a spot, not a page.
 */
function isActive(pathname: string, href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("/#")) return false;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}
