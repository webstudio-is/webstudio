import { isObjectReference } from "./object-reference";
import type { ProjectSnapshotReference } from "./types";

export const isProjectSnapshotReference = (
  value: unknown
): value is ProjectSnapshotReference => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const reference = value as Partial<ProjectSnapshotReference>;
  if (reference.type !== "snapshot") {
    return false;
  }
  if (reference.storage === "object") {
    return isObjectReference(reference.object);
  }
  return (
    reference.storage === "postgres" &&
    typeof reference.projectId === "string" &&
    reference.projectId.length > 0 &&
    typeof reference.buildId === "string" &&
    reference.buildId.length > 0 &&
    typeof reference.builderRevision === "string" &&
    reference.builderRevision.length > 0 &&
    typeof reference.assetRevision === "string" &&
    reference.assetRevision.length > 0
  );
};
