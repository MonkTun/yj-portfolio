"use client";

import { useCallback, useState } from "react";

/**
 * Tracks whether a piece of media has finished loading. Keyed on `src`, so
 * swapping the source (e.g. editing the URL in the editor) brings the
 * skeleton back until the new asset lands.
 *
 * Spread `ref`, `onLoad` and `onError` onto the <img> / <NextImage>. The ref
 * catches images that finished before hydration (cached or SSR'd): React
 * doesn't replay a `load` that fired before its listener was attached, so
 * without the `complete` check the skeleton would sit there forever.
 * Errors also count as "done" — a broken image shouldn't shimmer endlessly.
 */
export function useMediaLoaded(src: string | undefined) {
  const [doneSrc, setDoneSrc] = useState<string | undefined>(undefined);
  const markDone = useCallback(() => setDoneSrc(src), [src]);
  const ref = useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete) setDoneSrc(src);
    },
    [src]
  );
  return {
    loaded: doneSrc === src,
    mediaProps: { ref, onLoad: markDone, onError: markDone },
  };
}

/**
 * Shimmering placeholder laid over a media frame while it loads — a surface
 * panel with a soft band sweeping left → right (`.media-skeleton` in
 * globals.css). Fades out once `loaded` flips. The parent must be
 * positioned; this fills it.
 */
export function MediaSkeleton({ loaded }: { loaded: boolean }) {
  return <div aria-hidden className="media-skeleton" data-loaded={loaded} />;
}
