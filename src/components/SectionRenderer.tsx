import type { Section, Block } from "@/lib/schema";
import { atomRegistry } from "@/lib/atom-registry";
import { cn } from "@/lib/utils";
import {
  imageFilterAndBlurCss,
  imageTintBgClass,
  imageTintMaskStyle,
  imageTransformCss,
} from "@/components/atoms/imageStyles";
import { youtubeEmbedUrl } from "@/lib/youtube";

export const SECTION_PADDING_CLASS = {
  none: "py-0",
  sm: "py-8 md:py-12",
  md: "py-16 md:py-20",
  lg: "py-24 md:py-32",
  xl: "py-32 md:py-48",
} as const;

export const SECTION_MIN_HEIGHT_CLASS = {
  auto: "",
  half: "min-h-[50vh]",
  screen: "min-h-screen",
} as const;

export const SECTION_ALIGN_CLASS = {
  top: "items-start",
  center: "items-center",
  bottom: "items-end",
} as const;

const ROW_HEIGHT_PX = 8;

/**
 * Class for a section background that's a color token. Image backgrounds
 * are now rendered as a real <img> element (see SectionImageBackground)
 * so all the same non-destructive effects as the Image atom apply.
 */
export function sectionBackgroundStyle(
  bg: Section["background"]
): { className?: string } {
  if (bg.type === "color") {
    if (bg.token === "background") return {};
    if (bg.token === "surface") return { className: "bg-surface" };
    if (bg.token === "accent") return { className: "bg-accent text-accent-foreground" };
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
  const { className } = sectionBackgroundStyle(section.background);

  return (
    <section
      // The section's id doubles as a fragment anchor (`/#sec_…`) so the
      // editor's "Preview" button can deep-link to wherever the user left
      // off — see Editor.tsx for how that's computed.
      id={section.id}
      className={cn(
        "relative w-full flex overflow-hidden",
        SECTION_PADDING_CLASS[section.padding],
        SECTION_MIN_HEIGHT_CLASS[section.minHeight],
        SECTION_ALIGN_CLASS[section.align],
        className
      )}
    >
      <SectionImageBackground bg={section.background} />
      <SectionVideoBackground bg={section.background} />

      <div
        className="relative w-full max-w-7xl mx-auto px-6 md:px-10 grid grid-cols-12 gap-x-4"
        style={{
          gridAutoRows: `${ROW_HEIGHT_PX}px`,
        }}
      >
        {section.blocks.map((block) =>
          renderBlock ? (
            <div
              key={block.id}
              style={blockGridStyle(block)}
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
  const Atom = atomRegistry[block.type].component;
  return (
    <div
      id={block.id}
      style={blockGridStyle(block)}
      className={mobileHiddenClass(block)}
    >
      <Atom {...(block.props as object)} />
    </div>
  );
}

export function blockGridStyle(block: Block): React.CSSProperties {
  const { col, colSpan, row, rowSpan } = block.layout;
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
/**
 * YouTube background with object-cover-style scaling. The inner div is
 * sized to *at least* fill the container in both axes while keeping its
 * 16:9 aspect — whichever min wins decides the final size, the other axis
 * grows past the container, and `overflow-hidden` on the section crops it.
 * Pure CSS; no resize observer needed.
 */
export function SectionVideoBackground({
  bg,
}: {
  bg: Section["background"];
}) {
  if (bg.type !== "video") return null;
  const embed = youtubeEmbedUrl(bg.url, {
    autoplay: true,
    muted: bg.muted,
    loop: bg.loop,
    controls: false,
    start: bg.start,
  });
  if (!embed) return null;
  const tintClass = imageTintBgClass[bg.tint];
  const showTint = tintClass !== null && bg.tintOpacity > 0;
  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 min-w-full min-h-full"
          style={{ aspectRatio: "16 / 9" }}
        >
          <iframe
            src={embed}
            title="Section background video"
            className="absolute inset-0 h-full w-full pointer-events-none"
            allow="autoplay; encrypted-media; picture-in-picture"
            tabIndex={-1}
            aria-hidden
          />
        </div>
      </div>
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
          style={{ opacity: bg.tintOpacity / 100 }}
        />
      )}
    </>
  );
}

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
