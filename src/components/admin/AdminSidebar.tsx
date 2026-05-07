"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  href: string;
  label: string;
  // Two-digit section number rendered as the editorial kicker on the left.
  number: string;
};

const NAV: NavItem[] = [
  { href: "/admin/pages", number: "01", label: "Pages" },
  { href: "/admin/routing", number: "02", label: "Routing" },
  { href: "/admin/theme", number: "03", label: "Palette" },
];

export function AdminSidebar() {
  const pathname = usePathname() ?? "";
  return (
    <nav aria-label="Editor sections" className="space-y-10">
      <div>
        <p className="kicker">§ Editor</p>
        <p className="font-display text-3xl mt-2 leading-none">Settings</p>
        <p className="kicker text-foreground/40 mt-3">Local only</p>
      </div>

      <ul className="space-y-1">
        {NAV.map((item) => {
          // Treat any nested route as active too — keeps the row lit while
          // a sub-page (e.g. /admin/pages/something later) is open.
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`group relative flex items-baseline gap-4 py-2 pl-4 pr-3 -ml-4 rounded-sm transition-colors ${
                  active
                    ? "text-foreground"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                <span
                  aria-hidden
                  className={`absolute left-0 top-1/2 -translate-y-1/2 h-5 w-px transition-colors ${
                    active ? "bg-accent" : "bg-transparent"
                  }`}
                />
                <span
                  className={`kicker w-6 shrink-0 transition-colors ${
                    active ? "text-accent" : ""
                  }`}
                >
                  {item.number}
                </span>
                <span className="font-display text-2xl tracking-tight">
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
