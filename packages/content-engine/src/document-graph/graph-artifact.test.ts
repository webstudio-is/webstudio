import { describe, expect, test } from "vitest";
import { serializeJsonDeterministically, sha256 } from "../canonical-json";
import { createDocumentGraph } from "./graph";
import {
  createDocumentGraphArtifact,
  DocumentGraphArtifactError,
  parseDocumentGraphArtifact,
  serializeDocumentGraphArtifact,
  verifyDocumentGraphArtifact,
} from "./graph-artifact";

const createFixtureGraph = (reverse = false) =>
  createDocumentGraph({
    nodes: reverse
      ? [
          { id: "author", revision: "author-r1", contentRef: "content:author" },
          { id: "post", revision: "post-r1", contentRef: "content:post" },
        ]
      : [
          { id: "post", revision: "post-r1", contentRef: "content:post" },
          { id: "author", revision: "author-r1", contentRef: "content:author" },
        ],
    edges: [
      {
        sourceId: "post",
        referenceId: "#/author",
        reference: {
          documentId: "author",
          revision: "author-r1",
          representation: { type: "json", path: ["name"] },
        },
      },
    ],
  });

describe("document graph artifact", () => {
  test("creates and serializes a deterministic versioned artifact", async () => {
    const artifact = await createDocumentGraphArtifact(createFixtureGraph());

    expect(artifact).toMatchObject({
      format: "webstudio-document-graph",
      version: 1,
      nodes: [
        { id: "author", revision: "author-r1", contentRef: "content:author" },
        { id: "post", revision: "post-r1", contentRef: "content:post" },
      ],
      integrity: {
        algorithm: "sha256",
        checksum: expect.stringMatching(/^sha256:[a-f0-9]{64}$/),
      },
    });
    const equivalent = await createDocumentGraphArtifact(
      createFixtureGraph(true)
    );
    expect(equivalent).toEqual(artifact);
    expect(serializeDocumentGraphArtifact(equivalent)).toBe(
      serializeDocumentGraphArtifact(artifact)
    );
  });

  test("parses and verifies an artifact into an immutable graph", async () => {
    const artifact = await createDocumentGraphArtifact(createFixtureGraph());
    const verified = await parseDocumentGraphArtifact(
      serializeDocumentGraphArtifact(artifact)
    );

    expect(verified.artifact).toEqual(artifact);
    expect(verified.graph).toEqual(createFixtureGraph());
    expect(Object.isFrozen(verified.artifact)).toBe(true);
    expect(Object.isFrozen(verified.graph)).toBe(true);
  });

  test("rejects payload tampering", async () => {
    const artifact = await createDocumentGraphArtifact(createFixtureGraph());

    await expect(
      verifyDocumentGraphArtifact({
        ...artifact,
        nodes: artifact.nodes.map((node) =>
          node.id === "author" ? { ...node, revision: "tampered" } : node
        ),
      })
    ).rejects.toMatchObject({ code: "CHECKSUM_MISMATCH" });
  });

  test("rejects noncanonical graph ordering even with a matching checksum", async () => {
    const artifact = await createDocumentGraphArtifact(createFixtureGraph());
    const payload = {
      format: artifact.format,
      version: artifact.version,
      nodes: [...artifact.nodes].reverse(),
      edges: artifact.edges,
    };
    const checksum = await sha256(serializeJsonDeterministically(payload));

    await expect(
      verifyDocumentGraphArtifact({
        ...payload,
        integrity: { algorithm: "sha256", checksum },
      })
    ).rejects.toMatchObject({ code: "NON_CANONICAL_GRAPH" });
  });

  test("rejects invalid JSON and unknown artifact fields", async () => {
    await expect(parseDocumentGraphArtifact("not json")).rejects.toMatchObject({
      code: "INVALID_ARTIFACT",
    } satisfies Partial<DocumentGraphArtifactError>);
    const artifact = await createDocumentGraphArtifact(createFixtureGraph());
    await expect(
      verifyDocumentGraphArtifact({ ...artifact, unknown: true })
    ).rejects.toMatchObject({ code: "INVALID_ARTIFACT" });
  });
});
