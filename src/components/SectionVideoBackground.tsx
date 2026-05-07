"use client";

import { useEffect, useRef } from "react";
import type { Section } from "@/lib/schema";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { imageTintBgClass } from "@/components/atoms/imageStyles";
import { cn } from "@/lib/utils";

// YouTube's IFrame API only honors a fixed set of playback rates; other
// values either do nothing or get rounded silently. Snap to the closest
// allowed value so a stale slider position can't make the video lock up.
const ALLOWED_RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
function snapRate(rate: number): number {
  return ALLOWED_RATES.reduce((best, r) =>
    Math.abs(r - rate) < Math.abs(best - rate) ? r : best
  , 1 as number);
}

/**
 * YouTube background with object-cover-style scaling. The inner div is
 * sized to *at least* fill the container in both axes while keeping its
 * 16:9 aspect — whichever min wins decides the final size, the other axis
 * grows past the container, and `overflow-hidden` on the section crops it.
 *
 * Playback rate is applied via the YouTube IFrame postMessage protocol —
 * URL params can't set rate, so we wait for the player's `onReady` event
 * and then send `setPlaybackRate`.
 */
export function SectionVideoBackground({
  bg,
}: {
  bg: Section["background"];
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (bg.type !== "video") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    const rate = snapRate(bg.playbackRate);

    function send(payload: object) {
      iframe?.contentWindow?.postMessage(JSON.stringify(payload), "*");
    }

    // Subscribe so the iframe will emit `onReady` / `infoDelivery` events.
    function subscribe() {
      send({ event: "listening" });
    }
    function applyRate() {
      send({ event: "command", func: "setPlaybackRate", args: [rate] });
    }

    function onMessage(e: MessageEvent) {
      if (e.source !== iframe?.contentWindow) return;
      // YouTube messages are JSON strings; ignore anything else (extensions
      // sometimes shout into the same channel).
      let data: { event?: string; info?: { playerState?: number } } | null = null;
      if (typeof e.data === "string") {
        try {
          data = JSON.parse(e.data);
        } catch {
          return;
        }
      } else if (typeof e.data === "object") {
        data = e.data as typeof data;
      }
      if (!data) return;
      // Re-apply on every "playing" tick — YouTube resets the rate when
      // looping a muted background, so a one-shot setter drifts back to 1×.
      if (data.event === "onReady") applyRate();
      if (data.event === "infoDelivery") applyRate();
    }

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", subscribe);
    // The player can be ready before our load handler attaches when it's
    // served from the YT cache; nudge it.
    subscribe();
    const t = setTimeout(applyRate, 800);

    return () => {
      window.removeEventListener("message", onMessage);
      iframe.removeEventListener("load", subscribe);
      clearTimeout(t);
    };
    // bg.playbackRate is the only knob users tweak after mount; the rest
    // come bundled in the URL/embed and a remount happens via the parent.
  }, [bg]);

  if (bg.type !== "video") return null;
  const embed = youtubeEmbedUrl(bg.url, {
    autoplay: true,
    muted: bg.muted,
    loop: bg.loop,
    controls: false,
    start: bg.start,
    enableJsApi: true,
    origin: typeof window !== "undefined" ? window.location.origin : undefined,
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
            ref={iframeRef}
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
