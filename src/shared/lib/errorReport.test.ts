import { describe, expect, it } from "vitest";
import { describeError, hash16, locationOf, routeOf, scrub } from "./errorReport";

describe("scrub", () => {
  it("removes emails, tokens, ids and long numbers", () => {
    // Assembled here so no token-shaped literal sits in the repository for secret scanners to flag.
    const token = ["eyJhbGciOiJIUzI1NiJ9", "eyJzdWIiOiIxIn0", "sig"].join(".");
    expect(scrub(`User jane.doe@example.com token ${token} id 8c1f2a3b-4d5e-6f70-8192-a3b4c5d6e7f8 nic 12345678901234`))
      .toBe("User [email] token [token] id [id] nic [number]");
  });
  it("collapses whitespace and limits the length", () => {
    expect(scrub("a\n\n  b\tc")).toBe("a b c");
    expect(scrub("x".repeat(500))).toHaveLength(300);
  });
  it("keeps short numbers, which are not personal", () => {
    expect(scrub("HTTP 500 at row 12")).toBe("HTTP 500 at row 12");
  });
});

describe("routeOf", () => {
  it("replaces ids with a placeholder and drops query and hash", () => {
    expect(routeOf("/requests/8c1f2a3b-4d5e-6f70-8192-a3b4c5d6e7f8/offers/42?token=abc#x")).toBe("/requests/:id/offers/:id");
    expect(routeOf("/invite/AbCdEfGhIjKlMnOpQrStUvWxYz0123456789")).toBe("/invite/:id");
    expect(routeOf("/dashboard")).toBe("/dashboard");
  });
});

describe("locationOf", () => {
  it("returns the first frame's bundle file and position, without origin or query", () => {
    const stack = "TypeError: x is undefined\n    at f (capacitor://localhost/assets/Dashboard-B4Et4RS4.js?v=1:1:2345)\n    at g (capacitor://localhost/assets/index-CeMoa.js:1:99)";
    expect(locationOf(stack)).toBe("assets/Dashboard-B4Et4RS4.js:1:2345");
    expect(locationOf("at https://localhost/assets/vendor-react-Wi7g.js:9:10")).toBe("assets/vendor-react-Wi7g.js:9:10");
  });
  it("is empty when there is no usable frame", () => {
    expect(locationOf(undefined)).toBe("");
    expect(locationOf("Error: no frames here")).toBe("");
  });
});

describe("hash16", () => {
  it("is 16 hex characters and stable", () => {
    expect(hash16("abc")).toMatch(/^[0-9a-f]{16}$/);
    expect(hash16("abc")).toBe(hash16("abc"));
    expect(hash16("abc")).not.toBe(hash16("abd"));
    expect(hash16("")).toBe("cbf29ce484222325");
  });
});

describe("describeError", () => {
  const err = (message: string, line = 2345) => {
    const e = new TypeError(message);
    e.stack = `TypeError: ${message}\n    at f (capacitor://localhost/assets/Dashboard-B4Et4RS4.js:1:${line})`;
    return e;
  };

  it("builds a scrubbed report with a route pattern", () => {
    const r = describeError("error", err("Cannot read 'amount' of undefined for jane@example.com"), "/requests/8c1f2a3b-4d5e-6f70-8192-a3b4c5d6e7f8");
    expect(r).toEqual({
      kind: "error",
      fingerprint: expect.stringMatching(/^[0-9a-f]{16}$/),
      message: "TypeError: Cannot read 'amount' of undefined for [email]",
      location: "assets/Dashboard-B4Et4RS4.js:1:2345",
      route: "/requests/:id",
    });
  });

  it("gives the same fingerprint when only numbers or the position differ, and a different one per kind", () => {
    const a = describeError("error", err("Row 3 failed", 10), "/a")!;
    const b = describeError("error", err("Row 47 failed", 999), "/b")!;
    expect(a.fingerprint).toBe(b.fingerprint);
    expect(describeError("render", err("Row 3 failed", 10), "/a")!.fingerprint).not.toBe(a.fingerprint);
    expect(describeError("error", err("Something else"), "/a")!.fingerprint).not.toBe(a.fingerprint);
  });

  it("copes with things that are not Error objects", () => {
    expect(describeError("rejection", "plain string", "/x")!.message).toBe("Error: plain string");
    expect(describeError("rejection", { message: "from an object", name: "ApiError" }, "/x")!.message).toBe("ApiError: from an object");
    expect(describeError("rejection", undefined, "/x")!.message).toBe("Error: Unknown error");
    expect(describeError("rejection", 42, "/x")!.location).toBe("");
  });
});
