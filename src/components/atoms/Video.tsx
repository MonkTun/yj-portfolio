"use client";

import type { VideoProps } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { youtubeEmbedUrl } from "@/lib/youtube";

/**
 * YouTube video atom. The wrapper is sized by the layout grid + the
 * `aspect` prop; the iframe fills it. We pass `pointer-events: auto` on
 * the iframe so the YouTube controls work while keeping the surrounding
 * editor scaffolding click-through.
 */
export function Video(props: VideoProps) {
  const { url, autoplay, muted, loop, controls, start, aspect, radius } = props;
  const embed = youtubeEmbedUrl(url, { autoplay, muted, loop, controls, start });

  const wrapperStyle: React.CSSProperties = {
    aspectRatio: aspect || "16/9",
    borderRadius: radius ? `${radius}px` : undefined,
  };

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden",
        radius === 0 && "rounded-sm",
        !embed && "bg-surface border border-border"
      )}
      style={wrapperStyle}
    >
      {embed ? (
        <iframe
          src={embed}
          title="YouTube video"
          className="absolute inset-0 h-full w-full pointer-events-auto"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-foreground/30 italic kicker text-center px-4">
          Paste a YouTube URL
        </div>
      )}
    </div>
  );
}
