import { describe, it, expect } from "vitest";
import { filterOffers, isOpenLaunch, requestLinkFor, safeImageUrl, daysLeft } from "./offers";
import type { Offer } from "../types";

const NOW = Date.parse("2026-10-22T12:00:00Z");
const base: Offer = {
  id: "1", institutionName: "Bank A", category: "borrow", productType: "leasing", caption: "c".repeat(20),
  headline: "From 5% p.a.", terms: "t", imageTag: null, imageUrl: null, imageAlt: null, isLaunch: false,
  launchWindowEnds: null, publishedAt: "2026-10-20T00:00:00Z", verifiedAt: "2026-10-19T00:00:00Z",
  liveUntil: "2026-11-01T00:00:00Z",
};

describe("offers api helpers", () => {
  it("treats a launch as new only while its window is open", () => {
    expect(isOpenLaunch({ ...base, isLaunch: true, launchWindowEnds: "2026-10-30T00:00:00Z" }, NOW)).toBe(true);
    expect(isOpenLaunch({ ...base, isLaunch: true, launchWindowEnds: "2026-10-01T00:00:00Z" }, NOW)).toBe(false);
    expect(isOpenLaunch({ ...base, isLaunch: false }, NOW)).toBe(false);
  });

  it("filters by category and by open launch", () => {
    const save = { ...base, id: "2", category: "save" as const };
    const launch = { ...base, id: "3", isLaunch: true, launchWindowEnds: "2026-10-30T00:00:00Z" };
    expect(filterOffers([base, save, launch], "save", NOW).map((o) => o.id)).toEqual(["2"]);
    expect(filterOffers([base, save, launch], "new", NOW).map((o) => o.id)).toEqual(["3"]);
    expect(filterOffers([base, save], "all", NOW)).toHaveLength(2);
  });

  it("renders images only from the approved blob host", () => {
    expect(safeImageUrl("https://abc123.public.blob.vercel-storage.com/offers/x.webp")).not.toBeNull();
    expect(safeImageUrl("https://evil.example.com/x.png")).toBeNull();
    expect(safeImageUrl("http://abc.public.blob.vercel-storage.com/x.png")).toBeNull();
    expect(safeImageUrl("https://abc.public.blob.vercel-storage.com.evil.com/x.png")).toBeNull();
    expect(safeImageUrl(null)).toBeNull();
  });

  it("maps product types to the request flow and falls back to the picker", () => {
    expect(requestLinkFor("leasing")).toBe("/requests/new?type=vehicle");
    expect(requestLinkFor("overdraft")).toBe("/requests/new");
  });

  it("counts whole days left, never negative", () => {
    expect(daysLeft("2026-10-23T12:00:00Z", NOW)).toBe(1);
    expect(daysLeft("2026-10-01T00:00:00Z", NOW)).toBe(0);
  });
});
