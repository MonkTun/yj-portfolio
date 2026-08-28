"use client";

import type { ButtonProps } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useEdit } from "@/components/EditContext";
import { OpenLinkIcon } from "@/components/editor/icons";

export function Button({ label, href, variant, align, newTab }: ButtonProps) {
  const ctx = useEdit();

  // align now controls where the label sits *inside* the button, since
  // the button itself fills its placed rect (so resizing the block does
  // what the user expects).
  const justifyClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  const variantClass =
    variant === "primary"
      ? "bg-accent text-accent-foreground hover:opacity-90 shadow-[0_8px_24px_-8px_rgba(92,138,58,0.55)]"
      : "border border-border text-foreground hover:bg-foreground/5 hover:border-accent";

  const anchor = (
    <a
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-center w-full h-full kicker px-5 py-3 rounded-sm transition-all",
        justifyClass,
        variantClass
      )}
    >
      {label}
    </a>
  );

  if (!ctx) return anchor;

  // Editor mode: clicks on the block select it instead of following the
  // link, so surface a floating "open link" chip beside the selected
  // button for testing the target page (always in a new tab so the
  // editor session isn't lost).
  return (
    <span className="relative block h-full w-full">
      {anchor}
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Open ${href} in a new tab`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          className={cn(
            "absolute top-1/2 -translate-y-1/2 -right-9 z-20 pointer-events-auto",
            "glass-strong rounded-sm h-7 w-7 flex items-center justify-center",
            "text-foreground/85 hover:text-accent transition-opacity duration-150",
            ctx.selected ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          <OpenLinkIcon />
        </a>
      )}
    </span>
  );
}
