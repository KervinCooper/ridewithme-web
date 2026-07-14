"use client";

import { useCallback, useEffect } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { TOAST_DURATION_MS } from "@/lib/constants";
import { useUIStore, type Toast as ToastData } from "@/stores/ui.store";

const variantConfig: Record<
  NonNullable<ToastData["variant"]>,
  { icon: typeof Info; className: string }
> = {
  default: { icon: Info, className: "border-border text-text" },
  success: { icon: CheckCircle2, className: "border-accent text-accent" },
  warning: { icon: AlertTriangle, className: "border-warn text-warn" },
  danger: { icon: AlertCircle, className: "border-danger text-danger" },
};

export function useToast() {
  const showToast = useUIStore((s) => s.showToast);

  return useCallback(
    (message: string, variant: ToastData["variant"] = "default") => {
      showToast({ id: crypto.randomUUID(), message, variant });
    },
    [showToast]
  );
}

function ToastItem({ toast }: { toast: ToastData }) {
  const dismissToast = useUIStore((s) => s.dismissToast);
  const { icon: Icon, className } = variantConfig[toast.variant ?? "default"];

  useEffect(() => {
    const timer = setTimeout(() => dismissToast(toast.id), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismissToast]);

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 rounded-md border bg-surface px-4 py-3 shadow-[0_8px_24px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="text-sm font-bold text-text">{toast.message}</p>
    </div>
  );
}

export function ToastProvider() {
  const toasts = useUIStore((s) => s.toasts);

  return (
    <div
      className="pointer-events-none fixed inset-x-4 z-[2000] flex flex-col gap-2"
      style={{ top: "calc(1rem + env(safe-area-inset-top))" }}
      aria-live="polite"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} />
        </div>
      ))}
    </div>
  );
}
