"use client";

/**
 * Lightweight CSS-only animated background used in place of WebGL bits on
 * mobile (or wherever the parent decides). No shaders, no canvas, no deps.
 * Three flavours: a soft two-stop gradient driven by the user-picked
 * colors, plus two heavily-blurred radial preset looks.
 */
export type MobileFallbackKind = "gradient" | "blur-dark" | "blur-accent";

type Props = {
  kind: MobileFallbackKind;
  colorA: string;
  colorB: string;
};

export function MobileFallback({ kind, colorA, colorB }: Props) {
  if (kind === "gradient") {
    return (
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none animate-bits-gradient"
        style={{
          backgroundImage: `linear-gradient(135deg, ${colorA}, ${colorB})`,
          backgroundSize: "200% 200%",
          filter: "blur(0px) saturate(1.05)",
        }}
      />
    );
  }
  if (kind === "blur-dark") {
    return (
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none animate-bits-blur-slow"
        style={{
          backgroundImage: `
            radial-gradient(60% 80% at 20% 30%, ${colorA}55, transparent 60%),
            radial-gradient(50% 70% at 80% 70%, ${colorB}55, transparent 60%),
            linear-gradient(180deg, var(--background), var(--background))
          `,
          filter: "blur(48px) saturate(1.1)",
        }}
      />
    );
  }
  // blur-accent
  return (
    <div
      aria-hidden
      className="absolute inset-0 pointer-events-none animate-bits-blur-fast"
      style={{
        backgroundImage: `
          radial-gradient(45% 60% at 25% 35%, var(--accent), transparent 65%),
          radial-gradient(55% 70% at 75% 65%, ${colorA}, transparent 60%),
          linear-gradient(180deg, var(--background), var(--background))
        `,
        filter: "blur(64px) saturate(1.2)",
      }}
    />
  );
}
