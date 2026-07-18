export type AssetResourceOperationalMetrics = {
  activeIndexes: number;
  indexingIndexes: number;
  failedIndexes: number;
  staleIndexes: number;
  oldestStaleAgeMs: number;
  oversizedIndexAttempts: number;
  orphanedObjects: number;
  garbageCollectionFailures: number;
};

export type AssetResourceOperationalAlert = {
  code:
    | "INDEX_BUILD_FAILED"
    | "INDEX_STALE_TOO_LONG"
    | "INDEX_OVERSIZED"
    | "INDEX_ORPHANED"
    | "INDEX_GC_FAILED";
  severity: "warning" | "critical";
  value: number;
};

export const assetResourceOperationalThresholds = {
  staleAgeMs: 15 * 60 * 1000,
  failedIndexes: 0,
  oversizedIndexAttempts: 0,
  orphanedObjects: 0,
  garbageCollectionFailures: 0,
} as const;

export const getAssetResourceOperationalAlerts = (
  metrics: AssetResourceOperationalMetrics
): AssetResourceOperationalAlert[] => {
  const alerts: AssetResourceOperationalAlert[] = [];
  if (metrics.failedIndexes > 0) {
    alerts.push({
      code: "INDEX_BUILD_FAILED",
      severity: "critical",
      value: metrics.failedIndexes,
    });
  }
  if (
    metrics.staleIndexes > 0 &&
    metrics.oldestStaleAgeMs > assetResourceOperationalThresholds.staleAgeMs
  ) {
    alerts.push({
      code: "INDEX_STALE_TOO_LONG",
      severity: "warning",
      value: metrics.oldestStaleAgeMs,
    });
  }
  if (metrics.oversizedIndexAttempts > 0) {
    alerts.push({
      code: "INDEX_OVERSIZED",
      severity: "warning",
      value: metrics.oversizedIndexAttempts,
    });
  }
  if (metrics.orphanedObjects > 0) {
    alerts.push({
      code: "INDEX_ORPHANED",
      severity: "warning",
      value: metrics.orphanedObjects,
    });
  }
  if (metrics.garbageCollectionFailures > 0) {
    alerts.push({
      code: "INDEX_GC_FAILED",
      severity: "critical",
      value: metrics.garbageCollectionFailures,
    });
  }
  return alerts;
};
