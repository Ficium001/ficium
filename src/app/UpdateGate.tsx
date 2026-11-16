/**
 * Forced-update screen for the iOS/Android app.
 *
 * The decision lives in shared/platform/releasePolicy; this component asks for
 * it at startup and each time the app returns to the foreground, and covers the
 * app when the installed version is no longer supported.
 *
 * The check never delays startup: the app renders straight away and is covered
 * only once an update is known to be required. Renders children untouched on
 * the web.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { FiciumLogo } from "@/shared/ui/FiciumLogo";
import { Button } from "@/shared/ui";
import {
  checkForRequiredUpdate,
  isNativeApp,
  onAppStateChange,
  openStoreListing,
  type UpdateCheck,
} from "@/shared/platform";

/** Returning to the app re-checks at most this often. */
const RECHECK_INTERVAL_MS = 10 * 60_000;

export function UpdateGate({ children }: { children: ReactNode }) {
  if (!isNativeApp()) return <>{children}</>;
  return <NativeUpdateGate>{children}</NativeUpdateGate>;
}

function NativeUpdateGate({ children }: { children: ReactNode }) {
  const [update, setUpdate] = useState<UpdateCheck>({ required: false });
  const lastCheck = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const check = () => {
      lastCheck.current = Date.now();
      void checkForRequiredUpdate().then((result) => {
        if (!cancelled) setUpdate(result);
      });
    };
    check();
    const unsubscribe = onAppStateChange((active) => {
      if (active && Date.now() - lastCheck.current >= RECHECK_INTERVAL_MS) check();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!update.required) return <>{children}</>;

  // The app underneath is not rendered at all: nothing to interact with, and
  // no requests from a version the server may no longer understand.
  const { storeUrl } = update;
  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="update-title"
      aria-describedby="update-body"
      className="fixed inset-0 z-[1100] flex flex-col items-center justify-center gap-10 bg-paper px-8 text-center"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <FiciumLogo size={96} />
      <div className="space-y-2">
        <h1 id="update-title" className="font-display text-xl font-semibold text-ink">
          Update Ficium to continue
        </h1>
        <p id="update-body" className="text-sm text-muted">
          This version is no longer supported. Install the latest version to keep your account secure.
          {storeUrl ? "" : " You can find it in your app store."}
        </p>
      </div>
      {storeUrl && (
        <div className="w-full max-w-xs">
          <Button fullWidth onClick={() => openStoreListing(storeUrl)}>
            Update now
          </Button>
        </div>
      )}
    </div>
  );
}
