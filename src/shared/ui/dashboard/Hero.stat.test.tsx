import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { Hero, type HeroStat } from "./index";

describe("Hero stat empty-state", () => {
  it("renders a numeric value when present", () => {
    const stats: HeroStat[] = [{ label: "Net worth", value: 5000, prefix: "Rs ", format: "comma" }];
    const { getByText } = render(<Hero headline="x" stats={stats} />);
    expect(getByText("Net worth")).toBeInTheDocument();
  });

  it("renders the display placeholder + hint instead of a number when empty", () => {
    const stats: HeroStat[] = [{ label: "Net worth", display: "—", hint: "Add finances" }];
    const { getByText } = render(<Hero headline="x" stats={stats} />);
    expect(getByText("—")).toBeInTheDocument();
    expect(getByText("Add finances")).toBeInTheDocument();
  });
});
