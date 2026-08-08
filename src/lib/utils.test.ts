import { describe, it, expect } from "vitest";
import { toTitleCase } from "./utils";

describe("toTitleCase", () => {
  it("capitalizes each word", () => {
    expect(toTitleCase("world endurance championship")).toBe("World Endurance Championship");
  });

  it("keeps skip-words lowercase unless they're first", () => {
    expect(toTitleCase("24 hours of le mans")).toBe("24 Hours of le Mans");
  });

  it("capitalizes a skip-word when it's the first word", () => {
    expect(toTitleCase("of mice and men")).toBe("Of Mice and Men");
  });

  it("uppercases known racing acronyms", () => {
    expect(toTitleCase("gt3 sprint cup")).toBe("GT3 Sprint Cup");
  });
});
