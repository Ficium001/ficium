/**
 * @module shared/platform/releasePolicy
 * Forced-update gate for the iOS/Android app.
 *
 * A web deploy reaches every browser at once; an installed app does not. When
 * an old app version must stop being used (a security fix in the native shell,
 * a breaking API change), raising `minVersion` in public/app-release.json
 * blocks it until the user updates from the store.
 *
 * The policy is a static file on the CDN, so checking it costs no function
 * call and no database read however many phones ask.
 *
 * Failure behaviour, chosen deliberately:
 *  - Policy unreachable: use the last policy this phone saw. A version already
 *    known to be blocked stays blocked offline.
 *  - No policy ever seen, or a malformed one: do not block. A broken file must
 *    never lock every customer out of the app.
 * This gate is a rollout control, not a security boundary: the server still
 * authorises every request on its own.
 */
import { isNativeApp, runtimePlatform } from "./runtime";
import { releasePolicyUrl } from "./endpoints";

export interface PlatformReleasePolicy {
  /** Lowest app version allowed to run, e.g. "1.2.0". */
  minVersion: string;
  /** Store page to send the user to. Empty until the listing exists. */
  storeUrl: string;
}

export interface ReleasePolicy {
  ios: PlatformReleasePolicy;
  android: PlatformReleasePolicy;
}

export type UpdateCheck =
  | { required: false }
  | { required: true; storeUrl: string | null };

const CACHE_KEY = "ficium.releasePolicy";
const FETCH_TIMEOUT_MS = 5_000;
const STORE_HOSTS = new Set(["apps.apple.com", "play.google.com"]);

/** "1.4.2" → [1, 4, 2]. Null for anything that is not dotted numbers. */
export function parseVersion(value: unknown): number[] | null {
  if (typeof value !== "string" || !/^\d{1,9}(\.\d{1,9}){0,3}$/.test(value)) return null;
  return value.split(".").map(Number);
}

/** True when `current` is older than `min`. False if either cannot be read. */
export function isOlderThan(current: unknown, min: unknown): boolean {
  const a = parseVersion(current);
  const b = parseVersion(min);
  if (!a || !b) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff < 0;
  }
  return false;
}

/** Only real store pages: the policy can never send a user anywhere else. */
export function safeStoreUrl(value: unknown): string | null {
  if (typeof value !== "string" || value === "") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && STORE_HOSTS.has(url.hostname) ? url.href : null;
  } catch {
    return null;
  }
}

function parsePlatform(value: unknown): PlatformReleasePolicy | null {
  if (typeof value !== "object" || value === null) return null;
  const { minVersion, storeUrl } = value as Record<string, unknown>;
  if (!parseVersion(minVersion)) return null;
  return { minVersion: minVersion as string, storeUrl: typeof storeUrl === "string" ? storeUrl : "" };
}

/** Validates an untrusted JSON value. Null unless both platforms are well-formed. */
export function parseReleasePolicy(value: unknown): ReleasePolicy | null {
  if (typeof value !== "object" || value === null) return null;
  const { ios, android } = value as Record<string, unknown>;
  const i = parsePlatform(ios);
  const a = parsePlatform(android);
  return i && a ? { ios: i, android: a } : null;
}

/** The decision, as a pure function of what is installed and what is allowed. */
export function evaluateUpdate(
  policy: ReleasePolicy | null,
  platform: "ios" | "android",
  installedVersion: string,
): UpdateCheck {
  const rule = policy?.[platform];
  if (!rule || !isOlderThan(installedVersion, rule.minVersion)) return { required: false };
  return { required: true, storeUrl: safeStoreUrl(rule.storeUrl) };
}

function readCached(): ReleasePolicy | null {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? parseReleasePolicy(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeCached(policy: ReleasePolicy): void {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(policy));
  } catch {
    /* storage full or unavailable: the next successful fetch tries again */
  }
}

async function fetchPolicy(url: string): Promise<ReleasePolicy | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return null;
    return parseReleasePolicy(await res.json());
  } catch {
    return null;
  }
}

/**
 * Whether the installed app must be updated before it can be used.
 * Always `{ required: false }` in a browser.
 */
export async function checkForRequiredUpdate(): Promise<UpdateCheck> {
  const platform = runtimePlatform();
  const url = releasePolicyUrl();
  if (!isNativeApp() || platform === "web" || !url) return { required: false };

  const fresh = await fetchPolicy(url);
  if (fresh) writeCached(fresh);
  const policy = fresh ?? readCached();
  if (!policy) return { required: false };

  try {
    const { App } = await import("@capacitor/app");
    const { version } = await App.getInfo();
    return evaluateUpdate(policy, platform, version);
  } catch {
    return { required: false };
  }
}
