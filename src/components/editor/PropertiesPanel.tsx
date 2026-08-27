"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type {
  Page,
  Section,
  SectionBackground,
  Block,
  TextProps,
  ImageProps,
  VideoProps,
  ProjectCarouselProps,
  CarouselItem,
  SocialLinksProps,
  SocialLinkItem,
  SocialPlatform,
} from "@/lib/schema";
import {
  CAROUSEL_ITEM_EFFECT_DEFAULTS,
  socialPlatformSchema,
} from "@/lib/schema";
import { SOCIAL_PLATFORM_LABELS } from "@/components/atoms/SocialLinks";
import { getYouTubeId } from "@/lib/youtube";
import { downscaleImage } from "@/lib/downscale-image";
import { UPLOAD_MAX_BYTES, UPLOAD_MAX_MB } from "@/lib/upload-limits";
import { atomRegistry } from "@/lib/atom-registry";
import { cn } from "@/lib/utils";
import {
  imageFilterCss,
  imageFilterLabel,
  imageTintBgClass,
  imageTintLabel,
} from "@/components/atoms/imageStyles";
import {
  hasMobileOverrides,
  mergeBlockForMobile,
  type Device,
} from "@/lib/responsive";
import { isMobileOverridable } from "@/lib/mobile-overrides";
import type { Selection } from "./Editor";

const inputCls =
  "w-full bg-background border border-border rounded-sm px-3 py-2 text-foreground font-body text-sm focus:outline-none focus:border-accent transition-colors";

type Props = {
  page: Page;
  selection: Selection;
  device: Device;
  /** All page slugs in the project — feeds the Button block's link picker. */
  availablePages?: string[];
  /** The slug currently being edited; excluded from the picker. */
  currentSlug?: string;
  onUpdateMeta: (meta: Page["meta"]) => void;
  onUpdateSection: (sectionId: string, patch: Partial<Section>) => void;
  onUpdateSectionMobile: (
    sectionId: string,
    patch: {
      padding?: Section["padding"] | undefined;
      minHeight?: Section["minHeight"] | undefined;
      align?: Section["align"] | undefined;
    },
  ) => void;
  onUpdateBlockProps: (
    sectionId: string,
    blockId: string,
    patch: Record<string, unknown>,
  ) => void;
  onSetBlockBleed: (
    sectionId: string,
    blockId: string,
    bleed: Block["layout"]["bleed"],
  ) => void;
  onSetBlockMobileHidden: (
    sectionId: string,
    blockId: string,
    hidden: boolean,
  ) => void;
  onClearBlockMobileOverrides: (sectionId: string, blockId: string) => void;
  /** Duplicate several blocks at once (multi-select). */
  onDuplicateBlocks: (sectionId: string, blockIds: string[]) => void;
  /** Delete several blocks at once (multi-select). */
  onDeleteBlocks: (sectionId: string, blockIds: string[]) => void;
};

export function PropertiesPanel({
  page,
  selection,
  device,
  availablePages = [],
  currentSlug,
  onUpdateMeta,
  onUpdateSection,
  onUpdateSectionMobile,
  onUpdateBlockProps,
  onSetBlockBleed,
  onSetBlockMobileHidden,
  onClearBlockMobileOverrides,
  onDuplicateBlocks,
  onDeleteBlocks,
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
        device={device}
        onUpdate={(patch) => onUpdateSection(section.id, patch)}
        onUpdateMobile={(patch) =>
          onUpdateSectionMobile(section.id, patch)
        }
      />
    );
  }
  const section = page.sections.find((s) => s.id === selection.sectionId);
  const block = section?.blocks.find((b) => b.id === selection.blockId);
  if (!section || !block) return <Hint>Block not found.</Hint>;
  if (selection.blockIds.length > 1) {
    return (
      <MultiBlockProps
        section={section}
        blockIds={selection.blockIds}
        onDuplicate={() => onDuplicateBlocks(section.id, selection.blockIds)}
        onDelete={() => onDeleteBlocks(section.id, selection.blockIds)}
      />
    );
  }
  return (
    <BlockProps
      block={block}
      device={device}
      availablePages={availablePages}
      currentSlug={currentSlug}
      onUpdate={(patch) =>
        onUpdateBlockProps(section.id, block.id, patch)
      }
      onSetBleed={(bleed) => onSetBlockBleed(section.id, block.id, bleed)}
      onSetMobileHidden={(hidden) =>
        onSetBlockMobileHidden(section.id, block.id, hidden)
      }
      onClearMobileOverrides={() =>
        onClearBlockMobileOverrides(section.id, block.id)
      }
    />
  );
}

/* ============================================================
   Multi-select — summary + bulk actions
   ============================================================ */

function MultiBlockProps({
  section,
  blockIds,
  onDuplicate,
  onDelete,
}: {
  section: Section;
  blockIds: string[];
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  // Count each block type in the selection for a quick readout.
  const counts = new Map<string, number>();
  for (const id of blockIds) {
    const b = section.blocks.find((bl) => bl.id === id);
    if (!b) continue;
    const label = atomRegistry[b.type].label;
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }

  return (
    <div className="p-5 space-y-5">
      <SectionHead
        title={`${blockIds.length} blocks`}
        subtitle="multi-select"
      />

      <div className="space-y-1">
        {[...counts.entries()].map(([label, n]) => (
          <div
            key={label}
            className="flex items-center justify-between text-sm text-foreground/80"
          >
            <span>{label}</span>
            <span className="kicker text-foreground/50">×{n}</span>
          </div>
        ))}
      </div>

      <hr className="rule" />

      <div className="space-y-2">
        <button
          type="button"
          onClick={onDuplicate}
          className="kicker w-full px-3 py-2 rounded-sm border border-border text-foreground/80 hover:bg-foreground/10 hover:text-accent transition-colors"
        >
          Duplicate ({blockIds.length})
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="kicker w-full px-3 py-2 rounded-sm border border-border text-foreground/80 hover:bg-foreground/10 hover:text-accent transition-colors"
        >
          Delete ({blockIds.length})
        </button>
      </div>

      <Hint>
        Shift / ⌘-click blocks to add or remove them. ⌘C / ⌘X / ⌘V copies,
        cuts and pastes the selection — even into another page.
      </Hint>
    </div>
  );
}

/* ============================================================
   Mobile field affordances — override indicator + reset
   ============================================================ */

type FieldState = {
  device: Device;
  disabled: boolean;
  overridden: boolean;
  desktopValue: unknown;
};

/**
 * Visual wrapper for a panel field. Adds a mobile-override indicator
 * (small dot when the value differs from desktop), a reset button when
 * overridden, and a "(desktop only)" hint for non-overridable keys.
 */
function FieldShell({
  label,
  state,
  onReset,
  children,
}: {
  label: string;
  state: FieldState;
  /** Required when state.overridden is true. Clears the mobile override. */
  onReset?: () => void;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", state.disabled && "opacity-40")}>
      <span className="kicker mb-1.5 flex items-center gap-1.5">
        {state.overridden && (
          <span
            aria-hidden
            className="h-1.5 w-1.5 rounded-full bg-accent shrink-0"
          />
        )}
        <span>{label}</span>
        {state.disabled && (
          <span className="text-foreground/40 normal-case italic">
            (desktop only)
          </span>
        )}
        {state.overridden && onReset && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onReset();
            }}
            className="ml-auto kicker text-foreground/50 hover:text-accent transition-colors"
          >
            reset
          </button>
        )}
      </span>
      <fieldset disabled={state.disabled} className="contents">
        {children}
      </fieldset>
    </label>
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
  device,
  onUpdate,
  onUpdateMobile,
}: {
  section: Section;
  device: Device;
  onUpdate: (patch: Partial<Section>) => void;
  onUpdateMobile: (patch: {
    padding?: Section["padding"] | undefined;
    minHeight?: Section["minHeight"] | undefined;
    align?: Section["align"] | undefined;
  }) => void;
}) {
  if (device === "mobile") {
    const m = section.mobile;
    const padding = m?.padding ?? section.padding;
    const minHeight = m?.minHeight ?? section.minHeight;
    const align = m?.align ?? section.align;
    return (
      <div className="p-5 space-y-5">
        <SectionHead title="Section" subtitle={section.id}>
          <DevicePill device="mobile" />
        </SectionHead>

        <SectionMobileBanner />

        <FieldShell
          label="padding"
          state={{
            device: "mobile",
            disabled: false,
            overridden: m?.padding !== undefined,
            desktopValue: section.padding,
          }}
          onReset={() => onUpdateMobile({ padding: undefined })}
        >
          <SegmentBar
            options={["none", "sm", "md", "lg", "xl"]}
            value={padding}
            onChange={(v) =>
              onUpdateMobile({ padding: v as Section["padding"] })
            }
          />
        </FieldShell>
        <FieldShell
          label="min height"
          state={{
            device: "mobile",
            disabled: false,
            overridden: m?.minHeight !== undefined,
            desktopValue: section.minHeight,
          }}
          onReset={() => onUpdateMobile({ minHeight: undefined })}
        >
          <SegmentBar
            options={["auto", "half", "screen"]}
            value={minHeight}
            onChange={(v) =>
              onUpdateMobile({ minHeight: v as Section["minHeight"] })
            }
          />
        </FieldShell>
        <FieldShell
          label="vertical align"
          state={{
            device: "mobile",
            disabled: false,
            overridden: m?.align !== undefined,
            desktopValue: section.align,
          }}
          onReset={() => onUpdateMobile({ align: undefined })}
        >
          <SegmentBar
            options={["top", "center", "bottom"]}
            value={align}
            onChange={(v) =>
              onUpdateMobile({ align: v as Section["align"] })
            }
          />
        </FieldShell>

        <hr className="rule" />
        <Hint>Background settings are shared with desktop.</Hint>
      </div>
    );
  }

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
      <Field label="grey out unhovered">
        <ToggleBtn
          label={section.dimUnhovered ? "On" : "Off"}
          active={!!section.dimUnhovered}
          onToggle={() =>
            // `undefined` (not `false`) when off, so the key drops out of
            // the saved JSON entirely — the option is strictly opt-in.
            onUpdate({ dimUnhovered: section.dimUnhovered ? undefined : true })
          }
        />
        <p className="text-xs text-foreground/40 italic mt-1">
          Greys the section out until the pointer hovers it. Public site
          only, on hover-capable devices.
        </p>
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

function DevicePill({ device }: { device: Device }) {
  return (
    <span
      className={cn(
        "kicker rounded-sm px-1.5 py-0.5 ml-2 text-[10px] tracking-wider",
        device === "mobile"
          ? "bg-accent text-accent-foreground"
          : "bg-foreground/10 text-foreground",
      )}
    >
      {device === "mobile" ? "M" : "D"}
    </span>
  );
}

function SectionMobileBanner() {
  return (
    <p className="text-xs text-foreground/50 italic font-sans border-l-2 border-accent/40 pl-3">
      Editing mobile overrides. Unset fields inherit from desktop.
    </p>
  );
}

function BlockProps({
  block,
  device,
  availablePages = [],
  currentSlug,
  onUpdate,
  onSetBleed,
  onSetMobileHidden,
  onClearMobileOverrides,
}: {
  block: Block;
  device: Device;
  availablePages?: string[];
  currentSlug?: string;
  /** onUpdate is already device-scoped at the Editor level — desktop calls
   *  patch `block.props`, mobile calls patch `block.mobile.props`. */
  onUpdate: (patch: Record<string, unknown>) => void;
  onSetBleed: (bleed: Block["layout"]["bleed"]) => void;
  onSetMobileHidden: (hidden: boolean) => void;
  onClearMobileOverrides: () => void;
}) {
  const entry = atomRegistry[block.type];

  if (device === "mobile") {
    return (
      <BlockMobileProps
        block={block}
        entry={entry}
        onUpdate={onUpdate}
        onSetHidden={onSetMobileHidden}
        onClearAll={onClearMobileOverrides}
      />
    );
  }

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
              newTab: boolean;
            }
          }
          availablePages={availablePages}
          currentSlug={currentSlug}
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
      {block.type === "projectCarousel" && (
        <ProjectCarouselBlockProps
          props={block.props as ProjectCarouselProps}
          onUpdate={onUpdate}
        />
      )}
      {block.type === "socialLinks" && (
        <SocialLinksBlockProps
          props={block.props as SocialLinksProps}
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
      <Field label="stretch / bleed">
        <SegmentBar
          options={["none", "left", "right", "both"]}
          value={block.layout.bleed ?? "none"}
          onChange={(v) => onSetBleed(v as Block["layout"]["bleed"])}
        />
        <p className="text-xs text-foreground/40 italic mt-1">
          Stretches the block past the safe area to the section edge to
          accentuate it. Best on a block sitting at that grid edge (left → col
          1, right → ends at col 12).
        </p>
      </Field>

      <hr className="rule" />
      <Field label="layout">
        <p className="text-xs text-foreground/50 italic font-sans">
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

/* ============================================================
   Mobile block panel — only the overridable fields, each with an
   override indicator + reset.
   ============================================================ */

function BlockMobileProps({
  block,
  entry,
  onUpdate,
  onSetHidden,
  onClearAll,
}: {
  block: Block;
  entry: { label: string };
  onUpdate: (patch: Record<string, unknown>) => void;
  onSetHidden: (hidden: boolean) => void;
  onClearAll: () => void;
}) {
  const merged = mergeBlockForMobile(block);
  const overridesAny = hasMobileOverrides(block);

  return (
    <div className="p-5 space-y-5">
      <SectionHead title={entry.label} subtitle={block.type}>
        <DevicePill device="mobile" />
      </SectionHead>

      <SectionMobileBanner />

      <FieldShell
        label="hidden on mobile"
        state={{
          device: "mobile",
          disabled: false,
          overridden: !!block.mobile?.hidden,
          desktopValue: false,
        }}
        onReset={() => onSetHidden(false)}
      >
        <ToggleBtn
          label={block.mobile?.hidden ? "Hidden" : "Visible"}
          active={!!block.mobile?.hidden}
          onToggle={() => onSetHidden(!block.mobile?.hidden)}
        />
      </FieldShell>

      {block.type === "text" && (
        <MobileTextProps block={block} merged={merged} onUpdate={onUpdate} />
      )}
      {block.type === "image" && (
        <MobileImageProps block={block} merged={merged} onUpdate={onUpdate} />
      )}
      {block.type === "button" && (
        <MobileButtonProps block={block} merged={merged} onUpdate={onUpdate} />
      )}
      {block.type === "video" && (
        <MobileVideoProps block={block} merged={merged} onUpdate={onUpdate} />
      )}
      {block.type === "spacer" && (
        <MobileSpacerProps block={block} merged={merged} onUpdate={onUpdate} />
      )}
      {(block.type === "line" ||
        block.type === "quote" ||
        block.type === "projectCarousel" ||
        block.type === "socialLinks") && (
        <Hint>This block has no mobile-specific style overrides.</Hint>
      )}

      <hr className="rule" />
      <Field label="layout (mobile)">
        <p className="text-xs text-foreground/50 italic font-sans">
          col {merged.layout.col}, span {merged.layout.colSpan} · row{" "}
          {merged.layout.row ?? "auto"}, span {merged.layout.rowSpan ?? "auto"}
          {block.mobile?.layout && (
            <span className="ml-1 text-accent">·overridden</span>
          )}
        </p>
        <p className="text-xs text-foreground/40 italic mt-1">
          Drag the block on the canvas to set a mobile-specific layout.
        </p>
      </Field>

      {overridesAny && (
        <button
          type="button"
          onClick={onClearAll}
          className="kicker w-full px-3 py-2 rounded-sm border border-border text-foreground/70 hover:bg-foreground/10 hover:text-accent transition-colors"
        >
          Clear all mobile overrides
        </button>
      )}
    </div>
  );
}

/* ---------- per-type mobile override pickers ---------- */

function MobileTextProps({
  block,
  merged,
  onUpdate,
}: {
  block: Block;
  merged: Block;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const props = merged.props as TextProps;
  const ov = (block.mobile?.props ?? {}) as Partial<TextProps>;
  return (
    <>
      <FieldShell
        label="align"
        state={mFieldState(block, "align")}
        onReset={() => onUpdate({ align: undefined })}
      >
        <SegmentBar
          options={["left", "center", "right"]}
          value={props.align}
          onChange={(v) => onUpdate({ align: v })}
        />
      </FieldShell>
      <FieldShell
        label="case"
        state={mFieldState(block, "transform")}
        onReset={() => onUpdate({ transform: undefined })}
      >
        <SegmentBar
          options={["none", "upper", "lower"]}
          labels={{ none: "Aa", upper: "AB", lower: "ab" }}
          value={props.transform ?? "none"}
          onChange={(v) => onUpdate({ transform: v })}
        />
      </FieldShell>
      <FieldShell
        label="font size (px)"
        state={mFieldState(block, "fontSize")}
        onReset={() => onUpdate({ fontSize: undefined })}
      >
        <input
          type="number"
          min={8}
          max={512}
          placeholder={String(
            (block.props as TextProps).fontSize ?? "auto",
          )}
          className={inputCls}
          value={ov.fontSize ?? ""}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            onUpdate({ fontSize: Number.isFinite(n) ? n : undefined });
          }}
        />
      </FieldShell>
      <FieldShell
        label="line height"
        state={mFieldState(block, "lineHeight")}
        onReset={() => onUpdate({ lineHeight: undefined })}
      >
        <input
          type="number"
          min={0.6}
          max={3}
          step={0.05}
          placeholder={String(
            (block.props as TextProps).lineHeight ?? "auto",
          )}
          className={inputCls}
          value={ov.lineHeight ?? ""}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onUpdate({ lineHeight: Number.isFinite(n) ? n : undefined });
          }}
        />
      </FieldShell>
      <FieldShell
        label="letter spacing (em)"
        state={mFieldState(block, "letterSpacing")}
        onReset={() => onUpdate({ letterSpacing: undefined })}
      >
        <input
          type="number"
          min={-0.2}
          max={1}
          step={0.005}
          placeholder={String(
            (block.props as TextProps).letterSpacing ?? "auto",
          )}
          className={inputCls}
          value={ov.letterSpacing ?? ""}
          onChange={(e) => {
            const n = parseFloat(e.target.value);
            onUpdate({ letterSpacing: Number.isFinite(n) ? n : undefined });
          }}
        />
      </FieldShell>
    </>
  );
}

function MobileImageProps({
  block,
  merged,
  onUpdate,
}: {
  block: Block;
  merged: Block;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const props = merged.props as ImageProps;
  const ov = (block.mobile?.props ?? {}) as Partial<ImageProps>;
  return (
    <>
      <FieldShell
        label="fit"
        state={mFieldState(block, "fit")}
        onReset={() => onUpdate({ fit: undefined })}
      >
        <SegmentBar
          options={["cover", "contain"]}
          value={props.fit}
          onChange={(v) => onUpdate({ fit: v })}
        />
      </FieldShell>
      <FieldShell
        label="aspect ratio (CSS)"
        state={mFieldState(block, "aspect")}
        onReset={() => onUpdate({ aspect: undefined })}
      >
        <input
          className={cn(inputCls, "font-sans text-xs")}
          placeholder={(block.props as ImageProps).aspect ?? "4/5"}
          value={ov.aspect ?? ""}
          onChange={(e) =>
            onUpdate({ aspect: e.target.value || undefined })
          }
        />
      </FieldShell>
      <FieldShell
        label={`corner radius — ${props.radius}px`}
        state={mFieldState(block, "radius")}
        onReset={() => onUpdate({ radius: undefined })}
      >
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
      </FieldShell>
    </>
  );
}

function MobileButtonProps({
  block,
  merged,
  onUpdate,
}: {
  block: Block;
  merged: Block;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const props = merged.props as {
    align: string;
    variant: string;
  };
  return (
    <>
      <FieldShell
        label="align"
        state={mFieldState(block, "align")}
        onReset={() => onUpdate({ align: undefined })}
      >
        <SegmentBar
          options={["left", "center", "right"]}
          value={props.align}
          onChange={(v) => onUpdate({ align: v })}
        />
      </FieldShell>
      <FieldShell
        label="variant"
        state={mFieldState(block, "variant")}
        onReset={() => onUpdate({ variant: undefined })}
      >
        <SegmentBar
          options={["primary", "ghost"]}
          value={props.variant}
          onChange={(v) => onUpdate({ variant: v })}
        />
      </FieldShell>
    </>
  );
}

function MobileVideoProps({
  block,
  merged,
  onUpdate,
}: {
  block: Block;
  merged: Block;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const props = merged.props as VideoProps;
  const ov = (block.mobile?.props ?? {}) as Partial<VideoProps>;
  return (
    <>
      <FieldShell
        label="aspect ratio (CSS)"
        state={mFieldState(block, "aspect")}
        onReset={() => onUpdate({ aspect: undefined })}
      >
        <input
          className={cn(inputCls, "font-sans text-xs")}
          placeholder={(block.props as VideoProps).aspect ?? "16/9"}
          value={ov.aspect ?? ""}
          onChange={(e) =>
            onUpdate({ aspect: e.target.value || "16/9" })
          }
        />
      </FieldShell>
      <FieldShell
        label={`corner radius — ${props.radius}px`}
        state={mFieldState(block, "radius")}
        onReset={() => onUpdate({ radius: undefined })}
      >
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
      </FieldShell>
    </>
  );
}

function MobileSpacerProps({
  block,
  merged,
  onUpdate,
}: {
  block: Block;
  merged: Block;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const props = merged.props as { height: number };
  return (
    <FieldShell
      label="height (px)"
      state={mFieldState(block, "height")}
      onReset={() => onUpdate({ height: undefined })}
    >
      <input
        type="number"
        className={inputCls}
        value={props.height}
        onChange={(e) =>
          onUpdate({ height: parseInt(e.target.value, 10) || 0 })
        }
      />
    </FieldShell>
  );
}

/** Convenience wrapper around useMobileFieldState for the per-type pickers. */
function mFieldState(block: Block, key: string) {
  const mobileProps = (block.mobile?.props ?? {}) as Record<string, unknown>;
  return {
    device: "mobile" as const,
    disabled: !isMobileOverridable(block.type, key),
    overridden: key in mobileProps && mobileProps[key] !== undefined,
    desktopValue: (block.props as Record<string, unknown>)[key],
  };
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
          className={cn(inputCls, "font-sans text-xs")}
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
  return (
    <>
      <Field label="image">
        <ImageDialog
          value={props.src}
          onChange={(src) => onUpdate({ src })}
          effects={{
            filter: props.filter,
            focalX: props.focalX,
            focalY: props.focalY,
            rotate: props.rotate,
            flipX: props.flipX,
            flipY: props.flipY,
            blur: props.blur,
            zoom: props.zoom,
            tint: props.tint,
            tintOpacity: props.tintOpacity,
          }}
          onEffectsChange={onUpdate}
          effectsContext={{ fit: props.fit, aspect: props.aspect }}
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
          className={cn(inputCls, "font-sans text-xs")}
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

      <hr className="rule" />

      <Field label="link href (optional)">
        <input
          className={cn(inputCls, "font-sans text-xs")}
          value={props.href ?? ""}
          onChange={(e) => onUpdate({ href: e.target.value || undefined })}
        />
      </Field>
    </>
  );
}

/* ---------------- project carousel ---------------- */

function ProjectCarouselBlockProps({
  props,
  onUpdate,
}: {
  props: ProjectCarouselProps;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const items = props.items;
  const isMarquee = props.variant === "marquee";

  const setItem = (i: number, patch: Partial<CarouselItem>) => {
    onUpdate({
      items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    });
  };
  const addItem = () => {
    onUpdate({
      items: [
        ...items,
        {
          src: "",
          alt: "",
          title: "New project",
          meta: "",
          description: "",
          starred: false,
          ...CAROUSEL_ITEM_EFFECT_DEFAULTS,
        },
      ],
    });
  };
  const removeItem = (i: number) => {
    onUpdate({ items: items.filter((_, idx) => idx !== i) });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onUpdate({ items: next });
  };

  return (
    <>
      <Field label="variant">
        <SegmentBar
          options={["cards", "marquee"]}
          value={props.variant}
          labels={{ cards: "Cards", marquee: "Marquee" }}
          onChange={(v) => onUpdate({ variant: v })}
        />
        <p className="text-xs text-foreground/40 italic mt-1.5">
          {isMarquee
            ? "Image-only band that drifts on its own and can be grabbed / flung."
            : "Snap-scrolled cards with title, meta and description."}
        </p>
      </Field>

      <Field label={`card width — ${props.cardWidth}px`}>
        <input
          type="range"
          min={160}
          max={640}
          step={8}
          value={props.cardWidth}
          onChange={(e) =>
            onUpdate({ cardWidth: parseInt(e.target.value, 10) || 320 })
          }
          className="w-full accent-accent"
        />
      </Field>

      <Field label={`gap — ${props.gap}px`}>
        <input
          type="range"
          min={0}
          max={96}
          step={2}
          value={props.gap}
          onChange={(e) =>
            onUpdate({ gap: parseInt(e.target.value, 10) || 0 })
          }
          className="w-full accent-accent"
        />
      </Field>

      <Field label="image ratio">
        <SegmentBar
          options={["1/1", "4/5", "3/4", "2/3", "16/9", "3/2"]}
          labels={{
            "1/1": "Square",
            "4/5": "4:5",
            "3/4": "3:4",
            "2/3": "2:3",
            "16/9": "16:9",
            "3/2": "3:2",
          }}
          value={props.aspect}
          onChange={(v) => onUpdate({ aspect: v })}
        />
        <input
          className={cn(inputCls, "font-sans text-xs mt-2")}
          placeholder="custom, e.g. 5/7"
          value={props.aspect}
          onChange={(e) => onUpdate({ aspect: e.target.value || "4/5" })}
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

      {isMarquee && (
        <Field label={`auto-scroll — ${props.autoScrollSpeed}px/s`}>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={props.autoScrollSpeed}
            onChange={(e) =>
              onUpdate({ autoScrollSpeed: parseInt(e.target.value, 10) || 0 })
            }
            className="w-full accent-accent"
          />
          <p className="text-xs text-foreground/40 italic mt-1">
            0 = no drift (still grabbable). Paused for reduced-motion visitors.
          </p>
        </Field>
      )}

      <div className="flex gap-2">
        {isMarquee ? (
          <Field label="pause on hover">
            <ToggleBtn
              label={props.pauseOnHover ? "Yes" : "No"}
              active={props.pauseOnHover}
              onToggle={() => onUpdate({ pauseOnHover: !props.pauseOnHover })}
            />
          </Field>
        ) : (
          <Field label="arrows">
            <ToggleBtn
              label={props.showArrows ? "Shown" : "Hidden"}
              active={props.showArrows}
              onToggle={() => onUpdate({ showArrows: !props.showArrows })}
            />
          </Field>
        )}
        <Field label="links">
          <ToggleBtn
            label={props.newTab ? "New tab" : "Same tab"}
            active={props.newTab}
            onToggle={() => onUpdate({ newTab: !props.newTab })}
          />
        </Field>
      </div>

      <Field label="edge fade">
        <ToggleBtn
          label={props.edgeFade ? "On" : "Off"}
          active={props.edgeFade}
          onToggle={() => onUpdate({ edgeFade: !props.edgeFade })}
        />
        <p className="text-xs text-foreground/40 italic mt-1">
          Softly fades the left/right edges so cards ease in and out.
        </p>
      </Field>

      <hr className="rule" />

      <div className="flex items-center justify-between">
        <span className="kicker">projects · {items.length}</span>
        <button
          type="button"
          onClick={addItem}
          className="kicker px-2 py-1.5 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          + Add project
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-sm border border-border bg-background/40 p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="kicker text-foreground/50">#{i + 1}</span>
              <div className="flex gap-1">
                <CarouselItemBtn
                  label={item.starred ? "Unstar" : "Star (feature)"}
                  active={!!item.starred}
                  onClick={() => setItem(i, { starred: !item.starred })}
                >
                  ★
                </CarouselItemBtn>
                <CarouselItemBtn
                  label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </CarouselItemBtn>
                <CarouselItemBtn
                  label="Move down"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </CarouselItemBtn>
                <CarouselItemBtn label="Remove" onClick={() => removeItem(i)}>
                  ✕
                </CarouselItemBtn>
              </div>
            </div>

            <ImageDialog
              value={item.src}
              label="project image"
              onChange={(src) => setItem(i, { src })}
              effects={{
                filter: item.filter,
                focalX: item.focalX,
                focalY: item.focalY,
                rotate: item.rotate,
                flipX: item.flipX,
                flipY: item.flipY,
                blur: item.blur,
                zoom: item.zoom,
                tint: item.tint,
                tintOpacity: item.tintOpacity,
              }}
              onEffectsChange={(patch) =>
                setItem(i, patch as Partial<CarouselItem>)
              }
              effectsContext={{ fit: "cover", aspect: props.aspect }}
            />
            {!isMarquee && (
              <>
                <input
                  className={inputCls}
                  placeholder="title"
                  value={item.title}
                  onChange={(e) => setItem(i, { title: e.target.value })}
                />
                <input
                  className={inputCls}
                  placeholder="meta — e.g. 2024 — Role"
                  value={item.meta}
                  onChange={(e) => setItem(i, { meta: e.target.value })}
                />
                <textarea
                  rows={2}
                  className={inputCls}
                  placeholder="description"
                  value={item.description}
                  onChange={(e) => setItem(i, { description: e.target.value })}
                />
              </>
            )}
            <input
              className={cn(inputCls, "font-sans text-xs")}
              placeholder="link href (optional)"
              value={item.href ?? ""}
              onChange={(e) =>
                setItem(i, { href: e.target.value || undefined })
              }
            />
            <input
              className={inputCls}
              placeholder="alt text"
              value={item.alt}
              onChange={(e) => setItem(i, { alt: e.target.value })}
            />
          </div>
        ))}
        {items.length === 0 && <Hint>No projects yet. Add one above.</Hint>}
      </div>
    </>
  );
}

function SocialLinksBlockProps({
  props,
  onUpdate,
}: {
  props: SocialLinksProps;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  const items = props.items;

  const setItem = (i: number, patch: Partial<SocialLinkItem>) => {
    onUpdate({
      items: items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    });
  };
  const addItem = () => {
    onUpdate({ items: [...items, { platform: "website", href: "" }] });
  };
  const removeItem = (i: number) => {
    onUpdate({ items: items.filter((_, idx) => idx !== i) });
  };
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = items.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onUpdate({ items: next });
  };

  return (
    <>
      <Field label="variant">
        <SegmentBar
          options={["icons", "pills"]}
          labels={{ icons: "Icons", pills: "Pills" }}
          value={props.variant}
          onChange={(v) => onUpdate({ variant: v })}
        />
        <p className="text-xs text-foreground/40 italic mt-1.5">
          {props.variant === "pills"
            ? "Ghost-button chips with icon + label."
            : "Bare glyphs that tint to the accent on hover."}
        </p>
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

      <Field label={`icon size — ${props.size}px`}>
        <input
          type="range"
          min={14}
          max={48}
          step={1}
          value={props.size}
          onChange={(e) =>
            onUpdate({ size: parseInt(e.target.value, 10) || 20 })
          }
          className="w-full accent-accent"
        />
      </Field>

      <Field label={`gap — ${props.gap}px`}>
        <input
          type="range"
          min={0}
          max={64}
          step={2}
          value={props.gap}
          onChange={(e) => onUpdate({ gap: parseInt(e.target.value, 10) || 0 })}
          className="w-full accent-accent"
        />
      </Field>

      <Field label="links">
        <ToggleBtn
          label={props.newTab ? "New tab" : "Same tab"}
          active={props.newTab}
          onToggle={() => onUpdate({ newTab: !props.newTab })}
        />
      </Field>

      <hr className="rule" />

      <div className="flex items-center justify-between">
        <span className="kicker">links · {items.length}</span>
        <button
          type="button"
          onClick={addItem}
          className="kicker px-2 py-1.5 rounded-sm bg-accent text-accent-foreground hover:opacity-90 transition-opacity"
        >
          + Add link
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-sm border border-border bg-background/40 p-3 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="kicker text-foreground/50">#{i + 1}</span>
              <div className="flex gap-1">
                <CarouselItemBtn
                  label="Move up"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  ↑
                </CarouselItemBtn>
                <CarouselItemBtn
                  label="Move down"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  ↓
                </CarouselItemBtn>
                <CarouselItemBtn label="Remove" onClick={() => removeItem(i)}>
                  ✕
                </CarouselItemBtn>
              </div>
            </div>

            <select
              className={inputCls}
              value={item.platform}
              onChange={(e) =>
                setItem(i, { platform: e.target.value as SocialPlatform })
              }
            >
              {socialPlatformSchema.options.map((p) => (
                <option key={p} value={p}>
                  {SOCIAL_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
            <input
              className={cn(inputCls, "font-sans text-xs")}
              placeholder={
                item.platform === "email"
                  ? "mailto:you@example.com"
                  : "https://…"
              }
              value={item.href}
              onChange={(e) => setItem(i, { href: e.target.value })}
            />
            <input
              className={inputCls}
              placeholder={`label (optional — "${SOCIAL_PLATFORM_LABELS[item.platform]}")`}
              value={item.label ?? ""}
              onChange={(e) =>
                setItem(i, { label: e.target.value || undefined })
              }
            />
          </div>
        ))}
        {items.length === 0 && <Hint>No links yet. Add one above.</Hint>}
      </div>
    </>
  );
}

function CarouselItemBtn({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-6 w-6 place-items-center rounded-sm border transition-colors disabled:opacity-30 disabled:pointer-events-none",
        active
          ? "border-accent bg-accent text-accent-foreground"
          : "border-border text-foreground/70 hover:bg-foreground/10 hover:text-accent"
      )}
    >
      {children}
    </button>
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
      <p className="text-xs text-foreground/40 italic font-sans">
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
  fitAxis,
  filter,
  focalX,
  focalY,
  rotate,
  flipX,
  flipY,
  blur,
  zoom,
  tint,
  tintOpacity,
  onChange,
}: {
  src: string;
  aspect?: string;
  fit: ImageProps["fit"];
  /** Section backgrounds only: which section axis the image scales to
   *  match. Undefined hides the control (image blocks / carousel items
   *  size via their own fit/aspect props instead). Emits `{ fit }`. */
  fitAxis?: "both" | "x" | "y";
  filter: ImageProps["filter"];
  focalX: number;
  focalY: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  blur: number;
  zoom: number;
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

      {fitAxis !== undefined && (
        <Field label="scale to match">
          <SegmentBar
            options={["both", "x", "y"]}
            labels={{ both: "Both", x: "Width", y: "Height" }}
            value={fitAxis}
            onChange={(v) => onChange({ fit: v })}
          />
          <p className="text-xs text-foreground/40 italic">
            Both fills the section and crops overflow; Width / Height match
            one axis and let the other follow the image&apos;s proportions.
          </p>
        </Field>
      )}

      <Field label={`scale — ${zoom.toFixed(2)}×`}>
        <input
          type="range"
          min={0.2}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) =>
            onChange({ zoom: parseFloat(e.target.value) || 1 })
          }
          className="w-full accent-accent"
        />
        <p className="text-xs text-foreground/40 italic">
          Scales the image toward the focal point below — under 1× shrinks
          it inside its frame.
        </p>
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
  { id: "reverse", label: "Reverse" },
  { id: "image", label: "Image" },
  { id: "video", label: "Video" },
  { id: "reactbits", label: "Bits" },
] as const;

function bgIdOf(bg: SectionBackground): string {
  if (bg.type === "transparent") return "transparent";
  if (bg.type === "color") return `color-${bg.token}`;
  if (bg.type === "reverse") return "reverse";
  if (bg.type === "image") return "image";
  if (bg.type === "video") return "video";
  return "reactbits";
}

const RB_KIND_OPTIONS = [
  { id: "prismatic-burst", label: "Prismatic Burst" },
  { id: "grid-scan", label: "Grid Scan" },
  { id: "grainient", label: "Grainient" },
  { id: "light-pillar", label: "Light Pillar" },
  { id: "liquid-ether", label: "Liquid Ether" },
] as const;

const RB_FALLBACK_OPTIONS = [
  { id: "none", label: "Off — render bits everywhere" },
  { id: "gradient", label: "Soft gradient" },
  { id: "blur-dark", label: "Blurred — dark" },
  { id: "blur-accent", label: "Blurred — accent" },
] as const;

function SectionBackgroundEditor({
  bg,
  onChange,
}: {
  bg: SectionBackground;
  onChange: (next: SectionBackground) => void;
}) {
  const currentId = bgIdOf(bg);

  function setType(id: string) {
    if (id === "transparent") return onChange({ type: "transparent" });
    if (id === "color-bg")
      return onChange({ type: "color", token: "background" });
    if (id === "color-surface")
      return onChange({ type: "color", token: "surface" });
    if (id === "color-accent")
      return onChange({ type: "color", token: "accent" });
    if (id === "reverse") return onChange({ type: "reverse" });
    if (id === "image") {
      // Preserve src/effects if we already had an image bg.
      if (bg.type === "image") return onChange(bg);
      return onChange({
        type: "image",
        src: "",
        fit: "both",
        overlay: 0,
        filter: "none",
        focalX: 50,
        focalY: 50,
        rotate: 0,
        flipX: false,
        flipY: false,
        blur: 0,
        zoom: 1,
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
        playbackRate: 1,
        tint: "none",
        tintOpacity: 0,
      });
    }
    if (id === "reactbits") {
      if (bg.type === "reactbits") return onChange(bg);
      return onChange({
        type: "reactbits",
        kind: "prismatic-burst",
        intensity: 1,
        speed: 1,
        colorA: "#5C8A3A",
        colorB: "#0F0D0B",
        overlay: 0,
        tint: "none",
        tintOpacity: 0,
        mobileFallbackBreakpoint: 768,
        mobileFallbackKind: "gradient",
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

      {bg.type === "reverse" && (
        <p className="text-xs text-foreground/40 italic">
          Flips the section: foreground becomes the background and vice-versa.
          Useful for a single light spread inside an otherwise-dark page.
        </p>
      )}

      {bg.type === "image" && (
        <>
          <Field label="image">
            <ImageDialog
              value={bg.src}
              onChange={(src) => onChange({ ...bg, src })}
              effects={{
                filter: bg.filter,
                focalX: bg.focalX,
                focalY: bg.focalY,
                rotate: bg.rotate,
                flipX: bg.flipX,
                flipY: bg.flipY,
                blur: bg.blur,
                zoom: bg.zoom,
                tint: bg.tint,
                tintOpacity: bg.tintOpacity,
              }}
              onEffectsChange={(patch) =>
                onChange({ ...bg, ...patch } as SectionBackground)
              }
              // No aspect lock — the section's own dimensions drive the frame.
              effectsContext={{ fit: "cover" }}
              fitAxis={bg.fit}
            />
          </Field>

          <Field label="scale to match">
            <SegmentBar
              options={["both", "x", "y"]}
              labels={{ both: "Both", x: "Width", y: "Height" }}
              value={bg.fit}
              onChange={(v) =>
                onChange({ ...bg, fit: v as "both" | "x" | "y" })
              }
            />
            <p className="text-xs text-foreground/40 italic">
              Both fills the section and crops the overflow. Width / Height
              match one axis only — the other follows the image&apos;s own
              proportions, cropping toward the focal point or letting the
              section background show through.
            </p>
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
              Darkens the image so foreground text stays readable.
            </p>
          </Field>
        </>
      )}

      {bg.type === "video" && (
        <>
          <Field label="YouTube URL">
            <input
              className={cn(inputCls, "font-sans text-xs")}
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

          <Field label={`speed — ${bg.playbackRate}×`}>
            <SegmentBar
              options={["0.25", "0.5", "0.75", "1", "1.25", "1.5", "1.75", "2"]}
              value={String(bg.playbackRate)}
              onChange={(v) =>
                onChange({ ...bg, playbackRate: parseFloat(v) })
              }
              labels={{
                "0.25": "0.25×",
                "0.5": "0.5×",
                "0.75": "0.75×",
                "1": "1×",
                "1.25": "1.25×",
                "1.5": "1.5×",
                "1.75": "1.75×",
                "2": "2×",
              }}
            />
            <p className="text-xs text-foreground/40 italic mt-1.5">
              YouTube only allows these eight rates — anything else gets
              snapped to the nearest one.
            </p>
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

      {bg.type === "reactbits" && (
        <>
          <Field label="kind">
            <SegmentBar
              options={RB_KIND_OPTIONS.map((o) => o.id)}
              labels={Object.fromEntries(
                RB_KIND_OPTIONS.map((o) => [o.id, o.label])
              )}
              value={bg.kind}
              onChange={(v) =>
                onChange({ ...bg, kind: v as typeof bg.kind })
              }
            />
            <p className="text-xs text-foreground/40 italic mt-1.5">
              Each kind is its own JS chunk — only the one you pick is
              shipped to visitors of this page. Run{" "}
              <span className="font-sans">npx jsrepo add …</span> from the
              install command on its reactbits.dev page to replace the
              placeholder; the wrapper will pick it up automatically.
            </p>
          </Field>

          <Field label={`intensity — ${bg.intensity.toFixed(2)}`}>
            <input
              type="range"
              min={0}
              max={2}
              step={0.05}
              value={bg.intensity}
              onChange={(e) =>
                onChange({ ...bg, intensity: parseFloat(e.target.value) })
              }
              className="w-full accent-accent"
            />
          </Field>

          <Field label={`speed — ${bg.speed.toFixed(2)}×`}>
            <input
              type="range"
              min={0}
              max={3}
              step={0.05}
              value={bg.speed}
              onChange={(e) =>
                onChange({ ...bg, speed: parseFloat(e.target.value) })
              }
              className="w-full accent-accent"
            />
          </Field>

          <Field label="primary color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg.colorA}
                onChange={(e) => onChange({ ...bg, colorA: e.target.value })}
                className="h-9 w-12 rounded-sm border border-border bg-transparent cursor-pointer"
              />
              <input
                className={cn(inputCls, "font-sans text-xs")}
                value={bg.colorA}
                onChange={(e) => onChange({ ...bg, colorA: e.target.value })}
              />
            </div>
          </Field>

          <Field label="secondary color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={bg.colorB}
                onChange={(e) => onChange({ ...bg, colorB: e.target.value })}
                className="h-9 w-12 rounded-sm border border-border bg-transparent cursor-pointer"
              />
              <input
                className={cn(inputCls, "font-sans text-xs")}
                value={bg.colorB}
                onChange={(e) => onChange({ ...bg, colorB: e.target.value })}
              />
            </div>
          </Field>

          <hr className="rule" />

          <Field
            label={`mobile fallback (≤ ${bg.mobileFallbackBreakpoint}px)`}
          >
            <SegmentBar
              options={RB_FALLBACK_OPTIONS.map((o) => o.id)}
              labels={Object.fromEntries(
                RB_FALLBACK_OPTIONS.map((o) => [o.id, o.label])
              )}
              value={bg.mobileFallbackKind}
              onChange={(v) =>
                onChange({
                  ...bg,
                  mobileFallbackKind: v as typeof bg.mobileFallbackKind,
                })
              }
            />
            <p className="text-xs text-foreground/40 italic mt-1.5">
              On viewports narrower than the breakpoint, the WebGL chunk
              isn&apos;t even fetched — the simple CSS bg below renders
              instead. Saves bandwidth and keeps phones smooth.
            </p>
          </Field>

          <Field label={`breakpoint — ${bg.mobileFallbackBreakpoint}px`}>
            <input
              type="range"
              min={0}
              max={1280}
              step={32}
              value={bg.mobileFallbackBreakpoint}
              onChange={(e) =>
                onChange({
                  ...bg,
                  mobileFallbackBreakpoint: parseInt(e.target.value, 10) || 0,
                })
              }
              className="w-full accent-accent"
            />
          </Field>

          <hr className="rule" />

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
              Darkens the bg so foreground text stays readable.
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
      // The import() must live inside a statically-false branch in prod so
      // the bundler drops it entirely: background removal is an editor-only
      // feature (admin 404s in prod, see src/proxy.ts), but an ungated
      // dynamic import still emitted ~47MB of onnxruntime WASM into every
      // deploy's static assets.
      let blob: Blob;
      if (process.env.NODE_ENV === "development") {
        const mod = await import("@imgly/background-removal");
        blob = await mod.removeBackground(inputBlob, {
          progress: (key: string, current: number, total: number) => {
            const pct = total ? Math.round((current / total) * 100) : 0;
            setStatus(`${key} ${pct}%`);
          },
        });
      } else {
        throw new Error("Background removal is only available in dev");
      }
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

/* ---------------- crop tool ---------------- */

/** Aspect presets for the crop tool. `ratio` = width / height; null = free. */
const CROP_ASPECTS = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "3:2", label: "3:2", ratio: 3 / 2 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
] as const;

type CropAspectId = (typeof CROP_ASPECTS)[number]["id"];

/** Crop rectangle as fractions (0–1) of the source image box. */
type CropRect = { x: number; y: number; w: number; h: number };

type CropDragMode = "move" | "nw" | "ne" | "sw" | "se";

/** Smallest crop edge, as a fraction of the image. */
const CROP_MIN = 0.03;

const cropClamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

/** Largest rect of the given px aspect ratio, centered, in fraction space. */
function centeredCropRect(
  ratio: number | null,
  nat: { w: number; h: number } | null
): CropRect {
  if (!ratio || !nat) return { x: 0, y: 0, w: 1, h: 1 };
  const cropW = Math.min(nat.w, nat.h * ratio);
  const w = cropW / nat.w;
  const h = cropW / ratio / nat.h;
  return { x: (1 - w) / 2, y: (1 - h) / 2, w, h };
}

/** Resize from a corner, keeping the opposite corner anchored. Fraction
 *  space is non-square, so the aspect lock converts through the image's
 *  natural px dimensions. */
function resizeCropRect(
  start: CropRect,
  mode: Exclude<CropDragMode, "move">,
  dx: number,
  dy: number,
  ratio: number | null,
  nat: { w: number; h: number } | null
): CropRect {
  const right = start.x + start.w;
  const bottom = start.y + start.h;
  const east = mode === "ne" || mode === "se";
  const south = mode === "sw" || mode === "se";
  const maxW = east ? 1 - start.x : right;
  const maxH = south ? 1 - start.y : bottom;
  let w = cropClamp(east ? start.w + dx : start.w - dx, CROP_MIN, maxW);
  let h = cropClamp(south ? start.h + dy : start.h - dy, CROP_MIN, maxH);
  if (ratio && nat) {
    h = (w * nat.w) / (ratio * nat.h);
    if (h > maxH) {
      h = maxH;
      w = (h * ratio * nat.h) / nat.w;
    } else if (h < CROP_MIN) {
      h = CROP_MIN;
      w = cropClamp((h * ratio * nat.h) / nat.w, CROP_MIN, maxW);
    }
  }
  return {
    x: east ? start.x : right - w,
    y: south ? start.y : bottom - h,
    w,
    h,
  };
}

const CROP_HANDLES: ReadonlyArray<{
  mode: Exclude<CropDragMode, "move">;
  cls: string;
}> = [
  { mode: "nw", cls: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize" },
  { mode: "ne", cls: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize" },
  { mode: "sw", cls: "left-0 bottom-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize" },
  { mode: "se", cls: "right-0 bottom-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize" },
];

/**
 * Destructive crop, following the RemoveBgButton pattern: drag a rectangle
 * over the image (aspect presets or freeform), Apply bakes that region to a
 * canvas at the source's native resolution and uploads the result into
 * /public/uploads/ as a new file — the original stays in the library — then
 * selects the copy. Local-path sources only: a cross-origin image would
 * taint the canvas and the export would throw.
 */
function CropTool({
  src,
  onResult,
}: {
  src: string;
  onResult: (src: string) => void;
}) {
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rect, setRect] = useState<CropRect>({ x: 0, y: 0, w: 1, h: 1 });
  const [aspectId, setAspectId] = useState<CropAspectId>("free");
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(
    null
  );
  const boxRef = useRef<HTMLDivElement>(null);

  const local = src.startsWith("/") && !src.startsWith("//");

  function startDrag(e: React.PointerEvent, mode: CropDragMode) {
    e.preventDefault();
    e.stopPropagation();
    const box = boxRef.current?.getBoundingClientRect();
    if (!box || busy) return;
    const start = rect;
    const sx = e.clientX;
    const sy = e.clientY;
    const ratio =
      CROP_ASPECTS.find((a) => a.id === aspectId)?.ratio ?? null;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - sx) / box.width;
      const dy = (ev.clientY - sy) / box.height;
      setRect(
        mode === "move"
          ? {
              x: cropClamp(start.x + dx, 0, 1 - start.w),
              y: cropClamp(start.y + dy, 0, 1 - start.h),
              w: start.w,
              h: start.h,
            }
          : resizeCropRect(start, mode, dx, dy, ratio, natural)
      );
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function pickAspect(id: CropAspectId) {
    setAspectId(id);
    const ratio = CROP_ASPECTS.find((a) => a.id === id)?.ratio ?? null;
    if (ratio) setRect(centeredCropRect(ratio, natural));
  }

  async function apply() {
    if (!natural || busy) return;
    setBusy(true);
    setError(null);
    try {
      const img = new window.Image();
      img.decoding = "async";
      img.src = src;
      await img.decode();
      const sx = Math.round(rect.x * natural.w);
      const sy = Math.round(rect.y * natural.h);
      const sw = Math.max(1, Math.round(rect.w * natural.w));
      const sh = Math.max(1, Math.round(rect.h * natural.h));
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D unavailable");
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      // PNG sources keep PNG (alpha survives, e.g. after bg removal);
      // everything else re-encodes to WebP like the uploader does.
      const isPng = src.toLowerCase().endsWith(".png");
      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, isPng ? "image/png" : "image/webp", 0.9)
      );
      if (!blob) throw new Error("Canvas export failed");
      const stem =
        src
          .split("/")
          .pop()
          ?.replace(/\.[^.]+$/, "") ?? "image";
      const file = new File([blob], `${stem}-crop.${isPng ? "png" : "webp"}`, {
        type: blob.type,
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
      setActive(false);
    } catch (err) {
      console.error("[Crop] failed:", err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!active) {
    return (
      <div className="space-y-1.5">
        <button
          type="button"
          disabled={!src || !local}
          onClick={() => {
            setRect({ x: 0, y: 0, w: 1, h: 1 });
            setAspectId("free");
            setError(null);
            setActive(true);
          }}
          className="kicker w-full px-3 py-2 rounded-sm bg-background/40 border border-border text-foreground hover:bg-foreground/10 hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Crop image
        </button>
        <p className="text-xs text-foreground/40 italic">
          {local
            ? "Saves the cropped region as a new file and selects it — the original stays in the library."
            : "Only local /uploads images can be cropped."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        className="relative mx-auto w-fit max-w-full select-none touch-none"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) =>
            setNatural({
              w: e.currentTarget.naturalWidth,
              h: e.currentTarget.naturalHeight,
            })
          }
          className="block max-h-80 max-w-full rounded-sm"
        />
        {/* Dim everything outside the crop rect. */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 bg-background/70 pointer-events-none"
          style={{ height: `${rect.y * 100}%` }}
        />
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 bg-background/70 pointer-events-none"
          style={{ height: `${(1 - rect.y - rect.h) * 100}%` }}
        />
        <div
          aria-hidden
          className="absolute left-0 bg-background/70 pointer-events-none"
          style={{
            top: `${rect.y * 100}%`,
            height: `${rect.h * 100}%`,
            width: `${rect.x * 100}%`,
          }}
        />
        <div
          aria-hidden
          className="absolute right-0 bg-background/70 pointer-events-none"
          style={{
            top: `${rect.y * 100}%`,
            height: `${rect.h * 100}%`,
            width: `${(1 - rect.x - rect.w) * 100}%`,
          }}
        />
        {/* The crop rect itself — drag to move, corners to resize. */}
        <div
          onPointerDown={(e) => startDrag(e, "move")}
          className="absolute border border-accent cursor-move"
          style={{
            left: `${rect.x * 100}%`,
            top: `${rect.y * 100}%`,
            width: `${rect.w * 100}%`,
            height: `${rect.h * 100}%`,
          }}
        >
          {CROP_HANDLES.map((hnd) => (
            <div
              key={hnd.mode}
              onPointerDown={(e) => startDrag(e, hnd.mode)}
              className={cn(
                "absolute h-3 w-3 rounded-full bg-accent",
                hnd.cls
              )}
            />
          ))}
        </div>
      </div>

      <SegmentBar
        options={CROP_ASPECTS.map((a) => a.id)}
        labels={Object.fromEntries(CROP_ASPECTS.map((a) => [a.id, a.label]))}
        value={aspectId}
        onChange={(v) => pickAspect(v as CropAspectId)}
      />

      {natural && (
        <p className="kicker text-foreground/40">
          {Math.max(1, Math.round(rect.w * natural.w))} ×{" "}
          {Math.max(1, Math.round(rect.h * natural.h))} px
        </p>
      )}
      {error && <p className="text-xs text-accent italic break-all">{error}</p>}

      <div className="flex gap-1">
        <button
          type="button"
          disabled={busy || !natural}
          onClick={apply}
          className="kicker flex-1 px-3 py-2 rounded-sm bg-accent text-accent-foreground transition-colors hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? "Saving…" : "Apply crop"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setActive(false)}
          className="kicker flex-1 px-3 py-2 rounded-sm bg-background/40 border border-border text-foreground hover:bg-foreground/10 transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/**
 * Click-to-pick + drag-and-drop image uploader. Posts to /api/admin/upload
 * which copies the file into public/uploads/ and returns its URL. Dev-only
 * (the API route 404s in production).
 */
/* ---------------- shared image dialog ----------------
   One popup used by the Image block, section background, and carousel items.
   Bundles upload + library pick + manual path + background-removal + preview
   so every place that chooses an image gets the same affordances (including
   selecting from the library) without duplicating the controls. */

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
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
      <div className="glass-panel relative z-10 w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-md border border-border p-5 shadow-2xl">
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

/** The per-image effect set the dialog's "Adjust" tab edits. Common to the
 *  Image block, section backgrounds, and carousel items. */
type ImageEffectValues = {
  filter: ImageProps["filter"];
  focalX: number;
  focalY: number;
  rotate: number;
  flipX: boolean;
  flipY: boolean;
  blur: number;
  zoom: number;
  tint: ImageProps["tint"];
  tintOpacity: number;
};

/**
 * Trigger + popup for choosing AND adjusting an image. `value` is the current
 * src; `onChange` fires live as the user uploads / picks / edits the path. When
 * `effects` + `onEffectsChange` are supplied the popup grows a tab bar so the
 * same dialog edits filter / tint / focal point / rotate / flip / blur too —
 * one reused editor across the Image block, section backgrounds and carousel
 * items. Background removal can be hidden for contexts where it doesn't apply.
 */
function ImageDialog({
  value,
  onChange,
  label = "image",
  enableRemoveBg = true,
  effects,
  onEffectsChange,
  effectsContext,
  fitAxis,
}: {
  value: string;
  onChange: (src: string) => void;
  label?: string;
  enableRemoveBg?: boolean;
  effects?: ImageEffectValues;
  onEffectsChange?: (patch: Record<string, unknown>) => void;
  effectsContext?: { fit: ImageProps["fit"]; aspect?: string };
  /** Section backgrounds only — shows the "scale to match" axis control
   *  in the Adjust tab. See ImageEffects. */
  fitAxis?: "both" | "x" | "y";
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"source" | "adjust">("source");
  const [libraryVersion, setLibraryVersion] = useState(0);
  const refreshLibrary = useCallback(
    () => setLibraryVersion((v) => v + 1),
    []
  );

  const hasEffects = !!effects && !!onEffectsChange;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-3 rounded-sm border border-border bg-background/40 p-2 text-left transition-colors hover:border-foreground/40"
      >
        <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-sm border border-border bg-surface">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center text-lg text-foreground/30">
              +
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-foreground">
            {value ? value.split("/").pop() : `Choose ${label}`}
          </span>
          <span className="kicker text-foreground/40 group-hover:text-accent">
            {value ? "click to change" : "upload or pick from library"}
          </span>
        </span>
      </button>

      {open && (
        <Modal title={`Edit ${label}`} onClose={() => setOpen(false)}>
          <div className="space-y-5">
            {hasEffects && (
              <div className="flex gap-1 rounded-sm border border-border bg-background/40 p-1">
                {(["source", "adjust"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={cn(
                      "kicker flex-1 rounded-sm px-3 py-2 transition-colors",
                      tab === t
                        ? "bg-accent text-accent-foreground"
                        : "text-foreground/70 hover:bg-foreground/10 hover:text-accent"
                    )}
                  >
                    {t === "source" ? "Source" : "Adjust"}
                  </button>
                ))}
              </div>
            )}

            {(!hasEffects || tab === "source") && (
              <>
                <div className="relative aspect-video w-full overflow-hidden rounded-sm border border-border bg-surface">
                  {value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={value}
                      alt=""
                      className="absolute inset-0 h-full w-full object-contain"
                    />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center kicker italic text-foreground/30">
                      No image selected
                    </div>
                  )}
                </div>

                <Field label="upload">
                  <ImageUploader
                    src={value}
                    onUploaded={(src) => {
                      onChange(src);
                      refreshLibrary();
                    }}
                  />
                </Field>

                <Field label="library">
                  <ImageLibrary
                    version={libraryVersion}
                    currentSrc={value}
                    onPick={(src) => onChange(src)}
                  />
                </Field>

                {value && (
                  <Field label="crop">
                    <CropTool
                      src={value}
                      onResult={(src) => {
                        onChange(src);
                        refreshLibrary();
                      }}
                    />
                  </Field>
                )}

                {enableRemoveBg && value && (
                  <Field label="remove background">
                    <RemoveBgButton
                      src={value}
                      onResult={(src) => {
                        onChange(src);
                        refreshLibrary();
                      }}
                    />
                  </Field>
                )}

                <Field label="src (manual path)">
                  <input
                    className={cn(inputCls, "font-sans text-xs")}
                    placeholder="/uploads/foo.webp"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                  />
                </Field>
              </>
            )}

            {hasEffects && tab === "adjust" && (
              <ImageEffects
                src={value}
                fit={effectsContext?.fit ?? "cover"}
                fitAxis={fitAxis}
                aspect={effectsContext?.aspect}
                filter={effects.filter}
                focalX={effects.focalX}
                focalY={effects.focalY}
                rotate={effects.rotate}
                flipX={effects.flipX}
                flipY={effects.flipY}
                blur={effects.blur}
                zoom={effects.zoom}
                tint={effects.tint}
                tintOpacity={effects.tintOpacity}
                onChange={onEffectsChange}
              />
            )}

            <div className="flex justify-end gap-2 pt-1">
              {value && (
                <button
                  type="button"
                  onClick={() => onChange("")}
                  className="kicker rounded-sm border border-border px-3 py-2 text-foreground/70 transition-colors hover:bg-foreground/10 hover:text-accent"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="kicker rounded-sm bg-accent px-3 py-2 text-accent-foreground transition-opacity hover:opacity-90"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

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

  async function uploadFile(rawFile: File) {
    setBusy(true);
    setError(null);
    try {
      // Downscale / re-encode oversized images in the browser before upload so
      // huge source files don't hit the body cap or end up on the live page.
      const file = await downscaleImage(rawFile);
      // Preflight the shared cap: past it the proxy's body clone truncates
      // the stream and the server can only answer "Invalid form data".
      // Mostly bites animated GIFs, which downscaleImage can't re-encode.
      if (file.size > UPLOAD_MAX_BYTES) {
        throw new Error(
          `File too large: ${(file.size / (1024 * 1024)).toFixed(1)} MB (max ${UPLOAD_MAX_MB} MB). ` +
            (file.type === "image/gif"
              ? "GIFs can't be compressed in-browser — trim it or convert to video."
              : "")
        );
      }
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
          className={cn(inputCls, "font-sans text-xs")}
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
          className={cn(inputCls, "font-sans text-xs")}
          placeholder="16/9"
          value={props.aspect}
          onChange={(e) => onUpdate({ aspect: e.target.value || "16/9" })}
        />
      </Field>

      <Field label="fit">
        <SegmentBar
          options={["width", "height"]}
          labels={{ width: "Width", height: "Height" }}
          value={props.fit}
          onChange={(v) => onUpdate({ fit: v })}
        />
        <p className="text-xs text-foreground/40 italic mt-1.5">
          {props.fit === "height"
            ? "Fills the block's height; width follows the aspect ratio."
            : "Fills the block's width; height follows the aspect ratio."}
        </p>
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
  availablePages = [],
  currentSlug,
  onUpdate,
}: {
  props: {
    label: string;
    href: string;
    variant: string;
    align: string;
    newTab: boolean;
  };
  availablePages?: string[];
  currentSlug?: string;
  onUpdate: (patch: Record<string, unknown>) => void;
}) {
  // Construction is the public landing — link to it as "/" rather than
  // "/construction" so behavior matches the routing.
  const slugToHref = (slug: string) =>
    slug === "construction" ? "/" : `/${slug}`;

  // What's currently selected in the picker, derived from href. We pick the
  // longest-matching slug so /work/dawngeon doesn't get matched as /work.
  const pickerValue: string = (() => {
    if (props.href === "/") return "construction";
    const candidates = availablePages
      .filter((s) => slugToHref(s) === props.href)
      .sort((a, b) => b.length - a.length);
    return candidates[0] ?? "";
  })();

  const pickablePages = availablePages.filter(
    (s) => s !== currentSlug && s !== "404"
  );

  return (
    <>
      <Field label="label">
        <input
          className={inputCls}
          value={props.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
        />
      </Field>
      <Field label="link to page">
        <select
          className={cn(inputCls, "appearance-none cursor-pointer")}
          value={pickerValue}
          onChange={(e) => {
            const v = e.target.value;
            if (!v) return; // "(custom URL)" — leave href as the user typed it
            onUpdate({ href: slugToHref(v) });
          }}
        >
          <option value="">(custom URL — type below)</option>
          {pickablePages.map((slug) => (
            <option key={slug} value={slug}>
              {slug === "construction" ? "/  (construction)" : `/${slug}`}
            </option>
          ))}
        </select>
      </Field>
      <Field label="href">
        <input
          className={cn(inputCls, "font-sans text-xs")}
          value={props.href}
          onChange={(e) => onUpdate({ href: e.target.value })}
          placeholder="/about, https://…, #section-id"
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
      <Field label="link behavior">
        <ToggleBtn
          label="Open in new tab"
          active={props.newTab}
          onToggle={() => onUpdate({ newTab: !props.newTab })}
        />
      </Field>
    </>
  );
}

/* ---------------- shared bits ---------------- */

function SectionHead({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <header>
      {subtitle && <p className="kicker">{subtitle}</p>}
      <h2 className="font-display font-bold text-2xl mt-1 flex items-center">
        {title}
        {children}
      </h2>
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
