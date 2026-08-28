"use client";

import { useRef, useState } from "react";
import type { VideoProps } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtube";
import { useEdit } from "@/components/EditContext";

/** "16/9" → 16/9 as a number. Tolerates spaces and bare numbers. */
function parseAspectRatio(aspect: string): number {
  const [w, h = "1"] = (aspect || "16/9").split("/");
  const num = parseFloat(w);
  const den = parseFloat(h);
  return num > 0 && den > 0 ? num / den : 16 / 9;
}

/**
 * YouTube video atom. In the editor the iframe stays inert so clicks
 * select the block (and mount the resize grips) instead of feeding the
 * player. On the public site the iframe is *also* inert until clicked:
 * wheel events over a cross-origin iframe are swallowed by the embed, so
 * an always-interactive player blocks page scroll whenever the cursor
 * crosses it. A click engages the player (and asks it to play via the
 * IFrame API so the first click isn't dead); moving the pointer off the
 * block disengages it so scrolling works again.
 *
 * Sizing: `fit: "width"` fills the block's width and derives height from
 * `aspect`. `fit: "height"` sizes the frame from the block's *height* —
 * width is computed from the measured cell height via container-query
 * units, and if that width doesn't fit the whole frame scales down
 * (contain semantics). Either way the frame is always exactly `aspect`,
 * so the YouTube player never letterboxes inside it. `fit: "height"`
 * requires a definite block height, which the grid layout provides.
 */
export function Video(props: VideoProps) {
  const { url, autoplay, muted, loop, controls, start, aspect, fit, radius } =
    props;
  const editing = useEdit() !== null;
  const embed = youtubeEmbedUrl(url, {
    autoplay,
    muted,
    loop,
    controls,
    start,
    enableJsApi: !editing,
  });
  const ratio = parseAspectRatio(aspect);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [engaged, setEngaged] = useState(false);

  function engage() {
    setEngaged(true);
    iframeRef.current?.contentWindow?.postMessage(
      JSON.stringify({ event: "command", func: "playVideo", args: [] }),
      "*"
    );
  }

  const frame = (
    <div
      className={cn(
        "relative overflow-hidden",
        fit === "height" ? "max-h-full max-w-full" : "w-full",
        radius === 0 && "rounded-sm",
        !embed && "bg-surface border border-border"
      )}
      style={{
        aspectRatio: aspect || "16/9",
        borderRadius: radius ? `${radius}px` : undefined,
        // Fill the cell's height; cap at its width. The frame keeps its
        // aspect ratio, so when width binds the whole frame shrinks.
        width: fit === "height" ? `min(100cqw, calc(100cqh * ${ratio}))` : undefined,
      }}
      onPointerLeave={editing ? undefined : () => setEngaged(false)}
    >
      {embed ? (
        <>
          <iframe
            ref={iframeRef}
            src={embed}
            title="YouTube video"
            className={cn(
              "absolute inset-0 h-full w-full",
              !editing && engaged ? "pointer-events-auto" : "pointer-events-none"
            )}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
          />
          {!editing && !engaged && (
            <div
              className="absolute inset-0 cursor-pointer"
              role="button"
              aria-label="Play video"
              onClick={engage}
            />
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-foreground/30 italic kicker text-center px-4">
          Paste a YouTube URL
        </div>
      )}
    </div>
  );

  if (fit !== "height") return frame;

  // The measuring container: cqw/cqh in the frame's width resolve against
  // this element's rendered size, i.e. the block cell.
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ containerType: "size" }}
    >
      {frame}
    </div>
  );
}
