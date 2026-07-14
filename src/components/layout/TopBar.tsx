import type { ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";

export interface TopBarProps {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  className?: string;
}

export function TopBar({ title, subtitle, onBack, actions, className }: TopBarProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-40 flex items-center justify-between gap-3 border-b border-border bg-surface/90 px-4 backdrop-blur-md",
        className
      )}
      style={{ paddingTop: "calc(0.75rem + env(safe-area-inset-top))", paddingBottom: "0.75rem" }}
    >
      <div className="flex items-center gap-3 min-w-0">
        {onBack && (
          <IconButton icon={<ChevronLeft className="h-5 w-5" />} label="Back" onClick={onBack} />
        )}
        <div className="min-w-0">
          {title && (
            <h1 className="truncate text-lg font-black uppercase italic tracking-tight text-text">
              {title}
            </h1>
          )}
          {subtitle && (
            <p className="truncate text-[10px] font-bold uppercase tracking-widest text-text-muted">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
