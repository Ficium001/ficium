/**
 * @module shared/platform/deviceAuth
 * Device-owner verification for the native app: Face ID / Touch ID /
 * fingerprint, falling back to the device passcode. Used to unlock the app
 * and to confirm sensitive actions. The plugin loads lazily, so the web
 * bundle never ships it.
 *
 * Fails closed: if the plugin cannot load, verification fails.
 */
import { isNativeApp } from "./runtime";

type Plugin = typeof import("@aparajita/capacitor-biometric-auth");

let loading: Promise<Plugin> | null = null;
function plugin(): Promise<Plugin> {
  loading ??= import("@aparajita/capacitor-biometric-auth").catch((e: unknown) => {
    loading = null; // retry on the next call instead of caching the failure
    throw e;
  });
  return loading;
}

let prompting = false;
/**
 * True while the OS verification sheet is on screen. On Android the sheet
 * pauses the activity, which must not count as "app went to the background".
 */
export function isDeviceAuthPromptOpen(): boolean {
  return prompting;
}

/**
 * - verified:    the device owner passed biometrics or the passcode.
 * - cancelled:   the user dismissed it, failed, or was locked out by the OS.
 * - unavailable: the device has no passcode and no biometrics, so it cannot
 *                prove who is holding it. Callers decide what that means.
 */
export type DeviceAuthResult = "verified" | "cancelled" | "unavailable";

export async function verifyDeviceOwner(reason: string): Promise<DeviceAuthResult> {
  if (!isNativeApp()) return "unavailable";
  let m: Plugin;
  try {
    m = await plugin();
  } catch {
    return "cancelled";
  }
  const status = await m.BiometricAuth.checkBiometry().catch(() => null);
  if (!status) return "cancelled";
  if (!status.isAvailable && !status.deviceIsSecure) return "unavailable";

  prompting = true;
  try {
    await m.BiometricAuth.authenticate({
      reason,
      cancelTitle:           "Cancel",
      allowDeviceCredential: true,
      iosFallbackTitle:      "Use passcode",
      androidTitle:          "Verify it's you",
      androidSubtitle:       reason,
      androidConfirmationRequired: false,
    });
    return "verified";
  } catch {
    return "cancelled";
  } finally {
    prompting = false;
  }
}

/**
 * Asks the device owner to confirm a sensitive action (accepting an offer,
 * sharing documents). Always true on the web.
 *
 * A device with no screen lock at all returns true: such a device cannot be
 * verified, and the app lock already signs it out on every lock event, so the
 * session in use was proved by a password moments ago.
 */
export async function confirmSensitiveAction(reason: string): Promise<boolean> {
  if (!isNativeApp()) return true;
  const result = await verifyDeviceOwner(reason);
  return result !== "cancelled";
}
