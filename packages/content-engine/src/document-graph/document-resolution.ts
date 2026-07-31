import { contentEngineLimits } from "../limits";
import {
  assembleDocument,
  parseDocumentSource,
  selectDocumentRepresentation,
  type AdaptedDocument,
} from "./document-adapter";
import type { DocumentGraph, DocumentGraphNode } from "./graph";
import {
  assertDocumentSourceRevision,
  type DocumentSource,
} from "./document-source";
import { resolveDocumentGraph, type ResolvedDocumentGraph } from "./resolver";

/** Resolves parsed JSON and Markdown values without depending on storage. */
export const resolveAdaptedDocumentGraph = async ({
  graph,
  rootIds,
  concurrency,
  maximumBytes = contentEngineLimits.hydratedFileBytes,
  signal,
  load,
}: {
  graph: DocumentGraph;
  rootIds: readonly string[];
  concurrency: number;
  maximumBytes?: number;
  signal?: AbortSignal;
  load: (
    node: DocumentGraphNode,
    options: { signal?: AbortSignal }
  ) => Promise<DocumentSource>;
}): Promise<ResolvedDocumentGraph<AdaptedDocument>> =>
  await resolveDocumentGraph<AdaptedDocument, AdaptedDocument>({
    graph,
    rootIds,
    concurrency,
    signal,
    load: async (node, options) => {
      const loaded = assertDocumentSourceRevision({
        node,
        source: await load(node, options),
      });
      return await parseDocumentSource({
        format: loaded.format,
        source: loaded.source,
        maximumBytes,
      });
    },
    select: ({ reference, value }) =>
      selectDocumentRepresentation({
        document: value,
        representation: reference.representation,
      }),
    assemble: ({ source, references }) =>
      assembleDocument({ document: source, references }),
  });
