import { cn } from "@/lib/utils";

/** Keyword-match score chip (0–100). Accent from ~70 — the "worth applying
 *  as-is" line; muted below. Token colors only. */
export function ScoreBadge({
  score,
  className,
}: {
  score: number;
  className?: string;
}) {
  return (
    <span
      title={`Keyword match ${score}/100`}
      className={cn(
        "kicker px-1.5 py-0.5 rounded-sm border text-[10px] tabular-nums shrink-0",
        score >= 70
          ? "border-accent/60 bg-accent/15 text-accent"
          : "border-border bg-surface text-foreground/60",
        className
      )}
    >
      {score}
    </span>
  );
}
