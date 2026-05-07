import type { ButtonProps } from "@/lib/schema";
import { cn } from "@/lib/utils";

export function Button({ label, href, variant, align, newTab }: ButtonProps) {
  // align now controls where the label sits *inside* the button, since
  // the button itself fills its placed rect (so resizing the block does
  // what the user expects).
  const justifyClass = {
    left: "justify-start",
    center: "justify-center",
    right: "justify-end",
  }[align];

  const variantClass =
    variant === "primary"
      ? "bg-accent text-accent-foreground hover:opacity-90 shadow-[0_8px_24px_-8px_rgba(92,138,58,0.55)]"
      : "border border-border text-foreground hover:bg-foreground/5 hover:border-accent";

  return (
    <a
      href={href}
      target={newTab ? "_blank" : undefined}
      rel={newTab ? "noopener noreferrer" : undefined}
      className={cn(
        "flex items-center w-full h-full kicker px-5 py-3 rounded-sm transition-all",
        justifyClass,
        variantClass
      )}
    >
      {label}
    </a>
  );
}
