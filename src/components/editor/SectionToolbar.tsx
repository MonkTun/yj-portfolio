"use client";

import { useState, useRef, useEffect } from "react";
import type {
  Section,
  SectionAlign,
  SectionBackground,
  SectionPadding,
} from "@/lib/schema";
import { cn } from "@/lib/utils";
import {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignTopIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  DupeIcon,
  PaddingIcon,
  PaintIcon,
  TrashIcon,
} from "./icons";

type Props = {
  section: Section;
  /** When true, force the toolbar visible (the section is selected).
   *  When false, the toolbar is opacity-0 unless the section is hovered
   *  (via the `group/section` parent). */
  active: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onUpdate: (patch: Partial<Section>) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
};

const PADDING_VALUES: SectionPadding[] = ["none", "sm", "md", "lg", "xl"];
const ALIGN_VALUES: Array<{ value: SectionAlign; icon: React.ReactNode }> = [
  { value: "top", icon: <AlignTopIcon /> },
  { value: "center", icon: <AlignCenterIcon /> },
  { value: "bottom", icon: <AlignBottomIcon /> },
];

export function SectionToolbar({
  section,
  active,
  canMoveUp,
  canMoveDown,
  onUpdate,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        "absolute top-3 right-3 z-30 flex items-stretch gap-0.5 transition-opacity duration-200 pointer-events-auto",
        active
          ? "opacity-100"
          : "opacity-0 group-hover/section:opacity-100"
      )}
    >
      <Label>Section</Label>

      <Popover
        title="Background"
        icon={<PaintIcon />}
        body={
          <BackgroundPicker
            value={section.background}
            onChange={(background) => onUpdate({ background })}
          />
        }
      />

      <Popover
        title="Padding"
        icon={<PaddingIcon />}
        body={
          <SegmentedGroup
            label="Padding"
            options={PADDING_VALUES.map((p) => ({
              value: p,
              label: p.toUpperCase(),
            }))}
            value={section.padding}
            onChange={(v) => onUpdate({ padding: v as SectionPadding })}
          />
        }
      />

      <Popover
        title="Align"
        icon={<AlignCenterIcon />}
        body={
          <SegmentedGroup
            label="Vertical align"
            options={ALIGN_VALUES.map((a) => ({
              value: a.value,
              label: a.value,
              icon: a.icon,
            }))}
            value={section.align}
            onChange={(v) => onUpdate({ align: v as SectionAlign })}
          />
        }
      />

      <Divider />

      <ToolBtn title="Move up" onClick={onMoveUp} disabled={!canMoveUp}>
        <ArrowUpIcon />
      </ToolBtn>
      <ToolBtn title="Move down" onClick={onMoveDown} disabled={!canMoveDown}>
        <ArrowDownIcon />
      </ToolBtn>
      <ToolBtn title="Duplicate" onClick={onDuplicate}>
        <DupeIcon />
      </ToolBtn>
      <ToolBtn title="Delete" onClick={onDelete} danger>
        <TrashIcon />
      </ToolBtn>
    </div>
  );
}

/* ---------------- shared bits ---------------- */

function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="kicker glass-strong rounded-sm px-2.5 flex items-center text-foreground/85">
      {children}
    </span>
  );
}

function Divider() {
  return <span aria-hidden className="w-px self-stretch bg-foreground/10 mx-0.5" />;
}

function ToolBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title?: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "glass-strong rounded-sm h-8 w-8 flex items-center justify-center transition-colors",
        disabled
          ? "text-foreground/25 cursor-not-allowed"
          : danger
            ? "text-foreground/85 hover:text-accent"
            : "text-foreground/85 hover:text-accent"
      )}
    >
      {children}
    </button>
  );
}

function Popover({
  title,
  icon,
  body,
}: {
  title: string;
  icon: React.ReactNode;
  body: React.ReactNode;
}) {
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
    <div ref={ref} className="relative">
      <ToolBtn title={title} onClick={() => setOpen((o) => !o)}>
        {icon}
      </ToolBtn>
      {open && (
        <div className="absolute top-full right-0 mt-2 z-40 glass-strong rounded-md p-3 min-w-[14rem] shadow-2xl">
          <p className="kicker mb-2">{title}</p>
          {body}
        </div>
      )}
    </div>
  );
}

function SegmentedGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string; icon?: React.ReactNode }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            "kicker px-2 py-2 rounded-sm transition-colors flex items-center justify-center gap-1",
            value === opt.value
              ? "bg-accent text-accent-foreground"
              : "bg-background/40 text-foreground hover:bg-foreground/10"
          )}
        >
          {opt.icon}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------- background picker ---------------- */

function BackgroundPicker({
  value,
  onChange,
}: {
  value: SectionBackground;
  onChange: (bg: SectionBackground) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1">
        <BgSwatch
          active={value.type === "transparent"}
          onClick={() => onChange({ type: "transparent" })}
          label="None"
          style={{ background: "transparent", border: "1px dashed var(--border)" }}
        />
        <BgSwatch
          active={value.type === "color" && value.token === "surface"}
          onClick={() => onChange({ type: "color", token: "surface" })}
          label="Surface"
          style={{ background: "var(--surface)" }}
        />
        <BgSwatch
          active={value.type === "color" && value.token === "accent"}
          onClick={() => onChange({ type: "color", token: "accent" })}
          label="Accent"
          style={{ background: "var(--accent)" }}
          labelClassName="text-accent-foreground"
        />
      </div>
      <label className="block">
        <span className="kicker block mb-1">Image URL</span>
        <input
          type="text"
          placeholder="/uploads/foo.jpg"
          value={value.type === "image" ? value.src : ""}
          onChange={(e) => {
            const src = e.target.value;
            if (!src) return;
            // Preserve any existing image effects when only the src changes;
            // otherwise seed with sane defaults so the schema validates.
            if (value.type === "image") {
              onChange({ ...value, src });
            } else {
              onChange({
                type: "image",
                src,
                overlay: 30,
                filter: "none",
                focalX: 50,
                focalY: 50,
                rotate: 0,
                flipX: false,
                flipY: false,
                blur: 0,
                tint: "none",
                tintOpacity: 0,
              });
            }
          }}
          className="w-full bg-background border border-border rounded-sm px-2 py-1.5 text-sm font-mono outline-none focus:border-accent"
        />
      </label>
      <p className="kicker text-foreground/40 italic">
        Full effects editor (filter, focal point, rotate, flip…) lives in the
        right-side panel.
      </p>
      {value.type === "image" && (
        <label className="block">
          <span className="kicker block mb-1">
            Overlay {value.overlay}%
          </span>
          <input
            type="range"
            min={0}
            max={80}
            value={value.overlay}
            onChange={(e) =>
              onChange({ ...value, overlay: parseInt(e.target.value, 10) })
            }
            className="w-full accent-accent"
          />
        </label>
      )}
    </div>
  );
}

function BgSwatch({
  active,
  onClick,
  label,
  style,
  labelClassName = "text-foreground/85",
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  style: React.CSSProperties;
  labelClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-12 rounded-sm flex items-end justify-start p-1 transition-all",
        active ? "ring-2 ring-accent" : "ring-1 ring-border hover:ring-foreground/40"
      )}
      style={style}
    >
      <span className={cn("kicker", labelClassName)}>{label}</span>
    </button>
  );
}
