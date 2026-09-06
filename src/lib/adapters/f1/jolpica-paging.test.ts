import { describe, it, expect } from "vitest";
import { isLastResultsPage, RESULTS_PAGE_SIZE } from "./jolpica-paging";

describe("isLastResultsPage", () => {
  it("is the last page when it returned fewer rows than the page size", () => {
    expect(isLastResultsPage(86)).toBe(true);
  });

  it("is the last page when it returned nothing", () => {
    expect(isLastResultsPage(0)).toBe(true);
  });

  it("is not the last page when it returned a full page", () => {
    expect(isLastResultsPage(RESULTS_PAGE_SIZE)).toBe(false);
  });
});
