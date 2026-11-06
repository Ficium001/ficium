/**
 * @module shared/platform
 * Everything that differs between the browser and the iOS/Android shell.
 * Feature modules import from here and never from @capacitor/* directly
 * (enforced by ESLint), so the native surface stays in one auditable place.
 */
export { isNativeApp, runtimePlatform } from "./runtime";
export type { RuntimePlatform } from "./runtime";
export { apiUrl, publicUrl } from "./endpoints";
export { openExternal } from "./navigation";
export { bootstrapNative } from "./bootstrap";
