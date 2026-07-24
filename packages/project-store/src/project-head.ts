import { sha256 } from "./hash";
import { isObjectReference } from "./object-reference";
import { serializeJsonDeterministically } from "./stable-json";
import type { ObjectProjectSnapshotReference, ProjectHead } from "./types";

const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

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
  let text: string;
  let value: {
    format?: unknown;
    version?: unknown;
    reference?: unknown;
  };
  try {
    text = decoder.decode(bytes);
    value = JSON.parse(text) as typeof value;
  } catch {
    throw new Error("Project head is invalid");
  }
  if (
    value.format !== "webstudio-project-head" ||
    value.version !== 1 ||
    isObjectReference(value.reference) === false
  ) {
    throw new Error("Project head is invalid");
  }
  const reference = {
    storage: "object",
    type: "snapshot",
    object: value.reference,
  } as const;
  if (decoder.decode(encodeObjectProjectHead(reference)) !== text) {
    throw new Error("Project head is invalid");
  }
  return {
    reference,
    revision: await sha256(bytes),
  };
};
