import { isContentHash } from "./hash";
import type { ObjectReference } from "./types";

export const isObjectReference = (value: unknown): value is ObjectReference => {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const reference = value as Partial<ObjectReference>;
  return (
    isContentHash(reference.hash) &&
    typeof reference.size === "number" &&
    Number.isSafeInteger(reference.size) &&
    reference.size >= 0
  );
};
