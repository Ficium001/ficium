import { afterEach, describe, expect, it } from "vitest";
import { handleCors } from "../_lib/cors.js";

function fakeRes() {
  const r: any = { statusCode: 0, headers: {} as Record<string, string>, ended: false };
  r.setHeader = (k: string, v: string) => { r.headers[k.toLowerCase()] = v; };
  r.status = (c: number) => { r.statusCode = c; return r; };
  r.end = () => { r.ended = true; return r; };
  return r;
}
const req = (method: string, origin?: string) => ({ method, headers: origin ? { origin } : {} });

describe("handleCors", () => {
  afterEach(() => { delete process.env.CORS_ALLOWED_ORIGINS; });

  it.each(["capacitor://localhost", "https://localhost"])("allows the app shell origin %s", (origin) => {
    const res = fakeRes();
    expect(handleCors(req("GET", origin), res)).toBe(false);
    expect(res.headers["access-control-allow-origin"]).toBe(origin);
    expect(res.headers["access-control-allow-credentials"]).toBeUndefined();
  });

  it("never reflects an unlisted origin", () => {
    const res = fakeRes();
    handleCors(req("POST", "https://evil.example"), res);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
    expect(res.headers.vary).toBe("Origin");
  });

  it("leaves same-origin web requests untouched", () => {
    const res = fakeRes();
    expect(handleCors(req("GET"), res)).toBe(false);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers preflight and tells the caller to stop", () => {
    const res = fakeRes();
    expect(handleCors(req("OPTIONS", "capacitor://localhost"), res)).toBe(true);
    expect(res.statusCode).toBe(204);
    expect(res.headers["access-control-allow-headers"]).toBe("Authorization, Content-Type");
  });

  it("blocks preflight from an unlisted origin", () => {
    const res = fakeRes();
    expect(handleCors(req("OPTIONS", "https://evil.example"), res)).toBe(true);
    expect(res.headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("uses CORS_ALLOWED_ORIGINS when set, replacing the defaults", () => {
    process.env.CORS_ALLOWED_ORIGINS = "capacitor://staging";
    const ok = fakeRes(); handleCors(req("GET", "capacitor://staging"), ok);
    const old = fakeRes(); handleCors(req("GET", "capacitor://localhost"), old);
    expect(ok.headers["access-control-allow-origin"]).toBe("capacitor://staging");
    expect(old.headers["access-control-allow-origin"]).toBeUndefined();
  });
});
