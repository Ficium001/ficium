/**
 * @module shared/platform/secureStorage
 * Supabase auth storage for the native app.
 *
 * The session (access + refresh token) lives in the iOS Keychain / Android
 * Keystore instead of WebView localStorage, where any injected script or a
 * device backup could read it. Policy:
 *  - iOS: accessible only while the device is unlocked, never migrated to
 *    another device, never synced to iCloud Keychain.
 *  - Keys are namespaced so a clear() can never touch another plugin's data.
 * The plugin is loaded lazily, so the web bundle never ships it.
 */
type Plugin = typeof import("@aparajita/capacitor-secure-storage");

let ready: Promise<Plugin> | null = null;

function plugin(): Promise<Plugin> {
  ready ??= import("@aparajita/capacitor-secure-storage")
    .then(async (m) => {
      await m.SecureStorage.setKeyPrefix("ficium.");
      await m.SecureStorage.setSynchronize(false);
      await m.SecureStorage.setDefaultKeychainAccess(m.KeychainAccess.whenUnlockedThisDeviceOnly);
      return m;
    })
    .catch((e: unknown) => {
      ready = null; // let the next call retry instead of caching the failure
      throw e;
    });
  return ready;
}

/** Shape Supabase's `auth.storage` option expects. */
export const secureAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const { SecureStorage } = await plugin();
    const value = await SecureStorage.get(key, false, false);
    return typeof value === "string" ? value : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const m = await plugin();
    await m.SecureStorage.set(key, value, false, false, m.KeychainAccess.whenUnlockedThisDeviceOnly);
  },
  async removeItem(key: string): Promise<void> {
    const { SecureStorage } = await plugin();
    await SecureStorage.remove(key, false);
  },
};
