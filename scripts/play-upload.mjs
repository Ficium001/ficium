#!/usr/bin/env node
/**
 * Uploads a signed Android App Bundle to a Google Play testing track.
 *
 * Talks to the Google Play Developer API directly, with Node built-ins only.
 * The step that holds the Play credentials therefore runs no third-party
 * code: nothing to pin, nothing that can be swapped under us.
 *
 *   PLAY_SERVICE_ACCOUNT_JSON='{…}' node scripts/play-upload.mjs \
 *     --aab android/app/build/outputs/bundle/release/app-release.aab \
 *     --package net.ficium.app --version-code 42 --release-name 1.0.0 \
 *     --track internal --status draft
 *
 * Only testing tracks are accepted. Promoting a build to production is a
 * deliberate human step in the Play Console, never something CI does.
 *
 * One Play "edit" is one transaction: insert → upload → assign to track →
 * commit. If any step fails the edit is deleted and nothing changes in Play.
 */
import { createSign } from "node:crypto";
import { openAsBlob } from "node:fs";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";

const API = "https://androidpublisher.googleapis.com";
// Fixed, not read from the key file: a tampered file cannot redirect the
// signed assertion to another host.
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/androidpublisher";

export const TRACKS = ["internal", "alpha"]; // internal testing, closed testing
export const STATUSES = ["draft", "completed"];

const b64url = (input) => Buffer.from(input).toString("base64url");

/** RS256-signed JWT that proves we hold the service account's private key. */
export function serviceAccountAssertion(account, nowSeconds) {
  if (!account?.client_email || !account?.private_key) {
    throw new Error("Service account JSON needs client_email and private_key");
  }
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: account.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: nowSeconds,
    exp: nowSeconds + 600,
  }));
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(account.private_key, "base64url");
  return `${header}.${claims}.${signature}`;
}

async function call(fetchImpl, url, init, what) {
  const res = await fetchImpl(url, init);
  const text = await res.text();
  if (!res.ok) {
    // Google's error bodies describe the problem and carry no credentials.
    throw new Error(`${what} failed: HTTP ${res.status} ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : {};
}

export async function fetchAccessToken(account, fetchImpl = fetch, nowSeconds = Math.floor(Date.now() / 1000)) {
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: serviceAccountAssertion(account, nowSeconds),
  });
  const json = await call(fetchImpl, TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  }, "Google sign-in");
  if (typeof json.access_token !== "string") throw new Error("Google sign-in returned no access token");
  return json.access_token;
}

/**
 * Publishes one bundle to one testing track. Returns the version code Play
 * recorded. Throws, leaving Play untouched, on any failure.
 */
export async function publishBundle({ fetchImpl = fetch, token, packageName, bundle, versionCode, releaseName, track, status }) {
  if (!TRACKS.includes(track)) throw new Error(`track must be one of ${TRACKS.join(", ")} (got "${track}")`);
  if (!STATUSES.includes(status)) throw new Error(`status must be one of ${STATUSES.join(", ")} (got "${status}")`);
  if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/i.test(packageName)) throw new Error(`invalid package name "${packageName}"`);
  if (!Number.isInteger(versionCode) || versionCode < 1) throw new Error(`invalid version code "${versionCode}"`);

  const auth = { Authorization: `Bearer ${token}` };
  const app = `${API}/androidpublisher/v3/applications/${packageName}`;

  const edit = await call(fetchImpl, `${app}/edits`, { method: "POST", headers: auth }, "Open edit");
  if (typeof edit.id !== "string") throw new Error("Play returned no edit id");
  const editUrl = `${app}/edits/${encodeURIComponent(edit.id)}`;

  try {
    const uploaded = await call(
      fetchImpl,
      `${API}/upload/androidpublisher/v3/applications/${packageName}/edits/${encodeURIComponent(edit.id)}/bundles?uploadType=media`,
      { method: "POST", headers: { ...auth, "Content-Type": "application/octet-stream" }, body: bundle },
      "Upload bundle",
    );
    // The bundle on disk must be the build we think it is.
    if (uploaded.versionCode !== versionCode) {
      throw new Error(`Play read version code ${uploaded.versionCode} from the bundle, expected ${versionCode}`);
    }

    await call(fetchImpl, `${editUrl}/tracks/${track}`, {
      method: "PUT",
      headers: { ...auth, "Content-Type": "application/json" },
      body: JSON.stringify({ track, releases: [{ name: releaseName, versionCodes: [String(versionCode)], status }] }),
    }, "Assign to track");

    await call(fetchImpl, `${editUrl}:commit`, { method: "POST", headers: auth }, "Commit edit");
    return versionCode;
  } catch (error) {
    // Best effort: an abandoned edit expires on its own, but tidy up anyway.
    await fetchImpl(editUrl, { method: "DELETE", headers: auth }).catch(() => undefined);
    throw error;
  }
}

async function main() {
  const { values } = parseArgs({
    options: {
      aab: { type: "string" },
      package: { type: "string" },
      "version-code": { type: "string" },
      "release-name": { type: "string" },
      track: { type: "string", default: "internal" },
      status: { type: "string", default: "draft" },
    },
  });
  for (const required of ["aab", "package", "version-code", "release-name"]) {
    if (!values[required]) throw new Error(`--${required} is required`);
  }
  const raw = process.env.PLAY_SERVICE_ACCOUNT_JSON;
  if (!raw) throw new Error("PLAY_SERVICE_ACCOUNT_JSON is not set");

  const token = await fetchAccessToken(JSON.parse(raw));
  const versionCode = await publishBundle({
    token,
    packageName: values.package,
    bundle: await openAsBlob(values.aab),
    versionCode: Number(values["version-code"]),
    releaseName: values["release-name"],
    track: values.track,
    status: values.status,
  });
  console.log(`play-upload: ${values.package} build ${versionCode} is on the ${values.track} track (${values.status}).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`play-upload: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
