import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-surface p-8 text-center",
        className
      )}
    >
      {icon && (
        <div className="text-text-muted" aria-hidden="true">
          {icon}
        </div>
      )}
      <p className="text-sm font-bold uppercase italic text-text">{title}</p>
      {description && <p className="text-xs text-text-muted">{description}</p>}
      {action}
    </div>
  );
}
