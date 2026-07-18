import { gzipSync } from "node:zlib";
import { build } from "esbuild";
import { evaluate, parse } from "groq-js/1";

const documentCount = 1000;
const iterations = 100;
const documents = Array.from({ length: documentCount }, (_, index) => ({
  _id: `asset-${index.toString().padStart(4, "0")}`,
  _type: "asset.file",
  name: `post-${index}.md`,
  path: `blog/post-${index}.md`,
  key: `post-${index}`,
  folderId: "blog",
  extension: "md",
  mimeType: "text/markdown",
  size: 4096,
  revision: `revision-${index}`,
  contentRef: `content-${index}`,
  properties: {
    title: `Post ${index}`,
    slug: `post-${index}`,
    publishedAt: new Date(2026, 0, 1 + (index % 365)).toISOString(),
    draft: index % 20 === 0,
    author: { name: `Author ${index % 25}` },
  },
  excerpt: `Excerpt for post ${index}`,
}));

const listingQuery = `
  *[_type == "asset.file" && folderId == $folderId && properties.draft != true]
  | order(properties.publishedAt desc, _id asc)
  [0...20]{_id, "title": properties.title, "slug": properties.slug, excerpt}
`;
const detailQuery = `*[properties.slug == $slug][0]{_id, revision, contentRef}`;

const benchmark = async (callback) => {
  const samples = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const startedAt = performance.now();
    await callback(iteration);
    samples.push(performance.now() - startedAt);
  }
  samples.sort((left, right) => left - right);
  return {
    average: samples.reduce((total, sample) => total + sample, 0) / iterations,
    median: samples[Math.floor(iterations / 2)],
    p95: samples[Math.floor(iterations * 0.95)],
  };
};

const parseTiming = await benchmark(() => parse(listingQuery));
const listingTree = parse(listingQuery);
const detailTree = parse(detailQuery);

const evaluateQuery = async (tree, params) => {
  const value = await evaluate(tree, { dataset: documents, params });
  await value.get();
};

await evaluateQuery(listingTree, { folderId: "blog" });
await evaluateQuery(detailTree, { slug: "post-999" });

const listingTiming = await benchmark(() =>
  evaluateQuery(listingTree, { folderId: "blog" })
);
const detailTiming = await benchmark((iteration) =>
  evaluateQuery(detailTree, { slug: `post-${iteration * 10 + 9}` })
);

const bundle = await build({
  stdin: {
    contents: `export { parse, evaluate } from "groq-js/1";`,
    resolveDir: process.cwd(),
  },
  bundle: true,
  format: "esm",
  minify: true,
  platform: "browser",
  target: "es2022",
  write: false,
});
const bundleBytes = bundle.outputFiles[0].contents;

console.info(
  JSON.stringify(
    {
      groqJsVersion: process.env.npm_package_dependencies_groq_js,
      nodeVersion: process.version,
      documentCount,
      iterations,
      bundle: {
        minifiedBytes: bundleBytes.byteLength,
        minifiedGzipBytes: gzipSync(bundleBytes).byteLength,
      },
      timingMs: {
        parse: parseTiming,
        listing: listingTiming,
        detail: detailTiming,
      },
    },
    undefined,
    2
  )
);
