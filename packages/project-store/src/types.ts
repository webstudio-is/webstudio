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
  type: "snapshot";
  object: ObjectReference;
};

export type PostgresProjectSnapshotReference = {
  storage: "postgres";
  type: "snapshot";
  projectId: string;
  buildId: string;
  builderRevision: string;
  assetRevision: string;
};

export type ProjectSnapshotReference =
  | ObjectProjectSnapshotReference
  | PostgresProjectSnapshotReference;

export type ObjectProjectAssetReference = {
  storage: "object";
  type: "asset";
  object: ObjectReference;
};

export type PostgresProjectAssetReference = {
  storage: "postgres";
  type: "asset";
  projectId: string;
  name: string;
  revision: string;
  size: number;
};

export type ProjectAssetReference =
  | ObjectProjectAssetReference
  | PostgresProjectAssetReference;

export type ProjectAssetReadRange = {
  offset: number;
  length: number;
};

export type ProjectSnapshot<
  Reference extends ProjectSnapshotReference = ProjectSnapshotReference,
> = {
  reference: Reference;
  metadata: {
    projectId: string;
    builderRevision: string;
    assetRevision: string;
  };
  collections: Readonly<Record<string, JsonValue>>;
};

export type ObjectProjectSnapshot =
  ProjectSnapshot<ObjectProjectSnapshotReference> & {
    manifest: ProjectSnapshotManifest;
  };

export type ProjectSnapshotInput = {
  projectId: string;
  builderRevision: string;
  assetRevision: string;
  collections: Readonly<Record<string, JsonValue>>;
};

export type ProjectSnapshotCommitInput = {
  headName: string;
  expectedRevision?: ContentHash;
  snapshot: ProjectSnapshotInput;
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
