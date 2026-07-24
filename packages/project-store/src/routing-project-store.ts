import type {
  ProjectAssetReader,
  ProjectAssetWriter,
  ProjectHeadReader,
  ProjectSnapshotCommitter,
  ProjectSnapshotReader,
  ProjectStore,
} from "./project-store";
import type {
  ObjectProjectAssetReference,
  ObjectProjectSnapshotReference,
  PostgresProjectAssetReference,
  PostgresProjectSnapshotReference,
  ProjectAssetReference,
  ProjectAssetReadRange,
  ProjectSnapshotCommitInput,
  ProjectSnapshotReference,
} from "./types";

type PostgresBackend = ProjectSnapshotReader<PostgresProjectSnapshotReference> &
  ProjectAssetReader<PostgresProjectAssetReference>;

type ObjectBackend = ProjectSnapshotReader<ObjectProjectSnapshotReference> &
  ProjectAssetReader<ObjectProjectAssetReference>;

export type ProjectStoreMutations =
  ProjectSnapshotCommitter<ProjectSnapshotReference> &
    ProjectHeadReader<ProjectSnapshotReference> &
    ProjectAssetWriter<ProjectAssetReference>;

/**
 * Routes immutable references by their own backend and delegates mutable
 * operations to a coordinator. The coordinator owns backend selection and its
 * compare-and-swap transaction, so promotion cannot race a head update. This
 * lets one project promote heads independently while historical PostgreSQL
 * references remain readable.
 */
export class RoutingProjectStore implements ProjectStore<
  ProjectSnapshotReference,
  ProjectAssetReference
> {
  private readonly postgres: PostgresBackend;
  private readonly object: ObjectBackend;
  private readonly mutations: ProjectStoreMutations;

  constructor({
    postgres,
    object,
    mutations,
  }: {
    postgres: PostgresBackend;
    object: ObjectBackend;
    mutations: ProjectStoreMutations;
  }) {
    this.postgres = postgres;
    this.object = object;
    this.mutations = mutations;
  }

  async commitSnapshot(input: ProjectSnapshotCommitInput) {
    return await this.mutations.commitSnapshot(input);
  }

  async readCollections(input: {
    reference: ProjectSnapshotReference;
    names: readonly string[];
  }) {
    const { reference, names } = input;
    return reference.storage === "postgres"
      ? await this.postgres.readCollections({ reference, names })
      : await this.object.readCollections({ reference, names });
  }

  async readSnapshot(
    reference: PostgresProjectSnapshotReference | ObjectProjectSnapshotReference
  ) {
    return reference.storage === "postgres"
      ? await this.postgres.readSnapshot(reference)
      : await this.object.readSnapshot(reference);
  }

  async writeAsset(value: Uint8Array) {
    return await this.mutations.writeAsset(value);
  }

  async readAsset(
    reference: PostgresProjectAssetReference | ObjectProjectAssetReference,
    range?: ProjectAssetReadRange
  ) {
    return reference.storage === "postgres"
      ? await this.postgres.readAsset(reference, range)
      : await this.object.readAsset(reference, range);
  }

  async getHead(name: string) {
    return await this.mutations.getHead(name);
  }
}
