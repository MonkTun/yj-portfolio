import type { Section, Block, BlockLayout } from "@/lib/schema";
import { atomRegistry } from "@/lib/atom-registry";
import { cn } from "@/lib/utils";
import {
  hasMobileOverrides,
  hasSectionMobileOverrides,
  mergeBlockForMobile,
} from "@/lib/responsive";
import {
  imageFilterAndBlurCss,
  imageTintBgClass,
  imageTintMaskStyle,
  imageTransformCss,
} from "@/components/atoms/imageStyles";
import { SectionReactBitsBackground } from "@/components/SectionReactBitsBackground";
import { SectionVideoBackground } from "@/components/SectionVideoBackground";

/**
 * Section padding / minHeight / align — split into mobile (small) and
 * desktop (md+) maps so per-section overrides can be composed without
 * fighting Tailwind specificity.
 *
 * Public site: emit both. The unprefixed mobile class wins below md;
 * the `md:`-prefixed desktop class wins above. If `section.mobile.X` is
 * set, the mobile half reads the override; the desktop half always reads
 * the base value. Tailwind JIT requires literal class names, so we keep
 * one full prefixed copy of each map alongside the bare one.
 *
 * Editor canvas: composes either map directly (no `md:`) so the canvas
 * accurately previews whichever device is active, regardless of the
 * actual browser viewport width.
 */
const PADDING_MOBILE = {
  none: "py-0",
  sm: "py-8",
  md: "py-16",
  lg: "py-24",
  xl: "py-32",
} as const;

const PADDING_DESKTOP_RAW = {
  none: "py-0",
  sm: "py-12",
  md: "py-20",
  lg: "py-32",
  xl: "py-48",
} as const;

const PADDING_DESKTOP_MD = {
  none: "md:py-0",
  sm: "md:py-12",
  md: "md:py-20",
  lg: "md:py-32",
  xl: "md:py-48",
} as const;

const MIN_HEIGHT_MOBILE = {
  auto: "min-h-0",
  half: "min-h-[50vh]",
  screen: "min-h-screen",
} as const;

const MIN_HEIGHT_DESKTOP_RAW = {
  auto: "min-h-0",
  half: "min-h-[50vh]",
  screen: "min-h-screen",
} as const;

const MIN_HEIGHT_DESKTOP_MD = {
  auto: "md:min-h-0",
  half: "md:min-h-[50vh]",
  screen: "md:min-h-screen",
} as const;

const ALIGN_MOBILE = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
} as const;

const ALIGN_DESKTOP_RAW = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
} as const;

const ALIGN_DESKTOP_MD = {
  top: "md:items-start",
  center: "md:items-center",
  bottom: "md:items-end",
} as const;

/**
 * Public-site classes for a section. Emits both the mobile and the
 * `md:`-prefixed desktop variants so the responsive override happens
 * via Tailwind's media query, with no JS.
 */
export function sectionResponsiveClasses(section: Section): string {
  const m = section.mobile;
  const mobilePadding = m?.padding ?? section.padding;
  const mobileMinH = m?.minHeight ?? section.minHeight;
  const mobileAlign = m?.align ?? section.align;
  return cn(
    PADDING_MOBILE[mobilePadding],
    PADDING_DESKTOP_MD[section.padding],
    MIN_HEIGHT_MOBILE[mobileMinH],
    MIN_HEIGHT_DESKTOP_MD[section.minHeight],
    ALIGN_MOBILE[mobileAlign],
    ALIGN_DESKTOP_MD[section.align],
  );
}

/**
 * Editor-canvas classes for a section. The editor uses JS state (`device`)
 * to drive the preview, so it needs unprefixed classes that fire regardless
 * of the surrounding browser viewport width.
 */
export function sectionEditorClasses(
  section: Section,
  device: "desktop" | "mobile",
): string {
  if (device === "mobile") {
    const m = section.mobile;
    return cn(
      PADDING_MOBILE[m?.padding ?? section.padding],
      MIN_HEIGHT_MOBILE[m?.minHeight ?? section.minHeight],
      ALIGN_MOBILE[m?.align ?? section.align],
    );
  }
  return cn(
    PADDING_DESKTOP_RAW[section.padding],
    MIN_HEIGHT_DESKTOP_RAW[section.minHeight],
    ALIGN_DESKTOP_RAW[section.align],
  );
}

const ROW_HEIGHT_PX = 8;

/**
 * Class + style for a section background. Image / video / reactbits get
 * rendered as siblings (see the dedicated components below); this helper
 * handles the simpler cases inline.
 *
 * For `type: "reverse"` we paint the section in `--foreground` and then
 * remap `--background` / `--foreground` on an inner wrapper so descendants
 * (text-foreground utilities, bg-surface, etc.) inherit the swapped
 * values. Single-element swap would create a CSS variable cycle, so the
 * capture (`--swap-bg`/`--swap-fg`) lives on the section and the swap
 * lives on the inner content div — see `innerStyle` below.
 */
export function sectionBackgroundStyle(
  bg: Section["background"],
): {
  className?: string;
  style?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
} {
  if (bg.type === "color") {
    if (bg.token === "background") return {};
    if (bg.token === "surface") return { className: "bg-surface" };
    if (bg.token === "accent") return { className: "bg-accent text-accent-foreground" };
  }
  if (bg.type === "reverse") {
    return {
      className: "bg-foreground text-background",
      style: {
        // Capture the original tokens so the inner wrapper can read them
        // back without referencing the to-be-redefined names directly.
        ["--swap-bg" as string]: "var(--background)",
        ["--swap-fg" as string]: "var(--foreground)",
      } as React.CSSProperties,
      innerStyle: {
        // Now flip them for everything inside.
        ["--background" as string]: "var(--swap-fg)",
        ["--foreground" as string]: "var(--swap-bg)",
      } as React.CSSProperties,
    };
  }
  return {};
}

type Props = {
  section: Section;
  /** Optional render override for each block (used by the editor to wrap
   *  blocks in selection frames). */
  renderBlock?: (block: Block) => React.ReactNode;
};

export function SectionRenderer({ section, renderBlock }: Props) {
  const { className, style, innerStyle } = sectionBackgroundStyle(
    section.background,
  );

  return (
    <section
      // The section's id doubles as a fragment anchor (`/#sec_…`) so the
      // editor's "Preview" button can deep-link to wherever the user left
      // off — see Editor.tsx for how that's computed.
      id={section.id}
      style={style}
      className={cn(
        "relative w-full flex overflow-hidden",
        sectionResponsiveClasses(section),
        className,
      )}
      data-has-mobile-overrides={
        hasSectionMobileOverrides(section) ? "true" : undefined
      }
    >
      <SectionImageBackground bg={section.background} />
      <SectionVideoBackground bg={section.background} />
      <SectionReactBitsBackground bg={section.background} />

      <div
        className="relative w-full max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-12 gap-x-4"
        style={{
          gridAutoRows: `${ROW_HEIGHT_PX}px`,
          ...innerStyle,
        }}
      >
        {section.blocks.map((block) =>
          renderBlock ? (
            // Editor path — the caller (SectionFrame / SectionGrid) handles
            // device-specific rendering itself, so dual-render isn't needed
            // here. We still apply mobileHiddenClass for live preview of
            // the `mobile.hidden` toggle in the canvas's mobile mode.
            <div
              key={block.id}
              style={blockGridStyle(block.layout)}
              className={mobileHiddenClass(block)}
            >
              {renderBlock(block)}
            </div>
          ) : (
            <PublicBlock key={block.id} block={block} />
          )
        )}
      </div>
    </section>
  );
}

function PublicBlock({ block }: { block: Block }) {
  // Common case — no per-breakpoint overrides. Render once with the
  // canonical id and the existing `mobile.hidden` class. Equivalent to
  // the pre-mobile-editor behavior, so existing pages stay byte-identical
  // in the rendered DOM.
  if (!hasMobileOverrides(block)) {
    return <SingleBlock block={block} carryId />;
  }

  // Override path — render the desktop and mobile variants as siblings,
  // each visible at its own breakpoint. Only the desktop variant carries
  // the canonical `id` so anchor deep-links resolve unambiguously.
  // Soft-limitation: a `#blockId` jump opened on a real phone viewport
  // lands on a `display:none` element, so the scroll target is imprecise
  // — acceptable because the editor's deep-link feature is a desktop
  // authoring affordance.
  const merged = mergeBlockForMobile(block);
  return (
    <>
      <SingleBlock block={block} carryId extraClass="max-md:hidden" />
      <SingleBlock block={merged} carryId={false} extraClass="md:hidden" />
    </>
  );
}

function SingleBlock({
  block,
  carryId,
  extraClass,
}: {
  block: Block;
  carryId: boolean;
  extraClass?: string;
}) {
  const Atom = atomRegistry[block.type].component;
  return (
    <div
      id={carryId ? block.id : undefined}
      style={blockGridStyle(block.layout)}
      className={cn(mobileHiddenClass(block), extraClass)}
    >
      <Atom {...(block.props as object)} />
    </div>
  );
}

export function blockGridStyle(layout: BlockLayout): React.CSSProperties {
  const { col, colSpan, row, rowSpan } = layout;
  return {
    gridColumn: `${col} / span ${colSpan}`,
    gridRow:
      row !== undefined
        ? `${row} / span ${rowSpan ?? 1}`
        : rowSpan !== undefined
          ? `auto / span ${rowSpan}`
          : undefined,
  };
}

export function mobileHiddenClass(block: Block): string {
  return block.mobile?.hidden ? "max-md:hidden" : "";
}

/**
 * Renders a section's image background as an absolute-positioned <img> so
 * the same non-destructive effects (focal/filter/rotate/flip) used by the
 * Image atom apply the same way here. Sits behind everything in the
 * section; the overlay is a separate div on top of it.
 */
export function SectionImageBackground({ bg }: { bg: Section["background"] }) {
  if (bg.type !== "image" || !bg.src) return null;
  const tintClass = imageTintBgClass[bg.tint];
  const showTint = tintClass !== null && bg.tintOpacity > 0;
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={bg.src}
        alt=""
        aria-hidden
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          objectPosition: `${bg.focalX}% ${bg.focalY}%`,
          filter: imageFilterAndBlurCss(bg.filter, bg.blur),
          transform: imageTransformCss({
            rotate: bg.rotate,
            flipX: bg.flipX,
            flipY: bg.flipY,
          }),
        }}
      />
      {bg.overlay > 0 && (
        <div
          aria-hidden
          className="absolute inset-0 bg-background pointer-events-none"
          style={{ opacity: bg.overlay / 100 }}
        />
      )}
      {showTint && (
        <div
          aria-hidden
          className={cn("absolute inset-0 pointer-events-none", tintClass)}
          style={{
            opacity: bg.tintOpacity / 100,
            ...imageTintMaskStyle({
              src: bg.src,
              fit: "cover",
              focalX: bg.focalX,
              focalY: bg.focalY,
              rotate: bg.rotate,
              flipX: bg.flipX,
              flipY: bg.flipY,
            }),
          }}
        />
      )}
    </>
  );
}
