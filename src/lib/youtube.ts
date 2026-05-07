/**
 * Tiny URL parser for the supported YouTube link formats. Returns the
 * 11-char video ID, or null if the input doesn't look like a YouTube URL.
 *
 * Accepts:
 *   https://www.youtube.com/watch?v=VIDEOID
 *   https://www.youtube.com/watch?v=VIDEOID&t=15s
 *   https://youtu.be/VIDEOID
 *   https://www.youtube.com/embed/VIDEOID
 *   https://www.youtube.com/shorts/VIDEOID
 *   VIDEOID  (already a bare 11-char id)
 */
export function getYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) return m[1];
  }
  return null;
}

export type YouTubeEmbedOptions = {
  autoplay?: boolean;
  muted?: boolean;
  loop?: boolean;
  controls?: boolean;
  /** Start position in seconds. */
  start?: number;
};

/**
 * Build a youtube.com/embed URL with the given playback options. Always
 * sets `rel=0`, `modestbranding=1`, and `playsinline=1` for cleaner embeds.
 * Returns null if the input URL doesn't parse to a video id.
 */
export function youtubeEmbedUrl(
  url: string,
  opts: YouTubeEmbedOptions = {}
): string | null {
  const id = getYouTubeId(url);
  if (!id) return null;
  const params = new URLSearchParams();
  if (opts.autoplay) params.set("autoplay", "1");
  if (opts.muted) params.set("mute", "1");
  if (opts.loop) {
    params.set("loop", "1");
    // YouTube quirk: looping an embedded video requires a `playlist` param.
    params.set("playlist", id);
  }
  if (opts.controls === false) params.set("controls", "0");
  if (opts.start && opts.start > 0) params.set("start", String(opts.start));
  params.set("rel", "0");
  params.set("modestbranding", "1");
  params.set("playsinline", "1");
  const qs = params.toString();
  return `https://www.youtube.com/embed/${id}${qs ? `?${qs}` : ""}`;
}
