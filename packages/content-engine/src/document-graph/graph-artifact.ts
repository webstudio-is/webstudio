import { array, literal, strictObject, string } from "zod";
import { serializeJsonDeterministically, sha256 } from "../canonical-json";
import {
  createDocumentGraph,
  type DocumentGraph,
  type DocumentGraphEdge,
  type DocumentGraphNode,
} from "./graph";
import {
  documentGraphEdgeSchema,
  documentGraphNodeSchema,
} from "./graph-schema";

const sha256Revision = string().regex(/^sha256:[a-f0-9]{64}$/);

export const documentGraphArtifactV1 = strictObject({
  format: literal("webstudio-document-graph"),
  version: literal(1),
  nodes: array(documentGraphNodeSchema),
  edges: array(documentGraphEdgeSchema),
  integrity: strictObject({
    algorithm: literal("sha256"),
    checksum: sha256Revision,
  }),
});

export type DocumentGraphArtifactV1 = Readonly<{
  format: "webstudio-document-graph";
  version: 1;
  nodes: readonly DocumentGraphNode[];
  edges: readonly DocumentGraphEdge[];
  integrity: Readonly<{
    algorithm: "sha256";
    checksum: string;
  }>;
}>;

export type DocumentGraphArtifactErrorCode =
  | "INVALID_ARTIFACT"
  | "CHECKSUM_MISMATCH"
  | "NON_CANONICAL_GRAPH";

export class DocumentGraphArtifactError extends Error {
  readonly code: DocumentGraphArtifactErrorCode;

  constructor({
    code,
    message,
    cause,
  }: {
    code: DocumentGraphArtifactErrorCode;
    message: string;
    cause?: unknown;
  }) {
    super(message, { cause });
    this.name = "DocumentGraphArtifactError";
    this.code = code;
  }
}

export type VerifiedDocumentGraphArtifact = Readonly<{
  artifact: DocumentGraphArtifactV1;
  graph: DocumentGraph;
}>;

const getArtifactPayload = (
  artifact: Pick<
    DocumentGraphArtifactV1,
    "format" | "version" | "nodes" | "edges"
  >
) => ({
  format: artifact.format,
  version: artifact.version,
  nodes: artifact.nodes,
  edges: artifact.edges,
});

const checksumArtifactPayload = async (
  artifact: Pick<
    DocumentGraphArtifactV1,
    "format" | "version" | "nodes" | "edges"
  >
) => await sha256(serializeJsonDeterministically(getArtifactPayload(artifact)));

const parseArtifactShape = (input: unknown) => {
  try {
    return documentGraphArtifactV1.parse(input);
  } catch (cause) {
    throw new DocumentGraphArtifactError({
      code: "INVALID_ARTIFACT",
      message: "Document graph artifact is invalid",
      cause,
    });
  }
};

const getCanonicalGraph = ({
  nodes,
  edges,
}: Pick<DocumentGraphArtifactV1, "nodes" | "edges">) => {
  let graph: DocumentGraph;
  try {
    graph = createDocumentGraph({ nodes, edges });
  } catch (cause) {
    throw new DocumentGraphArtifactError({
      code: "INVALID_ARTIFACT",
      message: "Document graph artifact contains an invalid graph",
      cause,
    });
  }
  if (
    serializeJsonDeterministically({ nodes, edges }) !==
    serializeJsonDeterministically({ nodes: graph.nodes, edges: graph.edges })
  ) {
    throw new DocumentGraphArtifactError({
      code: "NON_CANONICAL_GRAPH",
      message: "Document graph artifact nodes and edges must be canonical",
    });
  }
  return graph;
};

const freezeArtifact = ({
  graph,
  checksum,
}: {
  graph: DocumentGraph;
  checksum: string;
}): DocumentGraphArtifactV1 =>
  Object.freeze({
    format: "webstudio-document-graph",
    version: 1,
    nodes: graph.nodes,
    edges: graph.edges,
    integrity: Object.freeze({ algorithm: "sha256", checksum }),
  });

export const createDocumentGraphArtifact = async (
  input: DocumentGraph
): Promise<DocumentGraphArtifactV1> => {
  const graph = createDocumentGraph({ nodes: input.nodes, edges: input.edges });
  const payload = {
    format: "webstudio-document-graph" as const,
    version: 1 as const,
    nodes: graph.nodes,
    edges: graph.edges,
  };
  return freezeArtifact({
    graph,
    checksum: await checksumArtifactPayload(payload),
  });
};

export const serializeDocumentGraphArtifact = (input: unknown) => {
  const artifact = parseArtifactShape(input);
  getCanonicalGraph(artifact);
  return serializeJsonDeterministically(artifact);
};

export const verifyDocumentGraphArtifact = async (
  input: unknown
): Promise<VerifiedDocumentGraphArtifact> => {
  const parsed = parseArtifactShape(input);
  if (parsed.integrity.checksum !== (await checksumArtifactPayload(parsed))) {
    throw new DocumentGraphArtifactError({
      code: "CHECKSUM_MISMATCH",
      message: "Document graph artifact checksum does not match its payload",
    });
  }
  const graph = getCanonicalGraph(parsed);
  const artifact = freezeArtifact({
    graph,
    checksum: parsed.integrity.checksum,
  });
  return Object.freeze({ artifact, graph });
};

export const parseDocumentGraphArtifact = async (
  source: string
): Promise<VerifiedDocumentGraphArtifact> => {
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch (cause) {
    throw new DocumentGraphArtifactError({
      code: "INVALID_ARTIFACT",
      message: "Document graph artifact is not valid JSON",
      cause,
    });
  }
  return await verifyDocumentGraphArtifact(input);
};
