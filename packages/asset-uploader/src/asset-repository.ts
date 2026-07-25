import {
  createAssetQueryRepository,
  createAssetIndex,
} from "@webstudio-is/asset-resource";
import type {
  Asset,
  AssetFolder,
  AssetQueryRequestInput,
  AssetQueryResult,
} from "@webstudio-is/sdk";
import type {
  AssetFolderUpdateRequest,
  AssetMetadataUpdate,
} from "@webstudio-is/sdk/asset-resource-api";
import {
  authorizeProject,
  AuthorizationError,
  type AppContext,
} from "@webstudio-is/trpc-interface/index.server";
import type { AssetDataOverride } from "./utils/get-asset-data";
import type {
  AssetReadRange,
  AssetObjectReader,
  AssetObjectStore,
  AssetObjectWriter,
} from "./client";
import { nanoid } from "nanoid";
import {
  createUploadTicket,
  uploadFile,
  type CreateUploadTicketInput,
} from "./upload";
import { updateAssetContent } from "./revision";
import {
  deleteAssetsWithClient,
  patchAssetsWithClient,
  updateAssetMetadataWithClient,
  loadAssetsByProjectWithClient,
} from "./asset-patch-core";
import type { Patch } from "immer";
import type { UploadTicket } from "./types";
import {
  synchronizeCanonicalAsset,
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeCanonicalAssetStandardMetadata,
} from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import {
  deleteAssetFoldersWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
} from "./folder-persistence";

type CreateId = () => Asset["id"];
type RepositoryObjectStore = AssetObjectReader & Partial<AssetObjectWriter>;

const defaultDependencies = {
  hasProjectPermit: authorizeProject.hasProjectPermit,
  createUploadTicket,
  uploadFile,
  updateAssetContent,
  deleteAssetsWithClient,
  patchAssetsWithClient,
  updateAssetMetadataWithClient,
  loadAssetsByProjectWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
  deleteAssetFoldersWithClient,
  createId: (): string => nanoid(),
  now: () => new Date(),
  synchronizeCanonicalAsset,
  synchronizeCanonicalAssets,
  synchronizeAllCanonicalAssetStandardMetadata,
  synchronizeCanonicalAssetStandardMetadata,
  loadCanonicalAssetFileEntries,
  createAssetIndex,
  reportMaintenanceError: (error: unknown) =>
    console.error("Asset repository maintenance failed", error),
};

type AssetRepositoryDependencies = typeof defaultDependencies;

export type AssetBuildChange = {
  namespace: string;
  patches: ReadonlyArray<{ path: ReadonlyArray<string | number> }>;
};

export class AssetRepositoryNotFoundError extends Error {}
export class AssetRepositoryConflictError extends Error {}

export type AssetContentRead = {
  asset: Asset;
  data: AsyncIterable<Uint8Array>;
  contentLength?: number;
};

export interface AssetRepository {
  list(): Promise<Asset[]>;
  get(assetId: Asset["id"]): Promise<Asset>;
  readContent(
    assetId: Asset["id"],
    range?: AssetReadRange
  ): Promise<AssetContentRead>;
  createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ): Promise<UploadTicket>;
  completeUpload(input: {
    name: string;
    data: ReadableStream<Uint8Array>;
    assetInfoFallback:
      | { width: number; height: number; format: string }
      | undefined;
    assetDataOverride?: AssetDataOverride;
    assetId?: Asset["id"];
  }): Promise<Asset>;
  updateContent(input: {
    assetId: Asset["id"];
    expectedName: string;
    data: ReadableStream<Uint8Array>;
  }): Promise<Asset>;
  updateMetadata(
    assetId: Asset["id"],
    values: AssetMetadataUpdate
  ): Promise<Asset>;
  delete(ids: Asset["id"][]): Promise<void>;
  listFolders(): Promise<AssetFolder[]>;
  getFolder(folderId: string): Promise<AssetFolder>;
  createFolder(input: {
    name: string;
    parentId?: string;
  }): Promise<AssetFolder>;
  updateFolder(
    folderId: string,
    values: AssetFolderUpdateRequest
  ): Promise<AssetFolder>;
  deleteFolder(folderId: string): Promise<void>;
  applyPatches(patches: Patch[]): Promise<void>;
  synchronizeBuildChanges(input: {
    changes: readonly AssetBuildChange[];
    force?: boolean;
  }): Promise<void>;
  synchronize(): ReturnType<typeof synchronizeCanonicalAssets>;
  readIndex(): ReturnType<typeof createAssetIndex>;
  prepareIndex(): ReturnType<typeof createAssetIndex>;
  query(request: AssetQueryRequestInput): Promise<AssetQueryResult>;
}

/**
 * PostgreSQL adapter for the storage-neutral Assets repository contract.
 *
 * All public mutations maintain the derived query index. The lower-level SQL
 * and object-store functions are adapter implementation details and must not be
 * coordinated independently by Builder, MCP, preview, or publication callers.
 */
export class PostgresAssetRepository implements AssetRepository {
  private readonly projectId: string;
  private readonly context: AppContext;
  private readonly assetStore: RepositoryObjectStore;
  private readonly dependencies: AssetRepositoryDependencies;

  constructor({
    projectId,
    context,
    assetClient,
    assetStore = assetClient,
    dependencies,
  }: {
    projectId: string;
    context: AppContext;
    assetClient?: RepositoryObjectStore;
    assetStore?: RepositoryObjectStore;
    dependencies?: Partial<AssetRepositoryDependencies>;
  }) {
    if (assetStore === undefined) {
      throw new Error("Asset object storage is required");
    }
    this.projectId = projectId;
    this.context = context;
    this.assetStore = assetStore;
    this.dependencies = { ...defaultDependencies, ...dependencies };
  }

  static async forUpload({
    name,
    context,
    assetStore,
  }: {
    name: string;
    context: AppContext;
    assetStore: AssetObjectStore;
  }) {
    const file = await context.postgrest.client
      .from("File")
      .select("uploaderProjectId")
      .eq("name", name)
      .single();
    if (file.error || typeof file.data?.uploaderProjectId !== "string") {
      throw new Error(
        file.error?.message ?? "File uploader project is missing"
      );
    }
    return new PostgresAssetRepository({
      projectId: file.data.uploaderProjectId,
      context,
      assetStore,
    });
  }

  private async maintainAsset(assetId: Asset["id"]) {
    try {
      return await this.dependencies.synchronizeCanonicalAsset({
        client: this.context.postgrest.client,
        assetClient: this.assetStore,
        projectId: this.projectId,
        assetId,
      });
    } catch (error) {
      // The primary mutation may already be committed. Full synchronization
      // before preview/publication is the durable repair path.
      this.dependencies.reportMaintenanceError(error);
    }
  }

  private async assertCanEdit() {
    const canEdit = await this.dependencies.hasProjectPermit(
      { projectId: this.projectId, permit: "edit" },
      this.context
    );
    if (canEdit === false) {
      throw new AuthorizationError(
        "You don't have access to edit this project assets"
      );
    }
  }

  private async assertCanView() {
    const canView = await this.dependencies.hasProjectPermit(
      { projectId: this.projectId, permit: "view" },
      this.context
    );
    if (canView === false) {
      throw new AuthorizationError(
        "You don't have access to view this project assets"
      );
    }
  }

  private getWritableStore(): AssetObjectStore {
    if (this.assetStore.uploadFile === undefined) {
      throw new Error("Asset object storage is read-only");
    }
    return this.assetStore as AssetObjectStore;
  }

  private getUploadErrorCleanup(assetId: Asset["id"] | undefined) {
    if (assetId === undefined) {
      return;
    }
    return async (name: string) => {
      const deletedAsset = await this.context.postgrest.client
        .from("Asset")
        .delete()
        .eq("id", assetId)
        .eq("projectId", this.projectId);
      if (deletedAsset.error) {
        throw deletedAsset.error;
      }
      const deletedFile = await this.context.postgrest.client
        .from("File")
        .delete()
        .eq("name", name);
      if (deletedFile.error) {
        throw deletedFile.error;
      }
    };
  }

  async list() {
    await this.assertCanView();
    return await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
  }

  async get(assetId: Asset["id"]) {
    const asset = (await this.list()).find(({ id }) => id === assetId);
    if (asset === undefined) {
      throw new AssetRepositoryNotFoundError("Asset not found");
    }
    return asset;
  }

  async readContent(assetId: Asset["id"], range?: AssetReadRange) {
    const asset = await this.get(assetId);
    const content = await this.assetStore.readFile(asset.name, range);
    return { asset, ...content };
  }

  async createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ) {
    const ticket = await this.dependencies.createUploadTicket(
      { ...input, projectId: this.projectId },
      this.context,
      createId
    );
    // A non-deduplicated ticket only reserves an upload. Deduplication can
    // restore or create a complete logical asset immediately, so it must pass
    // through the same derived-document boundary as upload completion.
    if (ticket.deduplicated) {
      await this.maintainAsset(ticket.assetId);
    }
    return ticket;
  }

  async completeUpload({
    name,
    data,
    assetInfoFallback,
    assetDataOverride,
    assetId,
  }: Parameters<AssetRepository["completeUpload"]>[0]) {
    // Reserved upload names are not authorization credentials. Recheck the
    // derived owning project when the second upload step writes file content.
    await this.assertCanEdit();
    const asset = await this.dependencies.uploadFile(
      name,
      data,
      this.getWritableStore(),
      this.context,
      assetInfoFallback,
      assetDataOverride,
      this.getUploadErrorCleanup(assetId)
    );
    await this.maintainAsset(asset.id);
    return asset;
  }

  async updateContent({
    assetId,
    expectedName,
    data,
  }: Parameters<AssetRepository["updateContent"]>[0]) {
    const asset = await this.dependencies.updateAssetContent(
      {
        assetId,
        projectId: this.projectId,
        expectedName,
        data,
      },
      this.getWritableStore(),
      this.context
    );
    await this.maintainAsset(assetId);
    return asset;
  }

  async updateMetadata(assetId: Asset["id"], values: AssetMetadataUpdate) {
    await this.assertCanEdit();
    const asset = await this.dependencies.updateAssetMetadataWithClient(
      { projectId: this.projectId, assetId, values },
      this.context.postgrest.client
    );

    if (
      Object.hasOwn(values, "filename") ||
      Object.hasOwn(values, "folderId")
    ) {
      try {
        await this.dependencies.synchronizeCanonicalAssetStandardMetadata({
          client: this.context.postgrest.client,
          projectId: this.projectId,
          assetIds: [assetId],
        });
      } catch (error) {
        this.dependencies.reportMaintenanceError(error);
      }
    }

    return asset;
  }

  async delete(ids: Asset["id"][]) {
    await this.assertCanEdit();
    await this.dependencies.deleteAssetsWithClient(
      { projectId: this.projectId, ids },
      this.context.postgrest.client
    );
    await this.maintainIndex();
  }

  async listFolders() {
    await this.assertCanView();
    return await this.dependencies.loadAssetFoldersByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
  }

  async getFolder(folderId: string) {
    const folder = (await this.listFolders()).find(({ id }) => id === folderId);
    if (folder === undefined) {
      throw new AssetRepositoryNotFoundError("Asset folder not found");
    }
    return folder;
  }

  async createFolder({ name, parentId }: { name: string; parentId?: string }) {
    await this.assertCanEdit();
    return await this.dependencies.upsertAssetFolderWithClient(
      {
        projectId: this.projectId,
        folder: {
          id: this.dependencies.createId(),
          projectId: this.projectId,
          name,
          parentId,
          createdAt: this.dependencies.now().toISOString(),
        },
      },
      this.context.postgrest.client
    );
  }

  async updateFolder(folderId: string, values: AssetFolderUpdateRequest) {
    await this.assertCanEdit();
    const folder = (
      await this.dependencies.loadAssetFoldersByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      )
    ).find(({ id }) => id === folderId);
    if (folder === undefined) {
      throw new AssetRepositoryNotFoundError("Asset folder not found");
    }
    const updated = await this.dependencies.upsertAssetFolderWithClient(
      {
        projectId: this.projectId,
        folder: {
          ...folder,
          ...(values.name === undefined ? {} : { name: values.name }),
          parentId:
            values.parentId === null
              ? undefined
              : (values.parentId ?? folder.parentId),
        },
      },
      this.context.postgrest.client
    );
    try {
      await this.dependencies.synchronizeAllCanonicalAssetStandardMetadata({
        client: this.context.postgrest.client,
        projectId: this.projectId,
      });
    } catch (error) {
      this.dependencies.reportMaintenanceError(error);
    }
    return updated;
  }

  async deleteFolder(folderId: string) {
    await this.assertCanEdit();
    const [folders, assets] = await Promise.all([
      this.dependencies.loadAssetFoldersByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      ),
      this.dependencies.loadAssetsByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      ),
    ]);
    if (folders.some(({ id }) => id === folderId) === false) {
      throw new AssetRepositoryNotFoundError("Asset folder not found");
    }
    if (
      folders.some(({ parentId }) => parentId === folderId) ||
      assets.some(({ folderId: assetFolderId }) => assetFolderId === folderId)
    ) {
      throw new AssetRepositoryConflictError(
        "Asset folder must be empty before it can be deleted"
      );
    }
    await this.dependencies.deleteAssetFoldersWithClient(
      { projectId: this.projectId, ids: [folderId] },
      this.context.postgrest.client
    );
  }

  async applyPatches(patches: Patch[]) {
    await this.dependencies.patchAssetsWithClient(
      {
        projectId: this.projectId,
        client: this.context.postgrest.client,
      },
      patches
    );
    await this.maintainIndex();
  }

  async synchronizeBuildChanges({
    changes,
    force = false,
  }: {
    changes: readonly AssetBuildChange[];
    force?: boolean;
  }) {
    const assetChanges = changes.filter(
      ({ namespace }) => namespace === "assets" || namespace === "assetFolders"
    );
    if (force) {
      await this.synchronize();
      return;
    }
    if (assetChanges.length === 0) {
      return;
    }

    const hasFolderChanges = assetChanges.some(
      ({ namespace }) => namespace === "assetFolders"
    );
    if (hasFolderChanges) {
      await this.dependencies.synchronizeAllCanonicalAssetStandardMetadata({
        client: this.context.postgrest.client,
        projectId: this.projectId,
      });
    }

    const changedAssetIds = new Set<string>();
    const contentAssetIds = new Set<string>();
    for (const { namespace, patches } of assetChanges) {
      if (namespace !== "assets") {
        continue;
      }
      for (const { path } of patches) {
        const assetId = path[0];
        const field = path[1];
        if (typeof assetId !== "string") {
          continue;
        }
        if (
          path.length !== 1 &&
          field !== "name" &&
          field !== "filename" &&
          field !== "folderId"
        ) {
          continue;
        }
        changedAssetIds.add(assetId);
        if (path.length === 1 || field === "name") {
          contentAssetIds.add(assetId);
        }
      }
    }

    if (hasFolderChanges === false) {
      const standardMetadataAssetIds = [...changedAssetIds].filter(
        (assetId) => contentAssetIds.has(assetId) === false
      );
      if (standardMetadataAssetIds.length > 0) {
        await this.dependencies.synchronizeCanonicalAssetStandardMetadata({
          client: this.context.postgrest.client,
          projectId: this.projectId,
          assetIds: standardMetadataAssetIds,
        });
      }
    }
    for (const assetId of contentAssetIds) {
      await this.dependencies.synchronizeCanonicalAsset({
        client: this.context.postgrest.client,
        assetClient: this.assetStore,
        projectId: this.projectId,
        assetId,
      });
    }
  }

  private async maintainIndex() {
    try {
      await this.synchronize();
    } catch (error) {
      // As with single-file maintenance, the primary mutation may already be
      // committed and a later read provides the durable repair path.
      this.dependencies.reportMaintenanceError(error);
    }
  }

  async synchronize() {
    return await this.dependencies.synchronizeCanonicalAssets({
      client: this.context.postgrest.client,
      assetClient: this.assetStore,
      projectId: this.projectId,
    });
  }

  async prepareIndex() {
    await this.synchronize();
    return await this.readIndex();
  }

  async readIndex() {
    const entries = await this.dependencies.loadCanonicalAssetFileEntries({
      client: this.context.postgrest.client,
      projectId: this.projectId,
    });
    return await this.dependencies.createAssetIndex({
      projectId: this.projectId,
      entries,
    });
  }

  async query(request: AssetQueryRequestInput) {
    return await createAssetQueryRepository({
      loadIndex: () => this.prepareIndex(),
      readContent: this.assetStore.readFile,
    }).query(request);
  }
}
