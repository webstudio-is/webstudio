import { describe, expect, test } from "vitest";
import { getAssetResourceOperationalAlerts } from "./resource-index-observability";

describe("asset resource operational alerts", () => {
  test("alerts on failed, long-stale, oversized, orphaned, and failed-GC indexes", () => {
    expect(
      getAssetResourceOperationalAlerts({
        activeIndexes: 3,
        indexingIndexes: 1,
        failedIndexes: 1,
        staleIndexes: 1,
        oldestStaleAgeMs: 16 * 60 * 1000,
        oversizedIndexAttempts: 1,
        orphanedObjects: 2,
        garbageCollectionFailures: 1,
      }).map(({ code }) => code)
    ).toEqual([
      "INDEX_BUILD_FAILED",
      "INDEX_STALE_TOO_LONG",
      "INDEX_OVERSIZED",
      "INDEX_ORPHANED",
      "INDEX_GC_FAILED",
    ]);
  });

  test("does not alert for a healthy snapshot", () => {
    expect(
      getAssetResourceOperationalAlerts({
        activeIndexes: 3,
        indexingIndexes: 0,
        failedIndexes: 0,
        staleIndexes: 0,
        oldestStaleAgeMs: 0,
        oversizedIndexAttempts: 0,
        orphanedObjects: 0,
        garbageCollectionFailures: 0,
      })
    ).toEqual([]);
  });
});
