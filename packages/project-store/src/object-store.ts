import type {
  ProjectHead,
  ProjectHeadUpdateResult,
  ProjectAssetReadRange,
  ProjectSnapshotReference,
} from "./types";

export interface ObjectStore {
  get(
    key: string,
    range?: ProjectAssetReadRange
  ): Promise<Uint8Array | undefined>;
  put(key: string, value: Uint8Array): Promise<void>;
  putIfAbsent(key: string, value: Uint8Array): Promise<"written" | "existing">;
  delete(key: string): Promise<void>;
  /** Lists descendants below a logical directory, excluding an exact file key. */
  list(prefix: string): Promise<string[]>;
}

/**
 * Named heads are mutable pointers and therefore require stronger semantics
 * than immutable content objects. Each adapter implements compare-and-swap in
 * the way its storage backend can guarantee atomically.
 */
export interface ProjectHeadStore<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> {
  getHead(name: string): Promise<ProjectHead<Reference> | undefined>;
  updateHead(input: {
    name: string;
    expectedRevision?: ProjectHead<Reference>["revision"];
    reference: Reference;
  }): Promise<ProjectHeadUpdateResult<Reference>>;
}
