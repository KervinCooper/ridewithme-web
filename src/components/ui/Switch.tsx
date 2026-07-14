import { cn } from "@/lib/cn";

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  hideLabel?: boolean;
  disabled?: boolean;
  className?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  hideLabel,
  disabled,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={hideLabel ? label : undefined}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "inline-flex min-h-11 items-center gap-3 disabled:opacity-50",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg rounded-pill",
        className
      )}
    >
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-pill border border-border transition-colors",
          checked ? "bg-accent" : "bg-surface-2"
        )}
      >
        <span
          className={cn(
            "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
            checked ? "translate-x-6" : "translate-x-0"
          )}
        />
      </span>
      {!hideLabel && (
        <span className="text-xs font-bold uppercase tracking-widest text-text">
          {label}
        </span>
      )}
    </button>
  );
}
