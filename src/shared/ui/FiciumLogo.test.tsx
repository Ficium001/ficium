import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { FiciumLogo } from "./FiciumLogo";

describe("FiciumLogo", () => {
  it("renders an svg mark", () => {
    const { container } = render(<FiciumLogo size={30} />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 310 153");
  });

  it("renders the wordmark when requested", () => {
    const { getByText } = render(<FiciumLogo withWordmark />);
    expect(getByText("Ficium")).toBeInTheDocument();
  });

  it("sizes by height when heightPx is given (310:153 ratio)", () => {
    const { container } = render(<FiciumLogo heightPx={20} />);
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("height")).toBe("20");
    // width = round(20 / (153/310)) = round(40.5) = 41
    expect(svg?.getAttribute("width")).toBe("41");
  });
});
