import { act } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect } from "vitest";
import RegisterTypeSelect from "./RegisterTypeSelect";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe("RegisterTypeSelect", () => {
  it("offers individual and institution sign-up, and shows business as coming soon only", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    await act(async () => {
      createRoot(host).render(<MemoryRouter><RegisterTypeSelect /></MemoryRouter>);
    });
    const card = (title: string) =>
      [...host.querySelectorAll("button")].find((b) => b.textContent?.includes(title)) as HTMLButtonElement;

    expect(card("Individual").disabled).toBe(false);
    expect(card("Financial Institution").disabled).toBe(false);
    expect(card("Business").disabled).toBe(true);
    expect(card("Business").textContent).toContain("Coming soon");
  });
});
