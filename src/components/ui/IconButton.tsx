import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { ButtonVariant } from "@/components/ui/Button";

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  label: string;
  variant?: Extract<ButtonVariant, "secondary" | "ghost">;
}

const variantClasses: Record<string, string> = {
  secondary: "bg-surface-2 text-text border border-border hover:bg-surface",
  ghost: "bg-transparent text-text-muted hover:bg-surface-2 hover:text-text",
};

export function IconButton({
  icon,
  label,
  variant = "ghost",
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg",
        variantClasses[variant],
        className
      )}
      {...rest}
    >
      {icon}
    </button>
  );
}
