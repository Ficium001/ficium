// @vitest-environment node
import { describe, expect, it } from "vitest";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { fetchAccessToken, publishBundle, serviceAccountAssertion } from "./play-upload.mjs";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const account = {
  client_email: "ci@ficium.iam.gserviceaccount.com",
  private_key: privateKey.export({ type: "pkcs8", format: "pem" }),
  // A tampered key file must not be able to redirect the assertion.
  token_uri: "https://evil.example/token",
};

const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString());

/** Records every request and answers from a script of [status, body] pairs. */
function fakeFetch(script) {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method ?? "GET", headers: init.headers ?? {}, body: init.body });
    const [status, body] = script.shift() ?? [500, { error: "unexpected call" }];
    return { ok: status >= 200 && status < 300, status, text: async () => (body === null ? "" : JSON.stringify(body)) };
  };
  return { calls, fetchImpl };
}

const base = {
  token: "tok",
  packageName: "net.ficium.app",
  bundle: new Blob(["aab-bytes"]),
  versionCode: 42,
  releaseName: "1.0.0",
  track: "internal",
  status: "draft",
};

describe("serviceAccountAssertion", () => {
  it("signs an RS256 JWT for the Play scope, addressed to Google's token endpoint", () => {
    const [header, claims, signature] = serviceAccountAssertion(account, 1_000).split(".");
    expect(decode(header)).toEqual({ alg: "RS256", typ: "JWT" });
    expect(decode(claims)).toEqual({
      iss: account.client_email,
      scope: "https://www.googleapis.com/auth/androidpublisher",
      aud: "https://oauth2.googleapis.com/token",
      iat: 1_000,
      exp: 1_600,
    });
    const valid = createVerify("RSA-SHA256").update(`${header}.${claims}`).verify(publicKey, signature, "base64url");
    expect(valid).toBe(true);
  });

  it("rejects a key file without the needed fields", () => {
    expect(() => serviceAccountAssertion({}, 0)).toThrow(/client_email/);
  });
});

describe("fetchAccessToken", () => {
  it("always signs in at Google, whatever the key file says", async () => {
    const { calls, fetchImpl } = fakeFetch([[200, { access_token: "abc" }]]);
    await expect(fetchAccessToken(account, fetchImpl, 1_000)).resolves.toBe("abc");
    expect(calls[0].url).toBe("https://oauth2.googleapis.com/token");
    expect(calls[0].body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
  });

  it("fails clearly when Google refuses", async () => {
    const { fetchImpl } = fakeFetch([[400, { error: "invalid_grant" }]]);
    await expect(fetchAccessToken(account, fetchImpl, 1_000)).rejects.toThrow(/Google sign-in failed: HTTP 400/);
  });
});

describe("publishBundle", () => {
  it("opens an edit, uploads, assigns the track and commits, in that order", async () => {
    const { calls, fetchImpl } = fakeFetch([
      [200, { id: "edit1" }],
      [200, { versionCode: 42 }],
      [200, {}],
      [200, { id: "edit1" }],
    ]);
    await expect(publishBundle({ ...base, fetchImpl })).resolves.toBe(42);

    const app = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications/net.ficium.app";
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([
      `POST ${app}/edits`,
      "POST https://androidpublisher.googleapis.com/upload/androidpublisher/v3/applications/net.ficium.app/edits/edit1/bundles?uploadType=media",
      `PUT ${app}/edits/edit1/tracks/internal`,
      `POST ${app}/edits/edit1:commit`,
    ]);
    expect(calls.every((c) => c.headers.Authorization === "Bearer tok")).toBe(true);
    expect(calls[1].body).toBe(base.bundle);
    expect(JSON.parse(calls[2].body)).toEqual({
      track: "internal",
      releases: [{ name: "1.0.0", versionCodes: ["42"], status: "draft" }],
    });
  });

  it("discards the edit and commits nothing when the bundle is not the expected build", async () => {
    const { calls, fetchImpl } = fakeFetch([[200, { id: "edit1" }], [200, { versionCode: 41 }], [204, null]]);
    await expect(publishBundle({ ...base, fetchImpl })).rejects.toThrow(/version code 41.*expected 42/);
    expect(calls.at(-1).method).toBe("DELETE");
    expect(calls.some((c) => c.url.endsWith(":commit"))).toBe(false);
  });

  it("discards the edit when Play rejects the upload", async () => {
    const { calls, fetchImpl } = fakeFetch([[200, { id: "edit1" }], [403, { error: "forbidden" }], [204, null]]);
    await expect(publishBundle({ ...base, fetchImpl })).rejects.toThrow(/Upload bundle failed: HTTP 403/);
    expect(calls.at(-1).method).toBe("DELETE");
  });

  it("refuses production and anything else that is not a testing track, before any request", async () => {
    const { calls, fetchImpl } = fakeFetch([]);
    for (const track of ["production", "beta", "../x", ""]) {
      await expect(publishBundle({ ...base, fetchImpl, track })).rejects.toThrow(/track must be one of/);
    }
    await expect(publishBundle({ ...base, fetchImpl, status: "inProgress" })).rejects.toThrow(/status must be one of/);
    await expect(publishBundle({ ...base, fetchImpl, packageName: "net.ficium.app/../x" })).rejects.toThrow(/invalid package/);
    await expect(publishBundle({ ...base, fetchImpl, versionCode: 0 })).rejects.toThrow(/invalid version code/);
    expect(calls).toHaveLength(0);
  });
});
