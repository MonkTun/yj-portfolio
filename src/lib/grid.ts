/**
 * Layout grid metrics — the single source of truth for BOTH axes, shared by
 * the public renderer and the editor canvas.
 *
 * Horizontal is legible by construction: `col` / `colSpan` are indices into
 * 12 columns, so a block is always "on" the grid and the editor can draw the
 * tracks it snaps to.
 *
 * Vertical used to have no equivalent. `row` / `rowSpan` were counted in 8px
 * units — far too small to read as a grid, so blocks landed on arbitrary
 * offsets and nothing lined up across sections. A row is now 16px, the same
 * as the column gutter: one base unit governs both axes, and a row is to the
 * vertical axis what a column is to the horizontal one.
 *
 * `content/` was migrated when this changed (Aug 2026) by halving every row
 * EDGE rather than each `row` / `rowSpan` independently, which is what kept
 * shared edges shared and stacking order intact. A 24px-rhythm layout cannot
 * land exactly on a 16px grid, so edges moved by up to 8px; nothing moved
 * further, and no block changed its position relative to another.
 *
 * `ROWS_PER_MODULE` is the knob for a coarser snap than one row. At 1 the row
 * IS the module and the snap helpers below are identities; raise it to 2 for
 * a 32px step and the constraint, the guides, and `fitRowSpan` all follow —
 * but existing layouts would then need snapping the same way `content/` was.
 */

export const GRID_COLS = 12;

/** Height of one `rowSpan` unit — the vertical base unit, matching COL_GAP_PX. */
export const ROW_HEIGHT_PX = 16;

/** Horizontal gutter between columns, in px. */
export const COL_GAP_PX = 16;

/** The vertical authoring module: how many rows a block snaps to. */
export const ROWS_PER_MODULE = 1;

/** The module in pixels — the vertical counterpart to a column. */
export const MODULE_PX = ROW_HEIGHT_PX * ROWS_PER_MODULE;

/** The editor draws a heavier rule every Nth module so tall sections stay countable. */
export const MODULES_PER_MAJOR = 4;

/**
 * Nominal rendered width of the desktop content box: the section grid is
 * `max-w-7xl` (1280px) minus `px-10` (2 × 40px). Used wherever a colSpan
 * needs converting to real pixels (e.g. deriving mobile layouts).
 */
export const DESKTOP_CONTENT_PX = 1200;

/** Width the editor renders the mobile canvas at (iPhone-ish). */
export const MOBILE_CANVAS_PX = 425;

/** Mobile content box: the canvas width minus `px-6` (2 × 24px). */
export const MOBILE_CONTENT_PX = MOBILE_CANVAS_PX - 48;

/** Rendered px width of a `colSpan` inside a content box `contentPx` wide. */
export function colSpanPx(colSpan: number, contentPx: number): number {
  const unit = (contentPx - (GRID_COLS - 1) * COL_GAP_PX) / GRID_COLS;
  return colSpan * unit + (colSpan - 1) * COL_GAP_PX;
}

/** The colSpan whose rendered width in `contentPx` sits nearest `targetPx`. */
export function colSpanForPx(targetPx: number, contentPx: number): number {
  const unit = (contentPx - (GRID_COLS - 1) * COL_GAP_PX) / GRID_COLS;
  const span = Math.round((targetPx + COL_GAP_PX) / (unit + COL_GAP_PX));
  return Math.min(GRID_COLS, Math.max(1, span));
}

/** Snap a 0-indexed row offset (react-grid-layout's `y`) to the module. */
export function snapRowOffset(y: number): number {
  return Math.max(0, Math.round(y / ROWS_PER_MODULE) * ROWS_PER_MODULE);
}

/** Snap a 1-indexed schema `row` to the module. */
export function snapRow(row: number): number {
  return snapRowOffset(row - 1) + 1;
}

/**
 * Snap a `rowSpan` to a whole number of modules, minimum one.
 * Rounds — use this for interactive resize, where stepping to the nearest
 * module is what feels right under the cursor.
 */
export function snapRowSpan(span: number): number {
  return Math.max(
    ROWS_PER_MODULE,
    Math.round(span / ROWS_PER_MODULE) * ROWS_PER_MODULE,
  );
}

/**
 * Grow a `rowSpan` to the next whole module, minimum one.
 * Rounds UP — use this whenever a height is being derived rather than dragged
 * (defaults, auto-stack, templates) so a block's box never shrinks under its
 * content just to sit on the grid.
 */
export function fitRowSpan(span: number): number {
  return Math.max(
    ROWS_PER_MODULE,
    Math.ceil(span / ROWS_PER_MODULE) * ROWS_PER_MODULE,
  );
}
