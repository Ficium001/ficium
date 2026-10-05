import { describe, expect, it } from "vitest";
import handler from "./kyc";

function fakeRes() {
  const r: any = { statusCode: 0, body: undefined };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.json = (b: unknown) => { r.body = b; return r; };
  r.setHeader = () => r;
  return r;
}

describe("KYC router", () => {
  it.each(["GET", "POST"])("the settings action no longer exists (%s): KYC checks can't be read or changed from the public app", async (method) => {
    const res = fakeRes();
    await handler({ method, query: { action: "settings" }, headers: {}, body: { key: "face_match", value: false } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/Unknown or missing KYC action/);
    expect(res.body.available).not.toContain("settings");
  });

  it("no action in the router is left without a gate except the pre-signup scan", async () => {
    const res = fakeRes();
    await handler({ method: "GET", query: { action: "nope" }, headers: {} }, res);
    expect(res.body.available.sort()).toEqual(["admin-faces", "faces", "liveness", "notify", "scan", "setup", "verify"]);
  });
});
