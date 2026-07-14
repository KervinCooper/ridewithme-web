import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-surface p-6 shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
        className
      )}
      {...rest}
    />
  );
}
