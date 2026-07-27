type ContentDatabasePublishDiagnostics = {
  stats: {
    usedBytes: number;
    maxBytes: number;
    includedDocumentCount: number;
    omittedDocumentCount: number;
    truncated: boolean;
  };
  potentiallyAffectedResources: { id: string; name: string }[];
  hasDynamicValues: boolean;
};

export const getContentDatabasePublishWarning = (
  diagnostics: ContentDatabasePublishDiagnostics | undefined
) => {
  if (diagnostics?.stats.truncated !== true) {
    return;
  }
  const { stats } = diagnostics;
  const total = stats.includedDocumentCount + stats.omittedDocumentCount;
  const names = diagnostics.potentiallyAffectedResources
    .map(({ name }) => name)
    .join(", ");
  const resources =
    names === ""
      ? ""
      : diagnostics.hasDynamicValues
        ? ` Queries with route or variable values may be incomplete in: ${names}.`
        : ` Potentially affected Assets resources: ${names}.`;
  return `The published content database will include ${stats.includedDocumentCount} of ${total} files (${Math.ceil(stats.usedBytes / 1024)} of ${Math.ceil(stats.maxBytes / 1024)} KiB). ${stats.omittedDocumentCount} files will be omitted.${resources}`;
};
