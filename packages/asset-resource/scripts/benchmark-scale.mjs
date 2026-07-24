import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { build as bundle } from "esbuild";
import {
  buildAssetResourceIndex,
  createAssetFieldCatalog,
  createCanonicalAssetFileEntry,
  executeAssetQueryPlan,
  extractMarkdownFrontmatter,
  normalizeAssetFileDocument,
  persistAssetResourceIndex,
  serializeAssetResourceIndex,
  verifyAssetResourceIndex,
} from "../src/index.ts";
import { createScaleMarkdownFixture } from "../src/scale-fixture.ts";

const projectId = "scale-project";
const resourceId = "blog-posts";
const files = createScaleMarkdownFixture(1000);
const encoder = new TextEncoder();

const percentile = (samples, quantile) =>
  [...samples].sort((left, right) => left - right)[
    Math.min(samples.length - 1, Math.floor(samples.length * quantile))
  ];
const measure = async (iterations, operation) => {
  const samples = [];
  for (let index = 0; index < iterations; index += 1) {
    const startedAt = performance.now();
    await operation(index);
    samples.push(performance.now() - startedAt);
  }
  return {
    medianMs: Number(percentile(samples, 0.5).toFixed(3)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(3)),
  };
};

let markdownReads = 0;
const deriveEntry = async (file, revision = `revision-${file.id}`) => {
  markdownReads += 1;
  const metadata = await extractMarkdownFrontmatter(file.source);
  return createCanonicalAssetFileEntry({
    projectId,
    document: normalizeAssetFileDocument({
      asset: {
        id: file.id,
        name: file.name,
        folderId: "blog",
        folderNames: ["blog"],
        mimeType: "text/markdown",
        size: encoder.encode(file.source).byteLength,
        revision,
        contentRef: file.name,
      },
      properties: metadata.properties,
      excerpt: `Deterministic excerpt for ${file.id}`,
    }),
  });
};

const initialStartedAt = performance.now();
const entries = [];
for (const file of files) {
  entries.push(await deriveEntry(file));
}
const catalog = await createAssetFieldCatalog(entries);
const initialBackfillMs = performance.now() - initialStartedAt;
const initialMarkdownReads = markdownReads;

const listingQuery = `query Posts($locale: String!) {
  assets(
    where: { extension: { eq: "md" }, properties: { locale: { eq: $locale } } }
    orderBy: [{ field: PROPERTIES_publishedAt, direction: DESC }, { field: ID, direction: ASC }]
    first: 20
  ) {
    items { id properties { title slug } excerpt }
    totalCount
    hasMore
  }
}`;
const detailQuery = `query Post($slug: String!) {
  assets(where: { properties: { slug: { eq: $slug } } }, first: 1) {
    items {
      id
      revision
      properties { title }
      content(mode: FULL) { text }
    }
  }
}`;
const buildIndex = (query = listingQuery) =>
  buildAssetResourceIndex({ projectId, resourceId, query, entries });

const coldBuildStartedAt = performance.now();
const listingIndex = await buildIndex();
const coldBuildMs = performance.now() - coldBuildStartedAt;
const warmBuild = await measure(10, () => buildIndex());
const queryChangeBuild = await measure(10, (iteration) =>
  buildIndex(`${listingQuery}\n${" ".repeat(iteration + 1)}`)
);

markdownReads = 0;
const changedFile = {
  ...files[999],
  source: files[999].source.replace("Post 999", "Changed post 999"),
};
const incrementalStartedAt = performance.now();
const changedEntry = await deriveEntry(changedFile, "revision-post-0999-v2");
const changedEntries = [...entries];
changedEntries[999] = changedEntry;
await buildAssetResourceIndex({
  projectId,
  resourceId,
  query: listingQuery,
  entries: changedEntries,
});
const incrementalMs = performance.now() - incrementalStartedAt;

const serialized = serializeAssetResourceIndex(listingIndex);
const indexBytes = encoder.encode(serialized);
const parsed = JSON.parse(serialized);
const coldParseAndVerify = await measure(10, async () => {
  await verifyAssetResourceIndex(JSON.parse(serialized));
});

let immutablePuts = 0;
const persistStartedAt = performance.now();
await persistAssetResourceIndex({
  projectId,
  index: listingIndex,
  store: {
    putIfAbsent: async ({ checksum }) => {
      immutablePuts += 1;
      return { status: "created", checksum };
    },
  },
});
const immutablePutMs = performance.now() - persistStartedAt;
let immutableDeletes = 0;
const gcStartedAt = performance.now();
await (async () => {
  immutableDeletes += 1;
  return "deleted";
})();
const garbageCollectionMs = performance.now() - gcStartedAt;

const detailIndex = await buildIndex(detailQuery);
const listingRequest = {
  variables: { locale: "en" },
};
const detailRequest = {
  variables: { slug: "post-0999" },
};
const execute = (request, index) =>
  executeAssetQueryPlan({
    plan: index.plan,
    documents: index.documents,
    assetRevision: index.assetRevision,
    variables: request.variables,
    read: async (contentRef, range) => {
      const file = files.find(({ name }) => name === contentRef);
      if (file === undefined) {
        throw new Error("Scale fixture content is missing");
      }
      const bytes = encoder
        .encode(file.source)
        .subarray(
          range?.offset ?? 0,
          range === undefined ? undefined : range.offset + range.length
        );
      return {
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
      };
    },
  });
await execute(listingRequest, listingIndex);
const warmListing = await measure(50, () =>
  execute(listingRequest, listingIndex)
);
const detailAndHydration = await measure(50, async () => {
  await execute(detailRequest, detailIndex);
});

const workerBundle = await bundle({
  entryPoints: [
    new URL("../src/published-runtime.ts", import.meta.url).pathname,
  ],
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: "es2022",
  conditions: ["webstudio", "browser"],
  write: false,
});
const workerBytes = workerBundle.outputFiles[0].contents;
const memoryBefore = process.memoryUsage().heapUsed;
const retainedCopies = Array.from({ length: 10 }, () => JSON.parse(serialized));
const memoryAfter = process.memoryUsage().heapUsed;
void retainedCopies;

console.info(
  JSON.stringify(
    {
      environment: { node: process.version, platform: process.platform },
      fixture: {
        markdownFiles: files.length,
        publicCandidateFiles: listingIndex.documents.length,
        dynamicFieldPaths: catalog.fields.length,
      },
      initialBackfill: {
        durationMs: Number(initialBackfillMs.toFixed(3)),
        markdownReads: initialMarkdownReads,
      },
      incrementalOneFile: {
        durationMs: Number(incrementalMs.toFixed(3)),
        markdownReads,
        unchangedMarkdownReads: files.length - markdownReads,
      },
      queryRebuild: {
        coldMs: Number(coldBuildMs.toFixed(3)),
        warm: warmBuild,
        changedQuery: queryChangeBuild,
      },
      indexArtifact: {
        jsonBytes: indexBytes.byteLength,
        gzipBytes: gzipSync(indexBytes).byteLength,
        coldParseAndVerify,
      },
      immutableStorage: {
        putOperations: immutablePuts,
        putDurationMs: Number(immutablePutMs.toFixed(3)),
        garbageCollectionDeleteOperations: immutableDeletes,
        garbageCollectionDurationMs: Number(garbageCollectionMs.toFixed(3)),
      },
      workerRuntime: {
        minifiedBundleBytes: workerBytes.byteLength,
        minifiedBundleGzipBytes: gzipSync(workerBytes).byteLength,
        warmListing,
        dynamicSlugAndFullHydration: detailAndHydration,
        parsedIndexHeapBytesPerCopyEstimate: Math.max(
          0,
          Math.round((memoryAfter - memoryBefore) / retainedCopies.length)
        ),
      },
      publication: {
        staticMarkdownFiles: listingIndex.documents.length,
        resourceIndexFiles: 1,
        generatedTypeScriptIndexBytes: 0,
      },
    },
    null,
    2
  )
);
