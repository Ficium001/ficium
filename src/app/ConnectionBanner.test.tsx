import { afterEach, describe, expect, it } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { onlineManager } from "@tanstack/react-query";
import { ConnectionBanner } from "./ConnectionBanner";

describe("ConnectionBanner", () => {
  afterEach(() => onlineManager.setOnline(true));

  it("is silent while online", () => {
    render(<ConnectionBanner />);
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("announces when the device goes offline and clears on reconnect", () => {
    render(<ConnectionBanner />);
    act(() => onlineManager.setOnline(false));
    expect(screen.getByRole("status").textContent).toMatch(/offline/i);
    act(() => onlineManager.setOnline(true));
    expect(screen.getByRole("status").textContent).toBe("");
  });
});
