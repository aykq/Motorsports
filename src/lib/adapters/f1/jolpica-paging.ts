// The bulk /results.json endpoint is paged. Terminating on MRData.total is
// fragile — it has been observed too low, cutting the loop before the last page
// (the one with the newest round). Instead keep paging until a page comes back
// smaller than the page size, i.e. the tail.
export const RESULTS_PAGE_SIZE = 100;
export const MAX_RESULT_PAGES = 12; // ~1200 results; a full season is < 600

export function isLastResultsPage(rowsOnPage: number): boolean {
  return rowsOnPage < RESULTS_PAGE_SIZE;
}
