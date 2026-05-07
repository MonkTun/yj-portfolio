"use client";

import { useCallback, useEffect, useState } from "react";

import type {
  Page,
  Section,
  SectionBackground,
  Block,
  TextProps,
  ImageProps,
  VideoProps,
} from "@/lib/schema";
import { getYouTubeId } from "@/lib/youtube";
import { atomRegistry } from "@/lib/atom-registry";
import { cn } from "@/lib/utils";
import {
  imageFilterCss,
  imageFilterLabel,
  imageTintBgClass,
  imageTintLabel,
} from "@/components/atoms/imageStyles";
import type { Selection } from "./Editor";

const inputCls =
  "w-full bg-background border border-border rounded-sm px-3 py-2 text-foreground font-body text-sm focus:outline-none focus:border-accent transition-colors";

type Props = {
  page: Page;
  selection: Selection;
  onUpdateMeta: (meta: Page["meta"]) => void;
  onUpdateSection: (sectionId: string, patch: Partial<Section>) => void;
  onUpdateBlockProps: (
    sectionId: string,
    blockId: string,
    patch: Record<string, unknown>
  ) => void;
};

export function PropertiesPanel({
  page,
  selection,
  onUpdateMeta,
  onUpdateSection,
  onUpdateBlockProps,
}: Props) {
  if (selection.type === "page") {
    return <PageMeta page={page} onUpdate={onUpdateMeta} />;
  }
  if (selection.type === "section") {
    const section = page.sections.find((s) => s.id === selection.sectionId);
    if (!section) return <Hint>Section not found.</Hint>;
    return (
      <SectionProps
        section={section}
        onUpdate={(patch) => onUpdateSection(section.id, patch)}
      />
    );
  }
  // block
  const section = page.sections.find((s) => s.id === selection.sectionId);
  const block = section?.blocks.find((b) => b.id === selection.blockId);
  if (!section || !block) return <Hint>Block not found.</Hint>;
  return (
    <BlockProps
      block={block}
      onUpdate={(patch) =>
        onUpdateBlockProps(section.id, block.id, patch)
      }
    />
  );
}

/* ---------------- panels ---------------- */

function PageMeta({
  page,
  onUpdate,
}: {
  page: Page;
  onUpdate: (meta: Page["meta"]) => void;
}) {
  return (
    <div className="p-5 space-y-5">
      <SectionHead title="Page" subtitle="Meta" />
      <Field label="title">
        <input
          className={inputCls}
          value={page.meta.title}
          onChange={(e) =>
            onUpdate({ ...page.meta, title: e.target.value })
          }
        />
      </Field>
      <Field label="description">
        <textarea
          rows={3}
          className={inputCls}
          value={page.meta.description ?? ""}
          onChange={(e) =>
            onUpdate({ ...page.meta, description: e.target.value })
          }
        />
      </Field>
      <hr className="rule" />
      <Hint>
        Click any section or block on the canvas — its properties will appear
        here.
      </Hint>
    </div>
  );
}

function SectionProps({
  section,
  onUpdate,
}: {
  section: Section;
  onUpdate: (patch: Partial<Section>) => void;
}) {
  return (
    <div className="p-5 space-y-5">
      <SectionHead title="Section" subtitle={section.id} />

      <Field label="padding">
        <SegmentBar
          options={["none", "sm", "md", "lg", "xl"]}
          value={section.padding}
          onChange={(v) => onUpdate({ padding: v as Section["padding"] })}
        />
      </Field>
      <Field label="min height">
        <SegmentBar
          options={["auto", "half", "screen"]}
          value={section.minHeight}
          onChange={(v) => onUpdate({ minHeight: v as Section["minHeight"] })}
        />
      </Field>
      <Field label="vertical align">
        <SegmentBar
          options={["top", "center", "bottom"]}
          value={section.align}
          onChange={(v) => onUpdate({ align: v as Section["align"] })}
        />
      </Field>

      <hr className="rule" />

      <SectionHead title="Background" />
      <SectionBackgroundEditor
        bg={section.background}
        onChange={(background) => onUpdate({ background })}
      />
    </div>
  );
}

function BlockProps({
  block,
  onUpdate,
}: {
  block: Block;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const entry = atomRegistry[block.type];
  return (
    <div className="p-5 space-y-5">
      <SectionHead title={entry.label} subtitle={block.type} />

      {block.type === "text" && (
        <TextBlockProps
          props={block.props as TextProps}
          onUpdate={onUpdate}
        />
      )}
      {block.type === "image" && (
        <ImageBlockProps
          props={block.props as ImageProps}
          onUpdate={onUpdate}
        />
      )}
      {block.type === "button" && (
        <ButtonBlockProps
          props={
            block.props as Block["props"] & {
              label: string;
              href: string;
              variant: string;
              align: string;
            }
          }
          onUpdate={onUpdate}
        />
      )}
      {block.type === "spacer" && (
        <Field label="height (px)">
          <input
            type="number"
            className={inputCls}
            value={(block.props as { height: number }).height}
            onChange={(e) =>
              onUpdate({ height: parseInt(e.target.value, 10) || 0 })
            }
          />
        </Field>
      )}
      {block.type === "line" && (
        <>
          <Field label="thickness">
            <SegmentBar
              options={["1", "2"]}
              value={String(
                (block.props as { thickness: number }).thickness
              )}
              onChange={(v) =>
                onUpdate({ thickness: parseInt(v, 10) as 1 | 2 })
              }
            />
          </Field>
          <Field label="color">
            <SegmentBar
              options={["border", "foreground", "accent"]}
              value={(block.props as { color: string }).color}
              onChange={(v) => onUpdate({ color: v })}
            />
          </Field>
        </>
      )}
      {block.type === "video" && (
        <VideoBlockProps
          props={block.props as VideoProps}
          onUpdate={onUpdate}
        />
      )}
      {block.type === "quote" && (
        <>
          <Field label="quote">
            <textarea
              rows={4}
              className={inputCls}
              value={(block.props as { quote: string }).quote}
              onChange={(e) => onUpdate({ quote: e.target.value })}
            />
          </Field>
          <Field label="attribution">
            <input
              className={inputCls}
              value={
                (block.props as { attribution?: string }).attribution ?? ""
              }
              onChange={(e) => onUpdate({ attribution: e.target.value })}
            />
          </Field>
        </>
      )}

      <hr className="rule" />
      <Field label="layout">
        <p className="text-xs text-foreground/50 italic font-mono">
          col {block.layout.col}, span {block.layout.colSpan} · row{" "}
          {block.layout.row ?? "auto"}, span {block.layout.rowSpan ?? "auto"}
        </p>
        <p className="text-xs text-foreground/40 italic mt-1">
          Drag the block on the canvas to move; drag corner handles to resize.
        </p>
      </Field>
    </div>
  );
}

function TextBlockProps({
  props,
  onUpdate,
}: {
  props: TextProps;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="content (HTML)">
        <textarea
          rows={5}
          className={cn(inputCls, "font-mono text-xs")}
          value={props.content}
          onChange={(e) => onUpdate({ content: e.target.value })}
        />
      </Field>

      <Field label="inline format">
        <p className="text-xs text-foreground/40 italic mb-1.5">
          Select text in the canvas first, then click.
        </p>
        <div className="flex gap-1">
          <FormatBtn
            title="Bold (⌘B)"
            onApply={() => document.execCommand("bold")}
            label={<span className="font-bold">B</span>}
          />
          <FormatBtn
            title="Italic (⌘I)"
            onApply={() => document.execCommand("italic")}
            label={<span className="italic">I</span>}
          />
        </div>
      </Field>

      <Field label="variant">
        <SegmentBar
          options={["h1", "h2", "h3", "body", "caption", "kicker"]}
          value={props.variant}
          onChange={(v) => onUpdate({ variant: v })}
        />
      </Field>
      <Field label="align">
        <SegmentBar
          options={["left", "center", "right"]}
          value={props.align}
          onChange={(v) => onUpdate({ align: v })}
        />
      </Field>
      <Field label="color">
        <SegmentBar
          options={["foreground", "muted", "accent"]}
          value={props.color}
          onChange={(v) => onUpdate({ color: v })}
        />
      </Field>
      <Field label="case">
        <SegmentBar
          options={["none", "upper", "lower"]}
          labels={{ none: "Aa", upper: "AB", lower: "ab" }}
          value={props.transform ?? "none"}
          onChange={(v) => onUpdate({ transform: v })}
        />
      </Field>
      <Field label="font size (px) — overrides variant">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={8}
            max={512}
            placeholder="auto"
            className={inputCls}
            value={props.fontSize ?? ""}
            onChange={(e) => {
              const n = parseInt(e.target.value, 10);
              onUpdate({ fontSize: Number.isFinite(n) ? n : undefined });
            }}
          />
          {props.fontSize !== undefined && (
            <button
              type="button"
              onClick={() => onUpdate({ fontSize: undefined })}
              className="kicker text-foreground/50 hover:text-accent transition-colors px-2 py-1.5"
            >
              reset
            </button>
          )}
        </div>
      </Field>

      <Field label="line height (vertical gap) — overrides variant">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0.6}
            max={3}
            step={0.05}
            placeholder="auto"
            className={inputCls}
            value={props.lineHeight ?? ""}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              onUpdate({ lineHeight: Number.isFinite(n) ? n : undefined });
            }}
          />
          {props.lineHeight !== undefined && (
            <button
              type="button"
              onClick={() => onUpdate({ lineHeight: undefined })}
              className="kicker text-foreground/50 hover:text-accent transition-colors px-2 py-1.5"
            >
              reset
            </button>
          )}
        </div>
      </Field>

      <Field label="letter spacing (horizontal gap, em) — overrides variant">
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={-0.2}
            max={1}
            step={0.005}
            placeholder="auto"
            className={inputCls}
            value={props.letterSpacing ?? ""}
            onChange={(e) => {
              const n = parseFloat(e.target.value);
              onUpdate({ letterSpacing: Number.isFinite(n) ? n : undefined });
            }}
          />
          {props.letterSpacing !== undefined && (
            <button
              type="button"
              onClick={() => onUpdate({ letterSpacing: undefined })}
              className="kicker text-foreground/50 hover:text-accent transition-colors px-2 py-1.5"
            >
              reset
            </button>
          )}
        </div>
      </Field>
    </>
  );
}

/**
 * Click handler that doesn't steal focus from the contentEditable. We
 * preventDefault on mousedown so the editable stays focused (and its
 * selection survives), then run the formatting command on the click.
 */
function FormatBtn({
  title,
  onApply,
  label,
}: {
  title: string;
  onApply: () => void;
  label: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onApply}
      className="kicker px-3 py-2 rounded-sm bg-background/40 border border-border text-foreground hover:bg-foreground/10 hover:border-accent transition-colors min-w-10"
    >
      {label}
    </button>
  );
}

function ImageBlockProps({
  props,
  onUpdate,
}: {
  props: ImageProps;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  // Bumped after a successful upload so the library re-fetches and the
  // newly-uploaded image shows up at the top of the grid.
  const [libraryVersion, setLibraryVersion] = useState(0);
  const refreshLibrary = useCallback(
    () => setLibraryVersion((v) => v + 1),
    []
  );

  return (
    <>
      <Field label="upload">
        <ImageUploader
          src={props.src}
          onUploaded={(src) => {
            onUpdate({ src });
            refreshLibrary();
          }}
        />
      </Field>

      <Field label="library">
        <ImageLibrary
          version={libraryVersion}
          currentSrc={props.src}
          onPick={(src) => onUpdate({ src })}
        />
      </Field>

      <hr className="rule" />

      <Field label="alt text">
        <input
          className={inputCls}
          value={props.alt}
          onChange={(e) => onUpdate({ alt: e.target.value })}
        />
      </Field>

      <Field label="fit">
        <SegmentBar
          options={["cover", "contain"]}
          value={props.fit}
          onChange={(v) => onUpdate({ fit: v })}
        />
      </Field>

      <Field label="aspect ratio (CSS, optional)">
        <input
          className={cn(inputCls, "font-mono text-xs")}
          placeholder="4/5"
          value={props.aspect ?? ""}
          onChange={(e) => onUpdate({ aspect: e.target.value || undefined })}
        />
      </Field>

      <hr className="rule" />

      <Field label={`corner radius — ${props.radius}px`}>
        <input
          type="range"
          min={0}
          max={120}
          step={1}
          value={props.radius}
          onChange={(e) =>
            onUpdate({ radius: parseInt(e.target.value, 10) || 0 })
          }
          className="w-full accent-accent"
        />
      </Field>

      <ImageEffects
        src={props.src}
        aspect={props.aspect}
        fit={props.fit}
        filter={props.filter}
        focalX={props.focalX}
        focalY={props.focalY}
        rotate={props.rotate}
        flipX={props.flipX}
        flipY={props.flipY}
        blur={props.blur}
        tint={props.tint}
        tintOpacity={props.tintOpacity}
        onChange={onUpdate}
      />

      <Field label="background">
        <RemoveBgButton
          src={props.src}
          onResult={(src) => {
            onUpdate({ src });
            refreshLibrary();
          }}
        />
      </Field>

      <hr className="rule" />

      <Field label="link href (optional)">
        <input
          className={cn(inputCls, "font-mono text-xs")}
          value={props.href ?? ""}
          onChange={(e) => onUpdate({ href: e.target.value || undefined })}
        />
      </Field>

      <Field label="src (manual path)">
        <input
          className={cn(inputCls, "font-mono text-xs")}
          placeholder="/uploads/foo.jpg"
          value={props.src}
          onChange={(e) => onUpdate({ src: e.target.value })}
        />
      </Field>
    </>
  );
}

/* ---------------- image library ---------------- */

type LibraryItem = { src: string; name: string; size: number; mtime: number };

function ImageLibrary({
  version,
  currentSrc,
  onPick,
}: {
  version: number;
  currentSrc: string;
  onPick: (src: string) => void;
}) {
  const [items, setItems] = useState<LibraryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/admin/uploads")
      .then(async (res) => {
        if (!res.ok) throw new Error(`List failed (${res.status})`);
        const j = (await res.json()) as { items: LibraryItem[] };
        if (!cancelled) setItems(j.items);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  if (error) return <p className="text-xs text-accent italic">{error}</p>;
  if (items === null) {
    return <p className="text-xs text-foreground/40 italic">Loading…</p>;
  }
  if (items.length === 0) {
    return (
      <p className="text-xs text-foreground/40 italic">
        Nothing uploaded yet. Drop an image above.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1.5 max-h-60 overflow-y-auto pr-1">
      {items.map((item) => {
        const selected = item.src === currentSrc;
        return (
          <button
            key={item.src}
            type="button"
            title={item.name}
            onClick={() => onPick(item.src)}
            className={cn(
              "group relative aspect-square overflow-hidden rounded-sm border transition-colors",
              selected
                ? "border-accent ring-2 ring-accent"
                : "border-border hover:border-foreground/40"
            )}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- filter preset picker ---------------- */

function FilterPicker({
  src,
  value,
  onChange,
}: {
  src: string;
  value: ImageProps["filter"];
  onChange: (v: ImageProps["filter"]) => void;
}) {
  const filters = Object.keys(imageFilterCss) as ImageProps["filter"][];
  return (
    <div className="grid grid-cols-4 gap-1.5">
      {filters.map((f) => {
        const selected = f === value;
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className={cn(
              "group flex flex-col items-center gap-1 p-1 rounded-sm transition-colors",
              selected
                ? "bg-accent/15"
                : "hover:bg-foreground/5"
            )}
          >
            <span
              className={cn(
                "block aspect-square w-full overflow-hidden rounded-sm border bg-surface",
                selected ? "border-accent" : "border-border"
              )}
            >
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ filter: imageFilterCss[f] }}
                />
              ) : null}
            </span>
            <span
              className={cn(
                "kicker text-[10px]",
                selected ? "text-accent" : "text-foreground/60"
              )}
            >
              {imageFilterLabel[f]}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------------- focal point picker ---------------- */

function FocalPointPicker({
  src,
  aspect,
  fit,
  x,
  y,
  onChange,
}: {
  src: string;
  aspect?: string;
  fit: ImageProps["fit"];
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  function handle(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    onChange(
      Math.round(Math.max(0, Math.min(100, px))),
      Math.round(Math.max(0, Math.min(100, py)))
    );
  }

  return (
    <div className="space-y-2">
      <div
        onClick={handle}
        onMouseMove={(e) => {
          if (e.buttons === 1) handle(e);
        }}
        className="relative w-full overflow-hidden rounded-sm border border-border cursor-crosshair bg-surface select-none"
        style={{ aspectRatio: aspect || "4/3" }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            draggable={false}
            className={cn(
              "absolute inset-0 h-full w-full pointer-events-none",
              fit === "cover" ? "object-cover" : "object-contain"
            )}
            style={{ objectPosition: `${x}% ${y}%` }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-foreground/30 italic kicker">
            No image
          </div>
        )}
        {src && (
          <div
            aria-hidden
            className="absolute h-4 w-4 rounded-full border-2 border-accent bg-background/40 pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow"
            style={{ left: `${x}%`, top: `${y}%` }}
          />
        )}
      </div>
      <p className="text-xs text-foreground/40 italic font-mono">
        {x}%, {y}%
      </p>
    </div>
  );
}

/* ---------------- shared image effects (filter/rotate/flip/focal) ---------------- */

/**
 * Bundle of non-destructive image effects shared by the Image block atom
 * and the section image-background editor. Stays decoupled from the parent
 * schema by patching only the keys it owns.
 */
function ImageEffects({
  src,
  aspect,
  fit,
  filter,
  focalX,
  focalY,
  rotate,
  flipX,
  flipY,
  blur,
  tint,
  tintOpacity,
  onChange,
}: {
  src: string;
  aspect?: string;
  fit: ImageProps["fit"];
  filter: ImageProps["filter"];
  focalX: number;
  focalY: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  blur: number;
  tint: ImageProps["tint"];
  tintOpacity: number;
  onChange: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="filter">
        <FilterPicker
          src={src}
          value={filter}
          onChange={(v) => onChange({ filter: v })}
        />
      </Field>

      <Field label={`rotate — ${rotate}°`}>
        <input
          type="range"
          min={-180}
          max={180}
          step={1}
          value={rotate}
          onChange={(e) =>
            onChange({ rotate: parseInt(e.target.value, 10) || 0 })
          }
          className="w-full accent-accent"
        />
        <div className="flex gap-1 mt-2">
          {[-90, 0, 90, 180].map((deg) => (
            <button
              key={deg}
              type="button"
              onClick={() => onChange({ rotate: deg })}
              className={cn(
                "kicker flex-1 px-2 py-1.5 rounded-sm transition-colors",
                rotate === deg
                  ? "bg-accent text-accent-foreground"
                  : "bg-background/40 border border-border text-foreground hover:bg-foreground/10"
              )}
            >
              {deg}°
            </button>
          ))}
        </div>
      </Field>

      <Field label="flip">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onChange({ flipX: !flipX })}
            className={cn(
              "kicker flex-1 px-2 py-1.5 rounded-sm transition-colors",
              flipX
                ? "bg-accent text-accent-foreground"
                : "bg-background/40 border border-border text-foreground hover:bg-foreground/10"
            )}
          >
            Flip horizontal
          </button>
          <button
            type="button"
            onClick={() => onChange({ flipY: !flipY })}
            className={cn(
              "kicker flex-1 px-2 py-1.5 rounded-sm transition-colors",
              flipY
                ? "bg-accent text-accent-foreground"
                : "bg-background/40 border border-border text-foreground hover:bg-foreground/10"
            )}
          >
            Flip vertical
          </button>
        </div>
      </Field>

      <Field label={`blur — ${blur}px`}>
        <input
          type="range"
          min={0}
          max={50}
          step={1}
          value={blur}
          onChange={(e) =>
            onChange({ blur: parseInt(e.target.value, 10) || 0 })
          }
          className="w-full accent-accent"
        />
      </Field>

      <Field label="tint">
        <TintPicker
          tint={tint}
          opacity={tintOpacity}
          onChange={(patch) => onChange(patch)}
        />
      </Field>

      <Field label="focal point (drag to recenter the crop)">
        <FocalPointPicker
          src={src}
          aspect={aspect}
          fit={fit}
          x={focalX}
          y={focalY}
          onChange={(fx, fy) => onChange({ focalX: fx, focalY: fy })}
        />
      </Field>
    </>
  );
}

function TintPicker({
  tint,
  opacity,
  onChange,
}: {
  tint: ImageProps["tint"];
  opacity: number;
  onChange: (patch: { tint?: ImageProps["tint"]; tintOpacity?: number }) => void;
}) {
  const tints = Object.keys(imageTintBgClass) as ImageProps["tint"][];
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-1.5">
        {tints.map((t) => {
          const selected = t === tint;
          const bg = imageTintBgClass[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                // Picking a non-"none" tint while opacity is 0 has no visible
                // effect — bump it to a sensible default so the user sees
                // something happen.
                const nextOpacity =
                  t !== "none" && opacity === 0 ? 40 : opacity;
                onChange({ tint: t, tintOpacity: nextOpacity });
              }}
              className={cn(
                "group flex flex-col items-center gap-1 p-1 rounded-sm transition-colors",
                selected ? "bg-accent/15" : "hover:bg-foreground/5"
              )}
            >
              <span
                className={cn(
                  "block aspect-square w-full rounded-sm border",
                  selected ? "border-accent" : "border-border",
                  bg ?? "",
                  // Show a dashed empty swatch for the "none" option.
                  !bg &&
                    "bg-transparent bg-[linear-gradient(135deg,transparent_45%,var(--border)_45%,var(--border)_55%,transparent_55%)]"
                )}
              />
              <span
                className={cn(
                  "kicker text-[10px]",
                  selected ? "text-accent" : "text-foreground/60"
                )}
              >
                {imageTintLabel[t]}
              </span>
            </button>
          );
        })}
      </div>
      {tint !== "none" && (
        <label className="block">
          <span className="kicker text-foreground/60 mb-1 block">
            opacity — {opacity}%
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={opacity}
            onChange={(e) =>
              onChange({ tintOpacity: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full accent-accent"
          />
        </label>
      )}
    </div>
  );
}

/* ---------------- section background editor ---------------- */

const BG_TYPE_OPTIONS = [
  { id: "transparent", label: "None" },
  { id: "color-bg", label: "Page" },
  { id: "color-surface", label: "Surface" },
  { id: "color-accent", label: "Accent" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
] as const;

function bgIdOf(bg: SectionBackground): string {
  if (bg.type === "transparent") return "transparent";
  if (bg.type === "color") return `color-${bg.token}`;
  if (bg.type === "image") return "image";
  return "video";
}

function SectionBackgroundEditor({
  bg,
  onChange,
}: {
  bg: SectionBackground;
  onChange: (next: SectionBackground) => void;
}) {
  const [libraryVersion, setLibraryVersion] = useState(0);
  const refreshLibrary = useCallback(
    () => setLibraryVersion((v) => v + 1),
    []
  );
  const currentId = bgIdOf(bg);

  function setType(id: string) {
    if (id === "transparent") return onChange({ type: "transparent" });
    if (id === "color-bg")
      return onChange({ type: "color", token: "background" });
    if (id === "color-surface")
      return onChange({ type: "color", token: "surface" });
    if (id === "color-accent")
      return onChange({ type: "color", token: "accent" });
    if (id === "image") {
      // Preserve src/effects if we already had an image bg.
      if (bg.type === "image") return onChange(bg);
      return onChange({
        type: "image",
        src: "",
        overlay: 0,
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
    if (id === "video") {
      if (bg.type === "video") return onChange(bg);
      return onChange({
        type: "video",
        url: "",
        overlay: 40,
        muted: true,
        loop: true,
        tint: "none",
        tintOpacity: 0,
      });
    }
  }

  return (
    <div className="space-y-4">
      <Field label="type">
        <SegmentBar
          options={BG_TYPE_OPTIONS.map((o) => o.id)}
          labels={Object.fromEntries(
            BG_TYPE_OPTIONS.map((o) => [o.id, o.label])
          )}
          value={currentId}
          onChange={setType}
        />
      </Field>

      {bg.type === "image" && (
        <>
          <Field label="upload">
            <ImageUploader
              src={bg.src}
              onUploaded={(src) => {
                onChange({ ...bg, src });
                refreshLibrary();
              }}
            />
          </Field>

          <Field label="library">
            <ImageLibrary
              version={libraryVersion}
              currentSrc={bg.src}
              onPick={(src) => onChange({ ...bg, src })}
            />
          </Field>

          <ImageEffects
            src={bg.src}
            // No aspect lock — the section's own dimensions drive the frame.
            fit="cover"
            filter={bg.filter}
            focalX={bg.focalX}
            focalY={bg.focalY}
            rotate={bg.rotate}
            flipX={bg.flipX}
            flipY={bg.flipY}
            blur={bg.blur}
            tint={bg.tint}
            tintOpacity={bg.tintOpacity}
            onChange={(patch) => onChange({ ...bg, ...patch } as SectionBackground)}
          />

          <Field label={`overlay — ${bg.overlay}%`}>
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={bg.overlay}
              onChange={(e) =>
                onChange({
                  ...bg,
                  overlay: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full accent-accent"
            />
            <p className="text-xs text-foreground/40 italic">
              Darkens the image so foreground text stays readable.
            </p>
          </Field>

          <Field label="remove background">
            <RemoveBgButton
              src={bg.src}
              onResult={(src) => {
                onChange({ ...bg, src });
                refreshLibrary();
              }}
            />
          </Field>
        </>
      )}

      {bg.type === "video" && (
        <>
          <Field label="YouTube URL">
            <input
              className={cn(inputCls, "font-mono text-xs")}
              placeholder="https://www.youtube.com/watch?v=..."
              value={bg.url}
              onChange={(e) => onChange({ ...bg, url: e.target.value })}
            />
            <p
              className={cn(
                "text-xs mt-1 italic",
                bg.url && !getYouTubeId(bg.url)
                  ? "text-accent"
                  : "text-foreground/40"
              )}
            >
              {!bg.url
                ? "Paste any YouTube link — watch / youtu.be / shorts / embed."
                : getYouTubeId(bg.url)
                  ? `Detected id: ${getYouTubeId(bg.url)}`
                  : "Couldn't parse a video id from this URL."}
            </p>
          </Field>

          <Field label="playback">
            <div className="grid grid-cols-2 gap-1">
              <ToggleBtn
                label="Muted"
                active={bg.muted}
                onToggle={() => onChange({ ...bg, muted: !bg.muted })}
              />
              <ToggleBtn
                label="Loop"
                active={bg.loop}
                onToggle={() => onChange({ ...bg, loop: !bg.loop })}
              />
            </div>
            <p className="text-xs text-foreground/40 italic mt-1.5">
              Background videos always autoplay without controls. Browsers
              block autoplay unless muted — leave Muted on.
            </p>
          </Field>

          <Field label="start time (seconds)">
            <input
              type="number"
              min={0}
              placeholder="0"
              className={inputCls}
              value={bg.start ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                onChange({
                  ...bg,
                  start: Number.isFinite(n) && n > 0 ? n : undefined,
                });
              }}
            />
          </Field>

          <Field label={`overlay — ${bg.overlay}%`}>
            <input
              type="range"
              min={0}
              max={90}
              step={1}
              value={bg.overlay}
              onChange={(e) =>
                onChange({
                  ...bg,
                  overlay: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full accent-accent"
            />
            <p className="text-xs text-foreground/40 italic">
              Darkens the video so foreground text stays readable.
            </p>
          </Field>

          <Field label="tint">
            <TintPicker
              tint={bg.tint}
              opacity={bg.tintOpacity}
              onChange={(patch) =>
                onChange({
                  ...bg,
                  ...(patch.tint !== undefined ? { tint: patch.tint } : {}),
                  ...(patch.tintOpacity !== undefined
                    ? { tintOpacity: patch.tintOpacity }
                    : {}),
                })
              }
            />
          </Field>
        </>
      )}
    </div>
  );
}

/* ---------------- background removal ---------------- */

/**
 * Runs @imgly/background-removal locally in the browser. Heavy on first
 * use — the model files (~80 MB) are downloaded on demand and cached by
 * the browser. The result is a PNG with transparency, uploaded back into
 * /public/uploads/ so it shows up in the library like any other asset.
 */
function RemoveBgButton({
  src,
  onResult,
}: {
  src: string;
  onResult: (src: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle() {
    if (!src || busy) return;
    setBusy(true);
    setError(null);
    setStatus("Fetching image…");
    try {
      // Fetch the source ourselves rather than letting @imgly do it. The
      // library's internal fetcher chokes on Next's HTML response when a
      // path doesn't resolve cleanly ("Invalid format: text/html"), and
      // doing it here means we surface a real HTTP error instead.
      const imgRes = await fetch(src);
      if (!imgRes.ok) {
        throw new Error(`Image fetch failed (${imgRes.status}) for ${src}`);
      }
      const ct = imgRes.headers.get("content-type") ?? "";
      if (!ct.startsWith("image/")) {
        throw new Error(
          `Source returned ${ct || "no content-type"} — expected image/*`
        );
      }
      const inputBlob = await imgRes.blob();
      setStatus("Loading model…");
      const mod = await import("@imgly/background-removal");
      const blob = await mod.removeBackground(inputBlob, {
        progress: (key: string, current: number, total: number) => {
          const pct = total ? Math.round((current / total) * 100) : 0;
          setStatus(`${key} ${pct}%`);
        },
      });
      setStatus("Uploading…");
      const stem =
        src
          .split("/")
          .pop()
          ?.replace(/\.[^.]+$/, "") ?? "image";
      const file = new File([blob], `${stem}-no-bg.png`, {
        type: "image/png",
      });
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Upload failed (${res.status}): ${text.slice(0, 120)}`);
      }
      const j = (await res.json()) as { src: string };
      onResult(j.src);
      setStatus(null);
    } catch (err) {
      console.error("[RemoveBg] failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        disabled={!src || busy}
        onClick={handle}
        className="kicker w-full px-3 py-2 rounded-sm bg-background/40 border border-border text-foreground hover:bg-foreground/10 hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? (status ?? "Working…") : "Remove background"}
      </button>
      {error && <p className="text-xs text-accent italic break-all">{error}</p>}
      <p className="text-xs text-foreground/40 italic">
        Saves a transparent-PNG copy and selects it. First run downloads
        ~80 MB of model files; subsequent runs are cached.
      </p>
    </div>
  );
}

/**
 * Click-to-pick + drag-and-drop image uploader. Posts to /api/admin/upload
 * which copies the file into public/uploads/ and returns its URL. Dev-only
 * (the API route 404s in production).
 */
function ImageUploader({
  src,
  onUploaded,
}: {
  src: string;
  onUploaded: (src: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const text = await res.text();
      let payload: { src?: string; error?: string } = {};
      try {
        payload = text ? JSON.parse(text) : {};
      } catch {
        // Non-JSON response — keep `text` for the error message.
      }
      if (!res.ok || !payload.src) {
        throw new Error(
          payload.error ??
            `Upload failed (${res.status}${text ? `: ${text.slice(0, 120)}` : ""})`
        );
      }
      onUploaded(payload.src);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[ImageUploader] upload failed:", err);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    void uploadFile(files[0]);
  }

  // The whole control is a <label>, which natively forwards clicks to its
  // contained file input — no JS .click() needed, so no risk of stacking
  // two OS pickers.
  return (
    <div className="space-y-2">
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "relative flex flex-col items-center justify-center rounded-sm border-2 border-dashed cursor-pointer transition-colors text-center px-3 py-6 select-none",
          dragging
            ? "border-accent bg-accent/10"
            : "border-border bg-background/40 hover:border-foreground/40"
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt=""
            className="max-h-32 max-w-full object-contain rounded-sm pointer-events-none"
          />
        ) : (
          <span className="kicker text-foreground/60 pointer-events-none">
            No image yet
          </span>
        )}
        <span className="mt-2 text-xs text-foreground/60 italic pointer-events-none">
          {busy
            ? "Uploading…"
            : dragging
              ? "Drop to upload"
              : "Click to choose, or drag a file here"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => {
            handleFiles(e.target.files);
            // Allow re-picking the same file later.
            e.target.value = "";
          }}
        />
      </label>
      {error && (
        <p className="text-xs text-accent italic break-all">{error}</p>
      )}
    </div>
  );
}

/* ---------------- video ---------------- */

function VideoBlockProps({
  props,
  onUpdate,
}: {
  props: VideoProps;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const id = getYouTubeId(props.url);
  return (
    <>
      <Field label="YouTube URL or video id">
        <input
          className={cn(inputCls, "font-mono text-xs")}
          placeholder="https://www.youtube.com/watch?v=..."
          value={props.url}
          onChange={(e) => onUpdate({ url: e.target.value })}
        />
        <p
          className={cn(
            "text-xs mt-1 italic",
            props.url && !id ? "text-accent" : "text-foreground/40"
          )}
        >
          {!props.url
            ? "Paste any YouTube link — watch / youtu.be / shorts / embed."
            : id
              ? `Detected id: ${id}`
              : "Couldn't parse a video id from this URL."}
        </p>
      </Field>

      <Field label="aspect ratio (CSS)">
        <input
          className={cn(inputCls, "font-mono text-xs")}
          placeholder="16/9"
          value={props.aspect}
          onChange={(e) => onUpdate({ aspect: e.target.value || "16/9" })}
        />
      </Field>

      <Field label={`corner radius — ${props.radius}px`}>
        <input
          type="range"
          min={0}
          max={120}
          step={1}
          value={props.radius}
          onChange={(e) =>
            onUpdate({ radius: parseInt(e.target.value, 10) || 0 })
          }
          className="w-full accent-accent"
        />
      </Field>

      <Field label="playback">
        <div className="grid grid-cols-2 gap-1">
          <ToggleBtn
            label="Autoplay"
            active={props.autoplay}
            onToggle={() => onUpdate({ autoplay: !props.autoplay })}
          />
          <ToggleBtn
            label="Muted"
            active={props.muted}
            onToggle={() => onUpdate({ muted: !props.muted })}
          />
          <ToggleBtn
            label="Loop"
            active={props.loop}
            onToggle={() => onUpdate({ loop: !props.loop })}
          />
          <ToggleBtn
            label="Controls"
            active={props.controls}
            onToggle={() => onUpdate({ controls: !props.controls })}
          />
        </div>
        <p className="text-xs text-foreground/40 italic mt-1.5">
          Browsers block autoplay unless muted.
        </p>
      </Field>

      <Field label="start time (seconds)">
        <input
          type="number"
          min={0}
          placeholder="0"
          className={inputCls}
          value={props.start ?? ""}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onUpdate({ start: Number.isFinite(n) && n > 0 ? n : undefined });
          }}
        />
      </Field>
    </>
  );
}

function ToggleBtn({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "kicker px-2 py-2 rounded-sm transition-colors",
        active
          ? "bg-accent text-accent-foreground"
          : "bg-background/40 border border-border text-foreground hover:bg-foreground/10"
      )}
    >
      {label}
    </button>
  );
}

function ButtonBlockProps({
  props,
  onUpdate,
}: {
  props: { label: string; href: string; variant: string; align: string };
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  return (
    <>
      <Field label="label">
        <input
          className={inputCls}
          value={props.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </Field>
      <Field label="href">
        <input
          className={cn(inputCls, "font-mono text-xs")}
          value={props.href}
          onChange={(e) => onUpdate({ href: e.target.value })}
        />
      </Field>
      <Field label="variant">
        <SegmentBar
          options={["primary", "ghost"]}
          value={props.variant}
          onChange={(v) => onUpdate({ variant: v })}
        />
      </Field>
      <Field label="align">
        <SegmentBar
          options={["left", "center", "right"]}
          value={props.align}
          onChange={(v) => onUpdate({ align: v })}
        />
      </Field>
    </>
  );
}

/* ---------------- shared bits ---------------- */

function SectionHead({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <header>
      {subtitle && <p className="kicker">{subtitle}</p>}
      <h2 className="font-display font-bold text-2xl mt-1">{title}</h2>
    </header>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="kicker block mb-1.5">{label}</span>
      {children}
    </label>
  );
}

function SegmentBar({
  options,
  value,
  onChange,
  labels,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  /** Optional display labels keyed by option value. */
  labels?: Record<string, string>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "kicker px-2 py-1.5 rounded-sm transition-colors",
            value === opt
              ? "bg-accent text-accent-foreground"
              : "bg-background/40 border border-border text-foreground hover:bg-foreground/10"
          )}
        >
          {labels?.[opt] ?? opt}
        </button>
      ))}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-foreground/50 italic text-sm">{children}</p>;
}
