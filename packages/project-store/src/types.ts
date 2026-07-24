import type { ContentHash } from "./hash";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
  | JsonPrimitive
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type ObjectReference = {
  hash: ContentHash;
  size: number;
};

export type ProjectSnapshotManifest = {
  format: "webstudio-project-snapshot";
  version: 1;
  projectId: string;
  builderRevision: string;
  assetRevision: string;
  collections: Readonly<Record<string, ObjectReference>>;
};

export type ObjectProjectSnapshotReference = {
  storage: "object";
  object: ObjectReference;
};

export type PostgresProjectSnapshotReference = {
  storage: "postgres";
  buildId: string;
  builderRevision: string;
  assetRevision: string;
};

export type ProjectSnapshotReference =
  | ObjectProjectSnapshotReference
  | PostgresProjectSnapshotReference;

export type ProjectSnapshot<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> = {
  reference: Reference;
  manifest: ProjectSnapshotManifest;
  collections: Readonly<Record<string, JsonValue>>;
};

export type ProjectSnapshotInput = {
  projectId: string;
  builderRevision: string;
  assetRevision: string;
  collections: Readonly<Record<string, JsonValue>>;
};

export type ProjectHead<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> = {
  reference: Reference;
  revision: ContentHash;
};

export type ProjectHeadUpdateResult<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> =
  | { status: "updated"; head: ProjectHead<Reference> }
  | { status: "conflict"; head?: ProjectHead<Reference> };
