import { useSyncExternalStore } from "react";

function subscribe() {
  return () => {};
}

// Used to defer client-only rendering (e.g. localStorage-derived cart state)
// until after hydration, without the "setState in an effect" anti-pattern —
// useSyncExternalStore's server/client snapshot split does this natively.
export function useHasMounted(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}
