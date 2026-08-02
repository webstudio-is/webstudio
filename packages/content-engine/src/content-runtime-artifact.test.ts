import { expect, test } from "vitest";
import { compileContentArtifact } from "./asset-index";
import { createCanonicalAssetFileEntry } from "./canonical";
import { serializeContentArtifact } from "./content-artifact";
import {
  createContentRuntimeArtifact,
  getContentRuntimeArtifactRuntimeAssetIds,
  restoreContentRuntimeDocumentGraph,
  serializeContentRuntimeArtifact,
} from "./content-runtime-artifact";
import { createDocumentGraph } from "./document-graph";
import type { AssetFileDocument } from "./schema";

test("projects build metadata and inline JSON graph sources out of the runtime artifact", async () => {
  const post: AssetFileDocument = {
    _id: "post",
    _type: "asset.file",
    name: "post.json",
    path: "posts/post.json",
    key: "post",
    extension: "json",
    mimeType: "application/json",
    size: 80,
    revision: "post-r1",
    contentRef: "post.json",
    properties: {
      kind: "post",
      slug: "post",
      title: "Post",
      body: { $ref: "./post.md#body" },
    },
  };
  const markdown: AssetFileDocument = {
    ...post,
    _id: "markdown",
    name: "post.md",
    path: "posts/post.md",
    extension: "md",
    mimeType: "text/markdown",
    size: 2_000,
    revision: "markdown-r1",
    contentRef: "post.md",
    properties: { title: "Post" },
  };
  const { artifact } = await compileContentArtifact({
    projectId: "project",
    entries: [post, markdown].map((document) =>
      createCanonicalAssetFileEntry({ projectId: "project", document })
    ),
    documentGraph: createDocumentGraph({
      nodes: [
        {
          id: post._id,
          revision: post.revision,
          contentRef: post.contentRef,
          format: "json",
        },
        {
          id: markdown._id,
          revision: markdown.revision,
          contentRef: markdown.contentRef,
          format: "markdown",
        },
      ],
      edges: [
        {
          sourceId: post._id,
          referenceId: "#/body",
          reference: {
            documentId: markdown._id,
            revision: markdown.revision,
            representation: { type: "markdown-body" },
          },
        },
      ],
    }),
  });

  const runtime = createContentRuntimeArtifact(artifact);
  const serialized = serializeContentRuntimeArtifact(runtime);
  const parsed = JSON.parse(serialized);

  expect(serialized.length).toBeLessThan(
    serializeContentArtifact(artifact).length / 3
  );
  expect(parsed).not.toHaveProperty("fieldCatalog");
  expect(parsed).not.toHaveProperty("database");
  expect(parsed).not.toHaveProperty("integrity");
  expect(runtime.documentGraph?.nodes.map(({ id }) => id)).toEqual([
    "markdown",
  ]);
  expect(runtime.documentGraph?.edges).toEqual([
    {
      sourceId: "post",
      referenceId: "#/body",
      documentId: "markdown",
      representation: { type: "markdown-body" },
    },
  ]);
  expect(
    getContentRuntimeArtifactRuntimeAssetIds({
      artifact: runtime,
      includeDocuments: false,
    })
  ).toEqual(["markdown"]);

  const restored = restoreContentRuntimeDocumentGraph({ artifact: runtime });
  expect(restored?.inlineDocuments.has("post")).toBe(true);
  expect(restored?.graph.nodes.map(({ id }) => id)).toEqual([
    "markdown",
    "post",
  ]);
  expect(restored?.graph.edges[0].reference.revision).toBe("markdown-r1");
});
