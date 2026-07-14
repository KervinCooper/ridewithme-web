import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export type SafeAreaEdge = "top" | "bottom" | "all";

const paddingStyle: Record<SafeAreaEdge, React.CSSProperties> = {
  top: { paddingTop: "env(safe-area-inset-top)" },
  bottom: { paddingBottom: "env(safe-area-inset-bottom)" },
  all: {
    paddingTop: "env(safe-area-inset-top)",
    paddingBottom: "env(safe-area-inset-bottom)",
    paddingLeft: "env(safe-area-inset-left)",
    paddingRight: "env(safe-area-inset-right)",
  },
};

export interface SafeAreaProps extends HTMLAttributes<HTMLDivElement> {
  edge?: SafeAreaEdge;
}

export function SafeArea({ edge = "all", style, className, ...rest }: SafeAreaProps) {
  return (
    <div
      className={cn(className)}
      style={{ ...paddingStyle[edge], ...style }}
      {...rest}
    />
  );
}
