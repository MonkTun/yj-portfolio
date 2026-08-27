"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SiteConfig } from "@/lib/schema";

type Props = {
  slug: string;
  config: SiteConfig;
};

export function PageRowMenu({ slug, config }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function call(
    label: string,
    fn: () => Promise<void>
  ): Promise<void> {
    setBusy(label);
    try {
      await fn();
    } catch (e) {
      window.alert(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  async function duplicate() {
    const res = await fetch("/api/admin/page/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: slug }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
    router.push(`/admin/edit/${body.slug}`);
  }

  async function assignRole(field: keyof SiteConfig, label: string) {
    const res = await fetch("/api/admin/site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: slug }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
    router.refresh();
    void label;
  }

  async function remove() {
    const ok = window.confirm(
      `Delete /${slug}?\n\nThis removes content/pages/${slug}.json and can't be undone from the UI.`
    );
    if (!ok) return;
    const res = await fetch("/api/admin/page", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body?.error ?? `HTTP ${res.status}`);
    router.refresh();
  }

  // Each role gets a checkmark when this slug is currently assigned to it,
  // so the user can see the active role without scrolling up to the panel.
  const isHome = config.homeSlug === slug;
  const isConstruction = config.constructionSlug === slug;
  const is404 = config.notFoundSlug === slug;
  const protectedFromDelete = isHome || isConstruction || is404;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        disabled={busy !== null}
        aria-label={`Actions for /${slug}`}
        className="kicker px-2 py-1 rounded-sm text-foreground/40 hover:text-accent hover:bg-foreground/5 transition-colors disabled:opacity-40"
      >
        {busy ? "…" : "•••"}
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 z-30 w-56 glass-strong rounded-sm border border-border shadow-2xl py-1.5 text-sm"
        >
          <MenuLink href={`/admin/edit/${slug}`}>Edit</MenuLink>
          <MenuItem onClick={() => call("duplicate", duplicate)}>
            Duplicate
          </MenuItem>
          <MenuDivider />
          <MenuItem
            onClick={() =>
              call("home", () => assignRole("homeSlug", "Home"))
            }
            checked={isHome}
          >
            Set as Home
          </MenuItem>
          <MenuItem
            onClick={() =>
              call("construction", () =>
                assignRole("constructionSlug", "Construction")
              )
            }
            checked={isConstruction}
          >
            Set as Construction
          </MenuItem>
          <MenuItem
            onClick={() =>
              call("404", () => assignRole("notFoundSlug", "404"))
            }
            checked={is404}
          >
            Set as 404
          </MenuItem>
          <MenuDivider />
          <MenuItem
            onClick={() => call("delete", remove)}
            disabled={protectedFromDelete}
            danger
            title={
              protectedFromDelete
                ? "Reassign the routing role first."
                : undefined
            }
          >
            Delete
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="block px-3 py-1.5 hover:bg-foreground/5 hover:text-accent transition-colors"
    >
      {children}
    </a>
  );
}

function MenuItem({
  onClick,
  children,
  checked,
  disabled,
  danger,
  title,
}: {
  onClick: () => void;
  children: React.ReactNode;
  checked?: boolean;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`w-full text-left px-3 py-1.5 flex items-center justify-between transition-colors ${
        disabled
          ? "text-foreground/30 cursor-not-allowed"
          : danger
            ? "hover:bg-accent/10 hover:text-accent"
            : "hover:bg-foreground/5 hover:text-accent"
      }`}
    >
      <span>{children}</span>
      {checked && <span className="text-accent kicker">✓</span>}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1.5 border-t border-border" />;
}
