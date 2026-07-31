import { describe, expect, test } from "vitest";
import { compileContentArtifact } from "./asset-index";
import { createCanonicalAssetFileEntry } from "./canonical";
import { contentArtifactV1 } from "./schema";
import {
  checksumContentArtifact,
  getContentArtifactRuntimeAssetIds,
  verifyContentArtifact,
} from "./content-artifact";
import {
  createDocumentGraph,
  createDocumentGraphArtifact,
} from "./document-graph";

const entry = createCanonicalAssetFileEntry({
  projectId: "project",
  document: {
    _id: "post",
    _type: "asset.file",
    name: "post.json",
    path: "posts/post.json",
    key: "post",
    extension: "json",
    mimeType: "application/json",
    size: 2,
    revision: "post-r1",
    contentRef: "content:post",
    properties: {},
  },
});

const graph = createDocumentGraph({
  nodes: [{ id: "post", revision: "post-r1", contentRef: "content:post" }],
  edges: [],
});

describe("content artifact document graph", () => {
  test("retains runtime URLs for graph documents even when query documents are materialized", () => {
    expect(
      getContentArtifactRuntimeAssetIds({
        artifact: {
          documents: [],
          documentGraph: {
            nodes: graph.nodes,
          },
        },
        includeDocuments: false,
      })
    ).toEqual(["post"]);
  });

  test("verifies nested graph integrity independently of the outer checksum", async () => {
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries: [entry],
      documentGraph: graph,
    });
    const tampered = {
      ...artifact,
      documentGraph: {
        ...artifact.documentGraph!,
        nodes: artifact.documentGraph!.nodes.map((node) => ({
          ...node,
          contentRef: "content:tampered",
        })),
      },
    };
    const outerChecksum = await checksumContentArtifact(tampered);

    await expect(
      verifyContentArtifact({
        ...tampered,
        integrity: { algorithm: "sha256", checksum: outerChecksum },
      })
    ).rejects.toMatchObject({ code: "CHECKSUM_MISMATCH" });
  });

  test("rejects a graph identity that differs from its query document", async () => {
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries: [entry],
      documentGraph: graph,
    });
    const documentGraph = await createDocumentGraphArtifact(
      createDocumentGraph({
        nodes: [
          {
            id: "post",
            revision: "post-r2",
            contentRef: "content:post-r2",
          },
        ],
        edges: [],
      })
    );
    const tampered = contentArtifactV1.parse({ ...artifact, documentGraph });

    await expect(
      verifyContentArtifact({
        ...tampered,
        integrity: {
          algorithm: "sha256",
          checksum: await checksumContentArtifact(tampered),
        },
      })
    ).rejects.toThrow("document identity");
  });

  test("accepts graph identity fields omitted by query projection", async () => {
    const { artifact } = await compileContentArtifact({
      projectId: "project",
      entries: [entry],
      documentGraph: graph,
    });
    const projected = contentArtifactV1.parse({
      ...artifact,
      documents: artifact.documents.map(
        ({ revision: _revision, contentRef: _contentRef, ...document }) =>
          document
      ),
    });
    const projectedWithChecksum = {
      ...projected,
      integrity: {
        algorithm: "sha256" as const,
        checksum: await checksumContentArtifact(projected),
      },
    };

    await expect(verifyContentArtifact(projectedWithChecksum)).resolves.toEqual(
      projectedWithChecksum
    );
  });

  test("counts persisted graph bytes against the artifact limit", async () => {
    const withoutGraph = await compileContentArtifact({
      projectId: "project",
      entries: [entry],
    });
    const withGraph = await compileContentArtifact({
      projectId: "project",
      entries: [entry],
      documentGraph: graph,
    });

    expect(withGraph.diagnostics.boundedBytes).toBeGreaterThan(
      withoutGraph.diagnostics.boundedBytes
    );
    const constrained = await compileContentArtifact({
      projectId: "project",
      entries: [entry],
      documentGraph: graph,
      maxBytes: withoutGraph.diagnostics.boundedBytes,
    });
    expect(constrained.artifact.documents).toEqual([]);
    expect(constrained.diagnostics.boundedBytes).toBeLessThanOrEqual(
      withoutGraph.diagnostics.boundedBytes
    );
    await expect(
      compileContentArtifact({
        projectId: "project",
        entries: [entry],
        documentGraph: graph,
        maxBytes: Math.floor(constrained.diagnostics.boundedBytes / 2),
      })
    ).rejects.toThrow("Content database byte limit is too small");
  });
});
