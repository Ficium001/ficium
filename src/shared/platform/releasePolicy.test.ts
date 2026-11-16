import { describe, expect, it } from "vitest";
import { evaluateUpdate, isOlderThan, parseReleasePolicy, parseVersion, policyFromRows, safeStoreUrl } from "./releasePolicy";

const PLAY = "https://play.google.com/store/apps/details?id=net.ficium.app";
const policy = (min: string, storeUrl = PLAY) => ({
  ios: { minVersion: min, storeUrl: "" },
  android: { minVersion: min, storeUrl },
});

describe("parseVersion", () => {
  it("reads dotted numbers", () => {
    expect(parseVersion("1.4.2")).toEqual([1, 4, 2]);
    expect(parseVersion("2")).toEqual([2]);
  });
  it("rejects anything else", () => {
    for (const bad of ["", "1.x", "v1.0", "1..2", "1.0-beta", " 1.0", null, 1, undefined, {}]) {
      expect(parseVersion(bad)).toBeNull();
    }
  });
});

describe("isOlderThan", () => {
  it("compares numerically, not as text", () => {
    expect(isOlderThan("1.9.0", "1.10.0")).toBe(true);
    expect(isOlderThan("1.10.0", "1.9.0")).toBe(false);
  });
  it("treats missing segments as zero", () => {
    expect(isOlderThan("1.0", "1.0.0")).toBe(false);
    expect(isOlderThan("1.0", "1.0.1")).toBe(true);
  });
  it("is false for the same version", () => {
    expect(isOlderThan("1.2.3", "1.2.3")).toBe(false);
  });
  it("never blocks on a version it cannot read", () => {
    expect(isOlderThan("garbage", "2.0.0")).toBe(false);
    expect(isOlderThan("1.0.0", "garbage")).toBe(false);
  });
});

describe("safeStoreUrl", () => {
  it("accepts only https store pages", () => {
    expect(safeStoreUrl(PLAY)).toBe(PLAY);
    expect(safeStoreUrl("https://apps.apple.com/app/id123")).toBe("https://apps.apple.com/app/id123");
  });
  it("rejects look-alikes, other schemes and junk", () => {
    for (const bad of [
      "http://play.google.com/store/apps/details?id=x",
      "https://play.google.com.evil.example/store",
      "https://evil.example/apps.apple.com",
      "itms-apps://apps.apple.com/app/id123",
      "javascript:alert(1)",
      "",
      "not a url",
      null,
    ]) {
      expect(safeStoreUrl(bad)).toBeNull();
    }
  });
});

describe("parseReleasePolicy", () => {
  it("accepts a well-formed policy", () => {
    expect(parseReleasePolicy(policy("1.0.0"))).toEqual(policy("1.0.0"));
  });
  it("rejects a policy missing a platform or with an unreadable version", () => {
    expect(parseReleasePolicy(null)).toBeNull();
    expect(parseReleasePolicy("1.0.0")).toBeNull();
    expect(parseReleasePolicy({ ios: { minVersion: "1.0.0" } })).toBeNull();
    expect(parseReleasePolicy({ ...policy("1.0.0"), android: { minVersion: "latest" } })).toBeNull();
  });
});

describe("evaluateUpdate", () => {
  it("requires an update only when the installed version is below the minimum", () => {
    expect(evaluateUpdate(policy("1.2.0"), "android", "1.1.9")).toEqual({ required: true, storeUrl: PLAY });
    expect(evaluateUpdate(policy("1.2.0"), "android", "1.2.0")).toEqual({ required: false });
    expect(evaluateUpdate(policy("1.2.0"), "android", "2.0.0")).toEqual({ required: false });
  });
  it("still blocks when the store link is missing or unsafe, without offering the link", () => {
    expect(evaluateUpdate(policy("1.2.0"), "ios", "1.0.0")).toEqual({ required: true, storeUrl: null });
    expect(evaluateUpdate(policy("1.2.0", "https://evil.example/x"), "android", "1.0.0"))
      .toEqual({ required: true, storeUrl: null });
  });
  it("does not block without a policy", () => {
    expect(evaluateUpdate(null, "ios", "0.0.1")).toEqual({ required: false });
  });
});

describe("policyFromRows", () => {
  const rows = [
    { platform: "android", min_version: "1.2.0", store_url: PLAY },
    { platform: "ios", min_version: "1.1.0", store_url: "" },
  ];
  it("reads the policy table's rows", () => {
    expect(policyFromRows(rows)).toEqual({
      ios: { minVersion: "1.1.0", storeUrl: "" },
      android: { minVersion: "1.2.0", storeUrl: PLAY },
    });
  });
  it("ignores platforms it does not know", () => {
    expect(policyFromRows([...rows, { platform: "huawei", min_version: "9.0.0", store_url: "" }])).not.toBeNull();
  });
  it("never yields a policy from an error body, a missing platform or an unreadable version", () => {
    expect(policyFromRows({ message: "permission denied" })).toBeNull();
    expect(policyFromRows([])).toBeNull();
    expect(policyFromRows([rows[0]])).toBeNull();
    expect(policyFromRows([rows[0], { platform: "ios", min_version: "latest", store_url: "" }])).toBeNull();
    expect(policyFromRows([rows[0], null])).toBeNull();
  });
});
