import type { ButtonProps } from "@/lib/schema";
import { cn } from "@/lib/utils";

export function Button({ label, href, variant, align }: ButtonProps) {
  const alignClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  const variantClass =
    variant === "primary"
      ? "bg-accent text-accent-foreground hover:opacity-90 shadow-[0_8px_24px_-8px_rgba(92,138,58,0.55)]"
      : "border border-border text-foreground hover:bg-foreground/5 hover:border-accent";

  return (
    <div className={cn("flex items-center w-full h-full", alignClass)}>
      <a
        href={href}
        className={cn(
          "inline-flex items-center kicker px-5 py-3 rounded-sm transition-all",
          variantClass
        )}
      >
        {label}
      </a>
    </div>
  );
}
