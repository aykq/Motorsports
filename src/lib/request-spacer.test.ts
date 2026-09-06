import { describe, it, expect } from "vitest";
import { makeRequestSpacer } from "./request-spacer";

describe("makeRequestSpacer", () => {
  it("lets the first call through with no wait", () => {
    const spacer = makeRequestSpacer(400, () => 1000);
    expect(spacer()).toBe(0);
  });

  it("spaces back-to-back calls by the minimum gap", () => {
    const spacer = makeRequestSpacer(400, () => 1000);
    expect(spacer()).toBe(0);
    expect(spacer()).toBe(400);
    expect(spacer()).toBe(800);
  });

  it("charges nothing once enough real time has passed", () => {
    let now = 1000;
    const spacer = makeRequestSpacer(400, () => now);
    spacer();
    now = 5000;
    expect(spacer()).toBe(0);
  });

  it("accounts for partial elapsed time between calls", () => {
    let now = 1000;
    const spacer = makeRequestSpacer(400, () => now);
    spacer(); // reserves up to 1400
    now = 1100;
    expect(spacer()).toBe(300); // 1400 - 1100
  });
});
