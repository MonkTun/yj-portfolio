import type { BlockType } from "@/lib/schema";

/**
 * The prop keys per block type that can be overridden in mobile mode.
 *
 * Squarespace-style scope: layout, sizing, alignment, and visual variants —
 * NOT content/src/href/label. Keeping this list narrow avoids JSON bloat
 * (mobile data only stores what differs) and avoids the editor turning
 * into a per-breakpoint copywriting tool.
 *
 * The list drives two things:
 *   - PropertiesPanel: which fields render an "override" affordance in
 *     mobile mode and which render read-only with an "edit on desktop" hint.
 *   - The merge helper in lib/responsive.ts: keys outside the list are
 *     dropped during merge so a stale list change can't poison saved JSON.
 *
 * Adding a new override key is a deliberate act — touch this file AND the
 * panel UI together so the user can actually edit what you allow.
 */
export const MOBILE_OVERRIDABLE_KEYS: Record<BlockType, readonly string[]> = {
  text: ["align", "fontSize", "lineHeight", "letterSpacing", "transform"],
  image: ["fit", "aspect", "radius"],
  button: ["align", "variant"],
  spacer: ["height"],
  line: [],
  quote: [],
  video: ["aspect", "radius"],
};

export function isMobileOverridable(type: BlockType, key: string): boolean {
  return MOBILE_OVERRIDABLE_KEYS[type].includes(key);
}
