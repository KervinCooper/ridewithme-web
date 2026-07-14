"use client";

import { WifiOff } from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";

export function ConnectionBanner() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex items-center justify-center gap-2 bg-warn px-4 py-2 text-center text-[10px] font-black uppercase tracking-widest text-black"
      style={{ paddingTop: "calc(0.5rem + env(safe-area-inset-top))" }}
    >
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      No Network Signal — Saving Data Locally
    </div>
  );
}
