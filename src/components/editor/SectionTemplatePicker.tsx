"use client";

import { useEffect, useRef, useState } from "react";
import {
  sectionTemplates,
  type SectionTemplate,
} from "@/lib/section-templates";
import { cn } from "@/lib/utils";
import { PlusIcon } from "./icons";

type Props = {
  onSelect: (template: SectionTemplate) => void;
};

export function AddSectionInline({ onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="relative h-4 group/insert"
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-x-0 top-1/2 -translate-y-1/2 h-px transition-opacity duration-200",
          open
            ? "bg-accent opacity-100"
            : "bg-accent opacity-0 group-hover/insert:opacity-50"
        )}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="Insert section here"
          className={cn(
            "h-7 w-7 rounded-full glass-strong flex items-center justify-center text-foreground/85 hover:text-accent transition-opacity",
            open ? "opacity-100" : "opacity-0 group-hover/insert:opacity-100"
          )}
        >
          <PlusIcon />
        </button>
      </div>

      {open && (
        <div className="absolute left-1/2 top-full -translate-x-1/2 mt-3 z-40 glass-strong rounded-md p-3 w-[44rem] max-w-[90vw] shadow-2xl">
          <p className="kicker mb-3">Section layouts</p>
          <ul className="grid grid-cols-3 gap-2">
            {sectionTemplates.map((tpl) => (
              <li key={tpl.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(tpl);
                    setOpen(false);
                  }}
                  className="w-full text-left p-3 rounded-sm bg-background/40 hover:bg-foreground/10 border border-border hover:border-accent transition-colors group"
                >
                  <TemplatePreview template={tpl} />
                  <p className="font-display font-bold text-sm mt-2 text-foreground">
                    {tpl.label}
                  </p>
                  <p className="text-xs text-foreground/50 italic mt-0.5 leading-tight">
                    {tpl.description}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TemplatePreview({ template }: { template: SectionTemplate }) {
  const { w: cols, h: rows, blocks } = template.preview;
  return (
    <div
      className="relative w-full bg-background/60 rounded-sm border border-border overflow-hidden"
      style={{ aspectRatio: `${cols}/${rows}` }}
    >
      {blocks.map((b, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${(b.x / cols) * 100}%`,
            top: `${(b.y / rows) * 100}%`,
            width: `${(b.w / cols) * 100}%`,
            height: `${(b.h / rows) * 100}%`,
            background:
              b.tone === "fg"
                ? "color-mix(in oklab, var(--foreground) 60%, transparent)"
                : b.tone === "accent"
                  ? "var(--accent)"
                  : "color-mix(in oklab, var(--foreground) 25%, transparent)",
          }}
        />
      ))}
    </div>
  );
}
