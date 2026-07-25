/** Shared limits for asset indexing, authoring, and published query runtimes. */
export const assetResourceLimits = {
  requestBytes: 512 * 1024,
  apiDescriptionBytes: 512 * 1024,
  apiDescriptionExampleBytes: 64 * 1024,
  filterCount: 32,
  filterDepth: 8,
  sortCount: 8,
  fieldPathDepth: 9,
  defaultResultCount: 100,
  resultCount: 1000,
  // Hydrated text can expand when JSON-escaped. Keep the response bounded
  // while leaving room for the two-megabyte content budget and metadata.
  resultBytes: 16 * 1024 * 1024,
  candidateDocuments: 1000,
  indexBytes: 16 * 1024 * 1024,
  // A generated deployment has one immutable manifest. Retaining older parsed
  // indexes in the same isolate only multiplies Worker memory usage.
  runtimeCachedIndexes: 1,
  frontmatterBytes: 64 * 1024,
  frontmatterDepth: 8,
  frontmatterFields: 256,
  frontmatterStringBytes: 16 * 1024,
  jsonBytes: 1024 * 1024,
  jsonDepth: 8,
  jsonFields: 256,
  jsonStringBytes: 16 * 1024,
  indexedPropertiesBytes: 64 * 1024,
  excerptBytes: 2 * 1024,
  hydratedFileBytes: 1024 * 1024,
  hydratedTotalBytes: 2 * 1024 * 1024,
  hydratedFileCount: 20,
  hydratedRangeBytes: 256 * 1024,
  concurrentContentReads: 8,
} as const;
