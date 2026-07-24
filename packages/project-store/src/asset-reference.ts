import { isObjectReference } from "./object-reference";
import type { ProjectAssetReference } from "./types";

export const isProjectAssetReference = (
  value: unknown
): value is ProjectAssetReference => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const reference = value as Partial<ProjectAssetReference>;
  if (reference.type !== "asset") {
    return false;
  }
  if (reference.storage === "object") {
    return isObjectReference(reference.object);
  }
  return (
    reference.storage === "postgres" &&
    typeof reference.projectId === "string" &&
    reference.projectId.length > 0 &&
    typeof reference.name === "string" &&
    reference.name.length > 0 &&
    typeof reference.revision === "string" &&
    reference.revision.length > 0 &&
    typeof reference.size === "number" &&
    Number.isSafeInteger(reference.size) &&
    reference.size >= 0
  );
};
