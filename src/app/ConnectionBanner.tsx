/**
 * Tells the user when the device is offline. Uses React Query's onlineManager,
 * the same signal that pauses and resumes queries, so what the banner says and
 * what the app does never disagree. Works on the web and in the phone app.
 */
import { useSyncExternalStore } from "react";
import { onlineManager } from "@tanstack/react-query";
import { WifiOff } from "lucide-react";

const subscribe = (onChange: () => void) => onlineManager.subscribe(onChange);
const isOnline = () => onlineManager.isOnline();

export function ConnectionBanner() {
  const online = useSyncExternalStore(subscribe, isOnline, () => true);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[900] flex justify-center px-4">
      {!online && (
        <div className="flex items-center gap-2 rounded-pill bg-ink px-4 py-2.5 text-[13px] font-medium text-white shadow-lg">
          <WifiOff className="h-4 w-4 shrink-0" aria-hidden />
          You're offline. Your data will refresh when you reconnect.
        </div>
      )}
    </div>
  );
}
