"use client";

import { useEffect, useState } from "react";

/** Live content-box size of an element (0×0 until first measured). */
export function useElementSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((s) =>
        s.width === width && s.height === height ? s : { width, height },
      );
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/**
 * Whether an element is within `rootMargin` of `root` (the viewport by
 * default). `once` latches the first `true` — for "start loading when it
 * gets close"; without it the value tracks the element in and out — for
 * "only keep this rendered while it's near".
 *
 * Inside a scroll container, pass the container as `root`: the margin only
 * grows the root, so against the viewport a clipped child would never
 * count as near before it was actually visible.
 */
export function useIntersecting(
  ref: React.RefObject<HTMLElement | null>,
  {
    root,
    rootMargin = "0px",
    once = false,
  }: {
    root?: React.RefObject<HTMLElement | null>;
    rootMargin?: string;
    once?: boolean;
  } = {},
) {
  const [hit, setHit] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || (once && hit)) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!once) setHit(entry.isIntersecting);
        else if (entry.isIntersecting) setHit(true);
      },
      { root: root?.current ?? null, rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, root, rootMargin, once, hit]);
  return hit;
}

/** `value`, settled for `ms` — but the first non-zero value passes straight
 *  through so an initial measurement isn't held back. */
export function useDebouncedValue(value: number, ms: number) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return settled === 0 ? value : settled;
}
