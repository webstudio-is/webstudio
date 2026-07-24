import {
  createAssetContentRevision,
  loadAssetDataByProject,
  type AssetClient,
} from "@webstudio-is/asset-uploader/index.server";
import type { CompactBuild } from "@webstudio-is/project-build";
import { loadBuildById } from "@webstudio-is/project-build/server";
import {
  computeBuilderAssetRevision,
  createBuilderProjectCollections,
  createBuilderStateFromCompactBuild,
} from "@webstudio-is/project-build/state";
import {
  isProjectAssetReference,
  isProjectSnapshotReference,
  validateProjectAssetReadRange,
  validateStorageKey,
  type JsonValue,
  type PostgresProjectAssetReference,
  type PostgresProjectSnapshotReference,
  type ProjectAssetReadRange,
  type ProjectAssetReader,
  type ProjectSnapshot,
  type ProjectSnapshotReader,
} from "@webstudio-is/project-store";
import type {
  Asset,
  AssetFileDocument,
  AssetFolder,
  BuilderAssetFieldCatalog,
} from "@webstudio-is/sdk";
import {
  AuthorizationError,
  authorizeProject,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";

export const createPostgresProjectAssetReference = (
  asset: Asset
): PostgresProjectAssetReference => {
  if (asset.updatedAt === undefined) {
    throw new Error(`Asset ${JSON.stringify(asset.id)} has no revision time`);
  }
  return {
    storage: "postgres",
    type: "asset",
    projectId: asset.projectId,
    name: asset.name,
    revision: createAssetContentRevision({
      storageName: asset.name,
      updatedAt: asset.updatedAt,
      size: asset.size,
    }),
    size: asset.size,
  };
};

const readExactly = async (data: AsyncIterable<Uint8Array>, length: number) => {
  const result = new Uint8Array(length);
  let offset = 0;
  for await (const chunk of data) {
    if (offset + chunk.byteLength > length) {
      throw new Error("PostgreSQL asset returned more data than expected");
    }
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  if (offset !== length) {
    throw new Error("PostgreSQL asset returned less data than expected");
  }
  return result;
};

export const createPostgresProjectSnapshotData = async ({
  build,
  assets,
  assetFolders,
  assetDocuments,
  assetFieldCatalog,
}: {
  build: CompactBuild;
  assets: Asset[];
  assetFolders: AssetFolder[];
  assetDocuments?: readonly AssetFileDocument[];
  assetFieldCatalog?: BuilderAssetFieldCatalog;
}) => {
  const assetReferences = new Map(
    assets.map((asset) => [
      asset.id,
      createPostgresProjectAssetReference(asset),
    ])
  );
  const collections = createBuilderProjectCollections({
    state: createBuilderStateFromCompactBuild({
      ...build,
      assets,
      assetFolders,
    }),
    assetReferences,
    assetDocuments,
    assetFieldCatalog,
  });
  return {
    reference: {
      storage: "postgres",
      type: "snapshot",
      projectId: build.projectId,
      buildId: build.id,
      builderRevision: String(build.version),
      assetRevision: await computeBuilderAssetRevision(collections),
    } satisfies PostgresProjectSnapshotReference,
    collections,
  };
};

/**
 * Reads legacy PostgreSQL project references during migration. Mutations stay
 * in the existing patch/upload services; this reader deliberately cannot
 * invent a second full-snapshot write path around their transaction rules.
 */
export class PostgresProjectReader
  implements
    ProjectSnapshotReader<PostgresProjectSnapshotReference>,
    ProjectAssetReader<PostgresProjectAssetReference>
{
  private readonly projectId: string;
  private readonly context: AppContext;
  private readonly assetClient: Pick<AssetClient, "readFile">;

  constructor({
    projectId,
    context,
    assetClient,
  }: {
    projectId: string;
    context: AppContext;
    assetClient: Pick<AssetClient, "readFile">;
  }) {
    if (projectId.length === 0) {
      throw new Error("PostgreSQL project reader requires a project id");
    }
    this.projectId = projectId;
    this.context = context;
    this.assetClient = assetClient;
  }

  private assertSnapshotReference(reference: PostgresProjectSnapshotReference) {
    if (
      isProjectSnapshotReference(reference) === false ||
      reference.storage !== "postgres" ||
      reference.projectId !== this.projectId
    ) {
      throw new Error("PostgreSQL project snapshot reference is invalid");
    }
  }

  private async authorizeRead() {
    if (
      (await authorizeProject.hasProjectPermit(
        { projectId: this.projectId, permit: "view" },
        this.context
      )) === false
    ) {
      throw new AuthorizationError(
        "You don't have access to this project's stored data"
      );
    }
  }

  private async loadSnapshot(reference: PostgresProjectSnapshotReference) {
    this.assertSnapshotReference(reference);
    await this.authorizeRead();
    const [build, assetData] = await Promise.all([
      loadBuildById(this.context, reference.buildId),
      loadAssetDataByProject(this.projectId, this.context, {
        skipPermissionsCheck: true,
      }),
    ]);
    if (build.projectId !== this.projectId) {
      throw new Error(
        "PostgreSQL project snapshot revision is no longer current"
      );
    }
    const current = await createPostgresProjectSnapshotData({
      build,
      ...assetData,
    });
    if (
      current.reference.builderRevision !== reference.builderRevision ||
      current.reference.assetRevision !== reference.assetRevision
    ) {
      throw new Error(
        "PostgreSQL project snapshot revision is no longer current"
      );
    }
    return current.collections;
  }

  async readCollections({
    reference,
    names,
  }: {
    reference: PostgresProjectSnapshotReference;
    names: readonly string[];
  }) {
    const collections = await this.loadSnapshot(reference);
    const selected: Record<string, JsonValue> = {};
    for (const name of new Set(names)) {
      validateStorageKey(name);
      const value = collections[name];
      if (value === undefined) {
        throw new Error(
          `Project collection ${JSON.stringify(name)} is missing`
        );
      }
      selected[name] = value;
    }
    return selected;
  }

  async readSnapshot(reference: PostgresProjectSnapshotReference) {
    const collections = await this.loadSnapshot(reference);
    return {
      reference,
      metadata: {
        projectId: reference.projectId,
        builderRevision: reference.builderRevision,
        assetRevision: reference.assetRevision,
      },
      collections,
    } satisfies ProjectSnapshot<PostgresProjectSnapshotReference>;
  }

  async readAsset(
    reference: PostgresProjectAssetReference,
    range?: ProjectAssetReadRange
  ) {
    if (
      isProjectAssetReference(reference) === false ||
      reference.storage !== "postgres" ||
      reference.projectId !== this.projectId
    ) {
      throw new Error("PostgreSQL project asset reference is invalid");
    }
    if (range !== undefined) {
      validateProjectAssetReadRange(range, reference.size);
    }
    await this.authorizeRead();
    const file = await this.context.postgrest.client
      .from("File")
      .select("name, size, updatedAt")
      .eq("name", reference.name)
      .eq("uploaderProjectId", this.projectId)
      .single();
    if (file.error) {
      throw file.error;
    }
    if (
      file.data.size !== reference.size ||
      createAssetContentRevision({
        storageName: file.data.name,
        updatedAt: file.data.updatedAt,
        size: file.data.size,
      }) !== reference.revision
    ) {
      throw new Error("PostgreSQL project asset revision is no longer current");
    }
    const expectedLength = range?.length ?? reference.size;
    const result = await this.assetClient.readFile(reference.name, range);
    if (
      result.contentLength !== undefined &&
      result.contentLength !== expectedLength
    ) {
      throw new Error("PostgreSQL asset returned an unexpected length");
    }
    return await readExactly(result.data, expectedLength);
  }
}
