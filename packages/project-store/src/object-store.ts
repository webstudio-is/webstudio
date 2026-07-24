import type {
  ProjectHead,
  ProjectHeadUpdateResult,
  ProjectSnapshotReference,
} from "./types";

export interface ObjectStore {
  get(key: string): Promise<Uint8Array | undefined>;
  put(key: string, value: Uint8Array): Promise<void>;
  delete(key: string): Promise<void>;
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
