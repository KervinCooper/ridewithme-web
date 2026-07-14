import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/IconButton";
import { X } from "lucide-react";

export type AlertOverlayVariant = "warning" | "danger";

const variantConfig: Record<
  AlertOverlayVariant,
  { bg: string; ring: string; iconBg: string; pulse: boolean }
> = {
  warning: {
    bg: "bg-warn/95",
    ring: "border-warn",
    iconBg: "bg-black/20",
    pulse: false,
  },
  danger: {
    bg: "bg-danger/95",
    ring: "border-danger",
    iconBg: "bg-black/20",
    pulse: true,
  },
};

export interface AlertOverlayProps {
  variant: AlertOverlayVariant;
  icon: ReactNode;
  title: string;
  subtitle: string;
  children?: ReactNode;
  onDismiss?: () => void;
  zIndex?: number;
}

export function AlertOverlay({
  variant,
  icon,
  title,
  subtitle,
  children,
  onDismiss,
  zIndex = 2000,
}: AlertOverlayProps) {
  const config = variantConfig[variant];

  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center border-4 p-8 text-center backdrop-blur-md",
        config.bg,
        config.ring
      )}
      style={{ zIndex }}
      role="alertdialog"
      aria-live="assertive"
    >
      {onDismiss && (
        <div className="absolute right-4 top-4" style={{ top: "calc(1rem + env(safe-area-inset-top))" }}>
          <IconButton
            icon={<X className="h-4 w-4" />}
            label="Dismiss"
            onClick={onDismiss}
            className="bg-black/20 text-black hover:bg-black/30"
          />
        </div>
      )}
      <div
        className={cn(
          "mb-6 flex h-24 w-24 items-center justify-center rounded-full shadow-2xl",
          config.iconBg,
          config.pulse && "animate-pulse"
        )}
      >
        {icon}
      </div>
      <h1 className="mb-2 text-4xl font-black uppercase italic leading-tight text-black">
        {title}
      </h1>
      <p className="mb-8 text-sm font-bold uppercase tracking-widest text-black/70">
        {subtitle}
      </p>
      {children}
    </div>
  );
}
