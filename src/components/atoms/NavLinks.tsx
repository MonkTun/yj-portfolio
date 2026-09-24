"use client";

import { usePathname } from "next/navigation";

import type { NavLinksProps } from "@/lib/schema";
import { cn } from "@/lib/utils";

/**
 * Nav Links — the site's navigation set into the page as display type: one
 * hairline-divided row per destination, label left and a trailing ↗
 * right so each row reads as an outbound link. It
 * lives at the top of the footer (the `mir_footer_nav` mirror) so every page
 * ends on the same links; the fixed navbar in `components/site/SiteNav.tsx`
 * is dormant (`site.json → nav.enabled`).
 *
 * `fontSize` is the md+ label size; below that the label shrinks with the
 * viewport (`11vw`, the overlay's ratio) so two-word labels never wrap on a
 * phone. Hover tints the row to the accent and nudges the arrow — reading
 * chrome, so no scale; the nudge is dropped under reduced motion.
 */
export function NavLinks({
  items,
  fontSize,
  rules,
  highlightCurrent,
  arrow,
  newTab,
}: NavLinksProps) {
  const pathname = usePathname() ?? "/";

  if (items.length === 0) {
    return (
      <div className="flex h-full min-h-32 w-full items-center justify-center rounded-sm border border-dashed border-border bg-surface/40">
        <span className="kicker text-foreground/30 italic">
          Empty nav — add links in the panel
        </span>
      </div>
    );
  }

  return (
    <ol
      className={cn("w-full", rules && "border-y border-border divide-y divide-border")}
      style={{ fontSize: `min(${fontSize}px, 11vw)` }}
    >
      {items.map((item, i) => {
        const active = highlightCurrent && isActive(pathname, item.href);
        const external = /^https?:\/\//.test(item.href);
        return (
          <li key={i}>
            <a
              href={item.href || undefined}
              target={newTab || external ? "_blank" : undefined}
              rel={newTab || external ? "noopener noreferrer" : undefined}
              aria-current={active ? "page" : undefined}
              draggable={false}
              className={cn(
                "group flex items-baseline justify-between gap-[1em] py-[0.3em] outline-none",
                "font-display font-black leading-[0.92] tracking-[-0.03em]",
                "transition-colors duration-[var(--duration-fast)] ease-[var(--ease)]",
                "hover:text-accent focus-visible:text-accent",
                active ? "text-accent" : "text-foreground",
              )}
            >
              <span className="min-w-0">
                {item.label || <span className="text-foreground/30">Untitled</span>}
              </span>
              {arrow && (
                <span
                  aria-hidden
                  className={cn(
                    "shrink-0 font-sans font-normal leading-none text-[0.7em]",
                    "transition-[color,transform] duration-[var(--duration-fast)] ease-[var(--ease)]",
                    active ? "text-accent" : "text-foreground/40",
                    "group-hover:text-accent motion-safe:group-hover:translate-x-[0.1em] motion-safe:group-hover:-translate-y-[0.1em]",
                  )}
                >
                  ↗
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * A link is "current" when its path matches the route or is a parent folder
 * of it (`/blog` stays lit on `/blog/hello-world`). Hash and external links
 * never count — they point at a spot, not a page.
 */
function isActive(pathname: string, href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("/#")) return false;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  if (path === "/") return pathname === "/";
  return pathname === path || pathname.startsWith(`${path}/`);
}
