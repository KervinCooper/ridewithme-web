import { cn } from "@/lib/cn";

export type PillStatus = "active" | "sos" | "idle" | "arriving" | "clear";

const statusConfig: Record<PillStatus, { dot: string; text: string; pulse?: boolean }> = {
  active: { dot: "bg-accent", text: "text-accent" },
  clear: { dot: "bg-accent", text: "text-accent" },
  sos: { dot: "bg-danger", text: "text-danger", pulse: true },
  arriving: { dot: "bg-warn", text: "text-warn", pulse: true },
  idle: { dot: "bg-text-muted", text: "text-text-muted" },
};

export interface StatusPillProps {
  status: PillStatus;
  label: string;
  className?: string;
}

export function StatusPill({ status, label, className }: StatusPillProps) {
  const config = statusConfig[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-pill border border-border bg-surface-2 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wider",
        config.text,
        className
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          config.dot,
          config.pulse && "animate-pulse"
        )}
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
