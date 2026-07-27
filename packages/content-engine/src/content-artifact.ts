import { contentArtifactV1, type ContentArtifactV1 } from "./schema";
import { contentEngineLimits } from "./limits";
import { serializeJsonDeterministically, sha256 } from "./canonical-json";

export const checksumContentArtifact = async (index: ContentArtifactV1) => {
  const { integrity: _integrity, ...payload } = index;
  return await sha256(serializeJsonDeterministically(payload));
};

export const serializeContentArtifact = (value: unknown) =>
  serializeJsonDeterministically(contentArtifactV1.parse(value));

const assertContentArtifactSize = (index: ContentArtifactV1) => {
  const maximumBytes =
    index.database?.maxBytes ?? contentEngineLimits.databaseBytes;
  if (
    new TextEncoder().encode(serializeContentArtifact(index)).byteLength >
    maximumBytes
  ) {
    throw new Error("Asset index exceeds the byte limit");
  }
};

export const verifyContentArtifact = async (value: unknown) => {
  const index = contentArtifactV1.parse(value);
  assertContentArtifactSize(index);
  if (index.integrity.checksum !== (await checksumContentArtifact(index))) {
    throw new Error("Content artifact checksum is invalid");
  }
  return index;
};
