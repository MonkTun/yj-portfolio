/**
 * Visual placeholder rendered until the matching reactbits component is
 * installed via `npx jsrepo`. Tells you which background it represents and
 * where to find its install command.
 */
export function BitsPlaceholder({
  label,
  url,
}: {
  label: string;
  url: string;
}) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface text-foreground/50">
      <div className="text-center px-4">
        <p className="kicker text-accent mb-1">Background not installed</p>
        <p className="font-display text-3xl mb-2">{label}</p>
        <p className="kicker text-foreground/50 break-all">{url}</p>
      </div>
    </div>
  );
}
