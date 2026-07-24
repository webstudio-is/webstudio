import { isContentHash, sha256 } from "./hash";
import { serializeJsonDeterministically } from "./stable-json";
import type {
  ObjectProjectSnapshotReference,
  ObjectReference,
  ProjectHead,
} from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const encodeObjectProjectHead = (
  reference: ObjectProjectSnapshotReference
) =>
  encoder.encode(
    serializeJsonDeterministically({
      format: "webstudio-project-head",
      version: 1,
      reference: reference.object,
    })
  );

export const parseObjectProjectHead = async (
  bytes: Uint8Array
): Promise<ProjectHead<ObjectProjectSnapshotReference>> => {
  const value = JSON.parse(decoder.decode(bytes)) as {
    format?: unknown;
    version?: unknown;
    reference?: Partial<ObjectReference>;
  };
  if (
    value.format !== "webstudio-project-head" ||
    value.version !== 1 ||
    value.reference === undefined ||
    isContentHash(value.reference.hash) === false ||
    typeof value.reference.size !== "number" ||
    Number.isSafeInteger(value.reference.size) === false ||
    value.reference.size < 0
  ) {
    throw new Error("Project head is invalid");
  }
  return {
    reference: {
      storage: "object",
      object: value.reference as ObjectReference,
    },
    revision: await sha256(bytes),
  };
};
