import type {
  Block,
  BlockLayout,
  MobileBlockOverride,
  Section,
  SectionMobileOverride,
} from "@/lib/schema";
import { MOBILE_OVERRIDABLE_KEYS } from "@/lib/mobile-overrides";

export type Device = "desktop" | "mobile";

/* ============================================================
   Block-level merge / prune
   ============================================================ */

export function hasMobileOverrides(block: Block): boolean {
  const m = block.mobile;
  if (!m) return false;
  if (m.hidden) return true;
  if (m.layout && Object.keys(m.layout).length > 0) return true;
  if (m.props && Object.keys(m.props).length > 0) return true;
  return false;
}

/**
 * Returns a Block with desktop and mobile values merged for rendering on
 * mobile viewports. `mobile.layout` patches `layout`; `mobile.props`
 * patches `props` after filtering against the override allow-list (so a
 * stale key in saved JSON can't break the render).
 *
 * Pure function — does not mutate `block`.
 */
export function mergeBlockForMobile(block: Block): Block {
  const m = block.mobile;
  if (!m) return block;

  const mergedLayout: BlockLayout = m.layout
    ? { ...block.layout, ...m.layout }
    : block.layout;

  const mergedProps = m.props
    ? mergeFilteredProps(block.type, block.props, m.props)
    : block.props;

  // Keep the discriminant key intact via a per-type spread. The
  // discriminated-union typing means we can't just `{ ...block, layout, props }`
  // generically without TS losing the discriminant.
  return {
    ...block,
    layout: mergedLayout,
    props: mergedProps,
  } as Block;
}

function mergeFilteredProps(
  type: Block["type"],
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const allowed = MOBILE_OVERRIDABLE_KEYS[type];
  const out: Record<string, unknown> = { ...base };
  for (const key of allowed) {
    if (key in override) {
      const value = override[key];
      // `undefined` in the override means "clear and inherit" — skip the
      // copy so the desktop value stays.
      if (value !== undefined) out[key] = value;
    }
  }
  return out;
}

/* ============================================================
   Section-level merge
   ============================================================ */

export function hasSectionMobileOverrides(section: Section): boolean {
  const m = section.mobile;
  if (!m) return false;
  return (
    m.padding !== undefined ||
    m.minHeight !== undefined ||
    m.align !== undefined
  );
}

export function mergeSectionForMobile(section: Section): Section {
  const m = section.mobile;
  if (!m) return section;
  return {
    ...section,
    padding: m.padding ?? section.padding,
    minHeight: m.minHeight ?? section.minHeight,
    align: m.align ?? section.align,
  };
}

/* ============================================================
   Pruning — keep saved JSON minimal
   ============================================================ */

/**
 * After every mobile-scoped mutation we run pruneMobile so the JSON only
 * holds keys that genuinely differ from desktop. Empty `mobile.layout` /
 * `mobile.props` get dropped; a fully empty `mobile` becomes undefined.
 *
 * Pure — returns a new Block.
 */
export function pruneMobile(block: Block): Block {
  const m = block.mobile;
  if (!m) return block;

  const next: MobileBlockOverride = {};

  if (m.hidden) next.hidden = true;

  if (m.layout) {
    const layout: NonNullable<MobileBlockOverride["layout"]> = {};
    if (m.layout.col !== undefined) layout.col = m.layout.col;
    if (m.layout.colSpan !== undefined) layout.colSpan = m.layout.colSpan;
    if (m.layout.row !== undefined) layout.row = m.layout.row;
    if (m.layout.rowSpan !== undefined) layout.rowSpan = m.layout.rowSpan;
    if (Object.keys(layout).length > 0) next.layout = layout;
  }

  if (m.props) {
    const allowed = MOBILE_OVERRIDABLE_KEYS[block.type];
    const props: Record<string, unknown> = {};
    for (const key of allowed) {
      const value = m.props[key];
      if (value !== undefined) props[key] = value;
    }
    if (Object.keys(props).length > 0) next.props = props;
  }

  const isEmpty =
    !next.hidden &&
    !next.layout &&
    !next.props;

  return { ...block, mobile: isEmpty ? undefined : next } as Block;
}

export function pruneSectionMobile(section: Section): Section {
  const m = section.mobile;
  if (!m) return section;
  const next: SectionMobileOverride = {};
  if (m.padding !== undefined) next.padding = m.padding;
  if (m.minHeight !== undefined) next.minHeight = m.minHeight;
  if (m.align !== undefined) next.align = m.align;
  const isEmpty = Object.keys(next).length === 0;
  return { ...section, mobile: isEmpty ? undefined : next };
}

/* ============================================================
   Auto-stack — derive a mobile layout from the desktop layout

   When the user authors a side-by-side desktop layout (image left,
   text right) the mobile rendering looks broken: blocks crash into
   each other in a 12-col grid that's only 425px wide. The auto-stack
   pass collapses every block to a full-width vertical stack, ordered
   top-to-bottom then left-to-right (reading order).

   Each block's `rowSpan` is preserved as-is — the image stays as tall
   as it was on desktop, the headline keeps its leading. The user can
   refine after.

   Existing `mobile.layout` overrides are WIPED — the caller is
   expected to confirm with the user before invoking this.
   ============================================================ */

export function autoStackSection(section: Section): Section {
  // Reading order: top first, then left.
  const ordered = [...section.blocks].sort((a, b) => {
    const ay = a.layout.row ?? 1;
    const by = b.layout.row ?? 1;
    if (ay !== by) return ay - by;
    return a.layout.col - b.layout.col;
  });

  const stacked = new Map<string, BlockLayout>();
  let cursor = 1;
  for (const b of ordered) {
    const rowSpan = b.layout.rowSpan ?? 6;
    stacked.set(b.id, { col: 1, colSpan: 12, row: cursor, rowSpan });
    cursor += rowSpan;
  }

  return {
    ...section,
    blocks: section.blocks.map((b) => {
      const layout = stacked.get(b.id);
      if (!layout) return b;
      const patch = diffMobileLayout(b.layout, layout);
      const currentMobile = b.mobile ?? {};
      return pruneMobile({
        ...b,
        mobile: { ...currentMobile, layout: patch },
      } as Block);
    }),
  };
}

/** Apply auto-stack to every section in the page. */
export function autoStackPage<P extends { sections: Section[] }>(page: P): P {
  return { ...page, sections: page.sections.map(autoStackSection) };
}

/* ============================================================
   Layout patch diff — only persist what differs from desktop
   ============================================================ */

/**
 * Compute the sparse mobile layout patch from a fresh layout snapshot
 * (e.g. what RGL gave us after a drag) versus the desktop baseline.
 * Keys that match the desktop baseline are dropped from the patch.
 */
export function diffMobileLayout(
  desktop: BlockLayout,
  next: BlockLayout,
): NonNullable<MobileBlockOverride["layout"]> | undefined {
  const patch: NonNullable<MobileBlockOverride["layout"]> = {};
  if (next.col !== desktop.col) patch.col = next.col;
  if (next.colSpan !== desktop.colSpan) patch.colSpan = next.colSpan;
  if ((next.row ?? undefined) !== (desktop.row ?? undefined)) {
    if (next.row !== undefined) patch.row = next.row;
  }
  if ((next.rowSpan ?? undefined) !== (desktop.rowSpan ?? undefined)) {
    if (next.rowSpan !== undefined) patch.rowSpan = next.rowSpan;
  }
  return Object.keys(patch).length > 0 ? patch : undefined;
}
