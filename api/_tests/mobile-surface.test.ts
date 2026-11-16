// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * The /api routes that released phone apps call. An installed app keeps calling the routes it
 * was built with, so removing or renaming one breaks every phone still on that version.
 *
 * To retire a route: ship an app that no longer calls it, raise the minimum app version in the
 * admin site (App releases), and only then remove it from here and from api/.
 */
const ROUTES_CALLED_BY_RELEASED_APPS = [
  "accept-bid", "account", "chat", "intelligence", "kyc", "market",
  "request-actions", "request-bids", "request-bids-bulk",
];

describe("API surface used by installed apps", () => {
  it.each(ROUTES_CALLED_BY_RELEASED_APPS)("/api/%s still exists", (route) => {
    expect(existsSync(resolve(process.cwd(), "api", `${route}.ts`))).toBe(true);
  });
});
