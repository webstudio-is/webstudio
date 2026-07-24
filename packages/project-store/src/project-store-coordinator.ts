import type { ProjectHeadStore } from "./object-store";
import type {
  ProjectAssetWriter,
  ProjectHeadReader,
  ProjectSnapshotCommitter,
  ProjectSnapshotWriter,
} from "./project-store";
import { commitProjectSnapshot } from "./snapshot-commit";
import type {
  ProjectAssetReference,
  ProjectSnapshotCommitInput,
  ProjectSnapshotReference,
} from "./types";

/**
 * Commits snapshots and assets to a destination store while one authoritative
 * head store performs compare-and-swap across old and new reference types.
 * This is the migration boundary: switching a head from PostgreSQL to object
 * storage is the same atomic head update as any later object snapshot commit.
 */
export class ProjectStoreCoordinator<
  HeadReference extends ProjectSnapshotReference,
  WrittenReference extends HeadReference,
  AssetReference extends ProjectAssetReference,
>
  implements
    ProjectSnapshotCommitter<HeadReference>,
    ProjectHeadReader<HeadReference>,
    ProjectAssetWriter<AssetReference>
{
  private readonly snapshots: ProjectSnapshotWriter<WrittenReference>;
  private readonly assets: ProjectAssetWriter<AssetReference>;
  private readonly heads: ProjectHeadStore<HeadReference>;

  constructor({
    snapshots,
    assets,
    heads,
  }: {
    snapshots: ProjectSnapshotWriter<WrittenReference>;
    assets: ProjectAssetWriter<AssetReference>;
    heads: ProjectHeadStore<HeadReference>;
  }) {
    this.snapshots = snapshots;
    this.assets = assets;
    this.heads = heads;
  }

  async commitSnapshot(input: ProjectSnapshotCommitInput) {
    return await commitProjectSnapshot({
      input,
      getHead: (name) => this.heads.getHead(name),
      writeSnapshot: (snapshot) => this.snapshots.writeSnapshot(snapshot),
      updateHead: (update) => this.heads.updateHead(update),
    });
  }

  async getHead(name: string) {
    return await this.heads.getHead(name);
  }

  async writeAsset(value: Uint8Array) {
    return await this.assets.writeAsset(value);
  }
}
