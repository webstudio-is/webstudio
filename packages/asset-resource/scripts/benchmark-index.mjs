import { gzipSync } from "node:zlib";
import { performance } from "node:perf_hooks";
import {
  buildAssetResourceIndex,
  createCanonicalAssetFileEntry,
  serializeAssetResourceIndex,
  verifyAssetResourceIndex,
} from "../src/index.ts";

const documents = Array.from({ length: 1000 }, (_, index) => ({
  _id: `post-${String(index).padStart(4, "0")}`,
  _type: "asset.file",
  name: `post-${index}.md`,
  path: `blog/post-${index}.md`,
  key: `post-${index}`,
  folderId: "blog",
  extension: "md",
  mimeType: "text/markdown",
  size: 4000 + index,
  revision: `content-revision-${index}`,
  contentRef: `private:post-${index}.md`,
  properties: {
    title: `Representative blog post ${index}`,
    slug: `post-${index}`,
    publishedAt: `2026-07-${String((index % 28) + 1).padStart(2, "0")}`,
    draft: index % 10 === 0,
    locale: index % 2 === 0 ? "en" : "de",
    author: { name: `Author ${index % 25}` },
    tags: [`tag-${index % 10}`, `group-${index % 4}`],
  },
  excerpt: `A bounded representative excerpt for post ${index}.`,
}));

const entries = documents.map((document) =>
  createCanonicalAssetFileEntry({ projectId: "benchmark-project", document })
);
const query = `query PublishedPosts($locale: String!) {
  assets(
    where: {
      extension: { eq: "md" }
      properties: { draft: { ne: true }, locale: { eq: $locale } }
    }
    orderBy: [{ field: PROPERTIES_publishedAt, direction: DESC }, { field: ID, direction: ASC }]
  ) {
    items { id path properties { title slug publishedAt } excerpt }
  }
}`;

const percentile = (samples, quantile) =>
  [...samples].sort((left, right) => left - right)[
    Math.min(samples.length - 1, Math.floor(samples.length * quantile))
  ];

const measure = async (iterations, operation) => {
  const samples = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const start = performance.now();
    await operation();
    samples.push(performance.now() - start);
  }
  return {
    medianMs: Number(percentile(samples, 0.5).toFixed(3)),
    p95Ms: Number(percentile(samples, 0.95).toFixed(3)),
  };
};

const build = () =>
  buildAssetResourceIndex({
    projectId: "benchmark-project",
    resourceId: "posts",
    query,
    entries,
  });

for (let iteration = 0; iteration < 3; iteration += 1) {
  await build();
}
const index = await build();
const serialized = serializeAssetResourceIndex(index);
const encoded = new TextEncoder().encode(serialized);
const parsed = JSON.parse(serialized);

const result = {
  fixtureDocuments: entries.length,
  candidateDocuments: index.documents.length,
  jsonBytes: encoded.byteLength,
  gzipBytes: gzipSync(encoded).byteLength,
  build: await measure(20, build),
  parse: await measure(100, () => JSON.parse(serialized)),
  verify: await measure(20, () => verifyAssetResourceIndex(parsed)),
};

console.info(JSON.stringify(result, null, 2));
