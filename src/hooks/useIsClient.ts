import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

/**
 * True once hydrated on the client. Used to gate `createPortal` calls, which
 * need `document.body` and would otherwise mismatch during static export.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
