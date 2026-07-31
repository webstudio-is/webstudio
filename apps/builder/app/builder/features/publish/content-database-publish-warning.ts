type ContentDatabasePublishDiagnostics = {
  stats: {
    usedBytes: number;
    maxBytes: number;
    unboundedBytes: number;
    includedDocumentCount: number;
    omittedDocumentCount: number;
    truncated: boolean;
  };
  potentiallyAffectedResources: { id: string; name: string }[];
  hasDynamicValues: boolean;
};

export type ContentDatabasePublishWarning = {
  includedDocumentCount: number;
  totalDocumentCount: number;
  omittedDocumentCount: number;
  usedKiB: number;
  maxKiB: number;
  omissionKind: "size" | "unavailable";
  affectedResourceNames: string[];
  affectedResourceKind: "dynamic" | "static" | undefined;
};

export const getContentDatabasePublishWarning = (
  diagnostics: ContentDatabasePublishDiagnostics | undefined
) => {
  if (diagnostics?.stats.truncated !== true) {
    return;
  }
  const { stats } = diagnostics;
  const affectedResourceNames = diagnostics.potentiallyAffectedResources.map(
    ({ name }) => name
  );
  return {
    includedDocumentCount: stats.includedDocumentCount,
    totalDocumentCount:
      stats.includedDocumentCount + stats.omittedDocumentCount,
    omittedDocumentCount: stats.omittedDocumentCount,
    usedKiB: Math.ceil(stats.usedBytes / 1024),
    maxKiB: Math.ceil(stats.maxBytes / 1024),
    omissionKind:
      stats.unboundedBytes > stats.maxBytes ? "size" : "unavailable",
    affectedResourceNames,
    affectedResourceKind:
      affectedResourceNames.length === 0
        ? undefined
        : diagnostics.hasDynamicValues
          ? "dynamic"
          : "static",
  } satisfies ContentDatabasePublishWarning;
};
