import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import { build as bundle } from "esbuild";
import {
  createAssetFieldCatalog,
  createAssetIndex,
  createCanonicalAssetFileEntry,
  executeAssetQuery,
  extractMarkdownFrontmatter,
  normalizeAssetFileDocument,
  serializeAssetIndex,
  verifyAssetIndex,
} from "../src/index.ts";
import { createScaleMarkdownFixture } from "../src/scale-fixture.ts";

const projectId = "scale-project";
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
    await operation();
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

const buildIndex = () => createAssetIndex({ projectId, entries });
const coldBuildStartedAt = performance.now();
const index = await buildIndex();
const coldBuildMs = performance.now() - coldBuildStartedAt;
const warmBuild = await measure(10, buildIndex);

markdownReads = 0;
const changedFile = {
  ...files[999],
  source: files[999].source.replace("Post 999", "Changed post 999"),
};
const incrementalStartedAt = performance.now();
await deriveEntry(changedFile, "revision-post-0999-v2");
const incrementalMs = performance.now() - incrementalStartedAt;

const serialized = serializeAssetIndex(index);
const indexBytes = encoder.encode(serialized);
const coldParseAndVerify = await measure(10, () =>
  verifyAssetIndex(JSON.parse(serialized))
);

const read = async (contentRef, range) => {
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
};
const listingQuery = {
  filters: [
    { field: ["extension"], operator: "eq", value: "md" },
    { field: ["properties", "locale"], operator: "eq", value: "en" },
  ],
  sort: [
    { field: ["properties", "publishedAt"], direction: "desc" },
    { field: ["id"], direction: "asc" },
  ],
  limit: 20,
};
const detailQuery = {
  filters: [
    {
      field: ["properties", "slug"],
      operator: "eq",
      value: "post-999",
    },
  ],
  limit: 1,
  content: { mode: "full" },
};
const warmListing = await measure(50, () =>
  executeAssetQuery({ query: listingQuery, documents: index.documents })
);
const detailAndHydration = await measure(50, () =>
  executeAssetQuery({ query: detailQuery, documents: index.documents, read })
);

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

console.info(
  JSON.stringify(
    {
      fixture: {
        markdownFiles: files.length,
        indexedFiles: index.documents.length,
        dynamicFieldPaths: catalog.fields.length,
      },
      initialBackfill: {
        durationMs: Number(initialBackfillMs.toFixed(3)),
        markdownReads: initialMarkdownReads,
      },
      incrementalOneFile: {
        durationMs: Number(incrementalMs.toFixed(3)),
        markdownReads,
      },
      indexBuild: { coldMs: Number(coldBuildMs.toFixed(3)), warm: warmBuild },
      indexArtifact: {
        jsonBytes: indexBytes.byteLength,
        gzipBytes: gzipSync(indexBytes).byteLength,
        coldParseAndVerify,
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
    },
    null,
    2
  )
);
