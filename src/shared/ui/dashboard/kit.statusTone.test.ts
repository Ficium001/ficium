import { describe, it, expect } from "vitest";
import { statusTone } from "./kit";

describe("statusTone", () => {
  it("maps positive statuses to green", () => {
    expect(statusTone("accepted")).toBe("green");
    expect(statusTone("approved")).toBe("green");
    expect(statusTone("success")).toBe("green");
  });
  it("maps in-flight statuses to amber", () => {
    expect(statusTone("pending")).toBe("amber");
    expect(statusTone("expiring")).toBe("amber");
  });
  it("maps failures to red", () => {
    expect(statusTone("rejected")).toBe("red");
    expect(statusTone("blocked")).toBe("red");
  });
  it("maps active marketplace states to blue", () => {
    expect(statusTone("open")).toBe("blue");
    expect(statusTone("bidding")).toBe("blue");
  });
  it("falls back to grey for unknown statuses", () => {
    expect(statusTone("whatever")).toBe("grey");
  });
});
