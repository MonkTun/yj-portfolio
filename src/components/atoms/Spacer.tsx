import type { SpacerProps } from "@/lib/schema";

export function Spacer({ height }: SpacerProps) {
  return <div aria-hidden style={{ height: `${height}px` }} />;
}
