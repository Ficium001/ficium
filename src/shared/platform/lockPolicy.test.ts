import { describe, expect, it } from "vitest";
import { LOCK_POLICY, isIdleExpired, shouldLockOnResume } from "./lockPolicy";

describe("shouldLockOnResume", () => {
  it("does not lock when the app never went to the background", () => {
    expect(shouldLockOnResume(null, 1_000_000)).toBe(false);
  });
  it("does not lock inside the grace window (camera, file picker)", () => {
    expect(shouldLockOnResume(0, LOCK_POLICY.backgroundGraceMs)).toBe(false);
  });
  it("locks once the grace window has passed", () => {
    expect(shouldLockOnResume(0, LOCK_POLICY.backgroundGraceMs + 1)).toBe(true);
  });
});

describe("isIdleExpired", () => {
  it("stays unlocked while the user is active", () => {
    expect(isIdleExpired(0, LOCK_POLICY.idleTimeoutMs - 1)).toBe(false);
  });
  it("locks at the idle timeout", () => {
    expect(isIdleExpired(0, LOCK_POLICY.idleTimeoutMs)).toBe(true);
  });
});
