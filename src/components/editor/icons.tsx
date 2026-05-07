/**
 * Tiny set of inline icons reused across editor toolbars. Hand-rolled SVGs
 * so we don't pull in lucide-react just for a handful of glyphs.
 */

const sw = "1.5";

export function DragIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor" aria-hidden>
      <circle cx="6" cy="3" r="1.2" />
      <circle cx="10" cy="3" r="1.2" />
      <circle cx="6" cy="8" r="1.2" />
      <circle cx="10" cy="8" r="1.2" />
      <circle cx="6" cy="13" r="1.2" />
      <circle cx="10" cy="13" r="1.2" />
    </svg>
  );
}

export function DupeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
      <rect x="2.5" y="2.5" width="8" height="8" rx="1.2" />
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" />
    </svg>
  );
}

export function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" aria-hidden>
      <path d="M3 4.5h10M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5M5 4.5l.6 8.2a1 1 0 0 0 1 1h2.8a1 1 0 0 0 1-1l.6-8.2" />
    </svg>
  );
}

export function ArrowUpIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 13V3M3 8l5-5 5 5" />
    </svg>
  );
}

export function ArrowDownIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 3v10M3 8l5 5 5-5" />
    </svg>
  );
}

/** Four-way arrow — universal "move / drag" affordance. */
export function MoveIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 1.5v13M1.5 8h13" />
      <path d="M5.5 4 8 1.5 10.5 4" />
      <path d="M5.5 12 8 14.5 10.5 12" />
      <path d="M4 5.5 1.5 8 4 10.5" />
      <path d="M12 5.5 14.5 8 12 10.5" />
    </svg>
  );
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}

export function PaintIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
      <path d="M2.5 6.5h11l-1 5h-9z" />
      <path d="M5 6.5V4a3 3 0 0 1 6 0v2.5" />
    </svg>
  );
}

export function PaddingIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
      <rect x="2" y="2" width="12" height="12" rx="1" />
      <rect x="5" y="5" width="6" height="6" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function AlignTopIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
      <path d="M3 3h10" strokeLinecap="round" />
      <rect x="6" y="6" width="4" height="7" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function AlignCenterIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
      <path d="M3 8h10" strokeLinecap="round" strokeDasharray="2 2" />
      <rect x="6" y="5" width="4" height="6" rx="0.5" fill="currentColor" />
    </svg>
  );
}

export function AlignBottomIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={sw} aria-hidden>
      <path d="M3 13h10" strokeLinecap="round" />
      <rect x="6" y="3" width="4" height="7" rx="0.5" fill="currentColor" />
    </svg>
  );
}
