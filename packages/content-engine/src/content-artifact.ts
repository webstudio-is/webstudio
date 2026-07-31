import { contentArtifactV1, type ContentArtifactV1 } from "./schema";
import { contentEngineLimits } from "./limits";
import { serializeJsonDeterministically, sha256 } from "./canonical-json";
import { getUtf8ByteLength } from "./byte-stream";
import { verifyDocumentGraphArtifact } from "./document-graph";

export const checksumContentArtifact = async (index: ContentArtifactV1) => {
  const { integrity: _integrity, ...payload } = index;
  return await sha256(serializeJsonDeterministically(payload));
};

export const serializeContentArtifact = (value: unknown) =>
  serializeJsonDeterministically(contentArtifactV1.parse(value));

export const getContentArtifactReferencedAssetIds = (
  artifact: Pick<ContentArtifactV1, "assetReferences">
) =>
  [
    ...new Set(
      Object.values(artifact.assetReferences ?? {})
        .flat()
        .map(({ assetId }) => assetId)
    ),
  ].sort();

export const getContentArtifactRuntimeAssetIds = ({
  artifact,
  includeDocuments,
  includeDocumentGraph = true,
}: {
  artifact: Pick<ContentArtifactV1, "assetReferences"> & {
    documents: readonly { _id: string }[];
    documentGraph?: { readonly nodes: readonly { id: string }[] };
  };
  includeDocuments: boolean;
  includeDocumentGraph?: boolean;
}) => {
  const ids = new Set(getContentArtifactReferencedAssetIds(artifact));
  if (includeDocuments) {
    for (const { _id } of artifact.documents) {
      ids.add(_id);
    }
  }
  if (includeDocumentGraph) {
    for (const { id } of artifact.documentGraph?.nodes ?? []) {
      ids.add(id);
    }
  }
  return [...ids].sort();
};

const assertContentArtifactSize = (index: ContentArtifactV1) => {
  const maximumBytes =
    index.database?.maxBytes ?? contentEngineLimits.databaseBytes;
  if (getUtf8ByteLength(serializeContentArtifact(index)) > maximumBytes) {
    throw new Error("Asset index exceeds the byte limit");
  }
};

export const verifyContentArtifact = async (value: unknown) => {
  const index = contentArtifactV1.parse(value);
  assertContentArtifactSize(index);
  if (index.integrity.checksum !== (await checksumContentArtifact(index))) {
    throw new Error("Content artifact checksum is invalid");
  }
  if (index.documentGraph !== undefined) {
    await verifyDocumentGraphArtifact(index.documentGraph);
  }
  return index;
};
