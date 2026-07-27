import {
  assetQuery,
  contentEngineLimits,
  createContentCompilationPlan,
  createContentFieldCatalogCompilationPlan,
  createLiteralContentCompilationQuery,
  isContentDocumentCandidate,
  selectContentHydrationCandidates,
  selectAssetProperties,
  type AssetQueryRequestInput,
  type AssetQueryResult,
  type BuilderAssetFieldCatalog,
  type ContentCompilationPlan,
} from "@webstudio-is/content-engine";
import {
  createAssetIndex,
  computeCanonicalAssetRevision,
  decodeUtf8,
  materializeContentSource,
  materializeContentSnapshot,
  ContentSourceChangedError,
  readBoundedBytes,
  type ContentSource,
} from "@webstudio-is/content-engine/compiler";
import type { Asset, AssetFolder } from "@webstudio-is/sdk";
import type {
  AssetFolderUpdate,
  AssetMetadataUpdate,
} from "./asset-mutation-types";
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
  updateAssetMetadataWithClient,
  loadAssetsByProjectWithClient,
} from "./asset-patch-core";
import type { UploadTicket } from "./types";
import {
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
} from "./canonical-metadata-backfill";
import { loadCanonicalAssetFileEntries } from "./canonical-metadata-persistence";
import {
  deleteAssetFoldersWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
} from "./folder-persistence";
import {
  createContentCompilationCacheKey,
  getContentDatabaseForArtifact,
  sharedContentCompilationCache,
  type ContentCompilationCache,
} from "./content-compilation-cache";
import {
  AssetRepositoryConflictError,
  AssetRepositoryNotFoundError,
} from "./asset-repository-errors";

type CreateId = () => Asset["id"];
type RepositoryObjectStore = AssetObjectReader & Partial<AssetObjectWriter>;

const defaultDependencies = {
  hasProjectPermit: authorizeProject.hasProjectPermit,
  createUploadTicket,
  uploadFile,
  updateAssetContent,
  deleteAssetsWithClient,
  updateAssetMetadataWithClient,
  loadAssetsByProjectWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
  deleteAssetFoldersWithClient,
  createId: (): string => nanoid(),
  now: () => new Date(),
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
  loadCanonicalAssetFileEntries,
  createAssetIndex,
};

type AssetRepositoryDependencies = typeof defaultDependencies;

export class AssetIndexPreparationError extends Error {
  readonly issues: Awaited<
    ReturnType<typeof synchronizeCanonicalAssets>
  >["issues"];

  constructor(
    issues: Awaited<ReturnType<typeof synchronizeCanonicalAssets>>["issues"]
  ) {
    super(
      `Asset index preparation failed for ${issues.length} asset${issues.length === 1 ? "" : "s"}: ${issues.map(({ assetId, storageName, message }) => `${assetId} (${storageName}): ${message}`).join("; ")}`
    );
    this.name = "AssetIndexPreparationError";
    this.issues = issues;
  }
}

export type AssetContentRead = {
  asset: Asset;
  data: AsyncIterable<Uint8Array>;
  contentLength?: number;
};

export interface AssetRepository {
  list(): Promise<Asset[]>;
  get(assetId: Asset["id"]): Promise<Asset>;
  readContent(input: {
    assetId: Asset["id"];
    range?: AssetReadRange;
    asset?: Asset;
  }): Promise<AssetContentRead>;
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
    values: AssetFolderUpdate
  ): Promise<AssetFolder>;
  deleteFolder(folderId: string): Promise<void>;
  readIndex(
    requirements?: ContentCompilationPlan
  ): ReturnType<typeof createAssetIndex>;
  readFieldCatalog(): Promise<BuilderAssetFieldCatalog>;
  query(request: AssetQueryRequestInput): Promise<AssetQueryResult>;
}

/** Trusted repair/publication operations. Every method still verifies permits. */
export interface AssetMaintenanceRepository {
  synchronize(): ReturnType<typeof synchronizeCanonicalAssets>;
  prepareIndex(
    requirements?: ContentCompilationPlan
  ): ReturnType<typeof createAssetIndex>;
}

/**
 * Hosted Assets repository. PostgreSQL owns logical records and canonical
 * metadata; the injected object store owns file bytes. Published runtimes use
 * a separate storage-neutral index/query repository.
 *
 * Public mutations update only logical records and object bytes. Query reads
 * and publication lazily reconcile derived metadata so projects that do not
 * use configured Assets queries never open or parse stored file contents.
 */
export class PostgresAssetRepository
  implements AssetRepository, AssetMaintenanceRepository
{
  private readonly projectId: string;
  private readonly context: AppContext;
  private readonly assetStore: RepositoryObjectStore;
  private readonly dependencies: AssetRepositoryDependencies;
  private readonly contentDatabaseMaxBytes: number;
  private readonly compilationCache: ContentCompilationCache | undefined;

  constructor({
    projectId,
    context,
    assetClient,
    assetStore = assetClient,
    dependencies,
    contentDatabaseMaxBytes = contentEngineLimits.databaseBytes,
    compilationCache,
  }: {
    projectId: string;
    context: AppContext;
    assetClient?: RepositoryObjectStore;
    assetStore?: RepositoryObjectStore;
    dependencies?: Partial<AssetRepositoryDependencies>;
    contentDatabaseMaxBytes?: number;
    compilationCache?: ContentCompilationCache;
  }) {
    if (assetStore === undefined) {
      throw new Error("Asset object storage is required");
    }
    this.projectId = projectId;
    this.context = context;
    this.assetStore = assetStore;
    this.dependencies = { ...defaultDependencies, ...dependencies };
    this.contentDatabaseMaxBytes = contentDatabaseMaxBytes;
    this.compilationCache =
      compilationCache ??
      (dependencies === undefined ? sharedContentCompilationCache : undefined);
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

  private async assertCanBuild() {
    // The publisher loads an immutable production build with service
    // credentials and prepares its derived Assets index as part of that build.
    // Keep this exception scoped to index preparation: service credentials do
    // not bypass the edit checks used by asset mutations.
    if (this.context.authorization?.type === "service") {
      return;
    }
    const canBuild = await this.dependencies.hasProjectPermit(
      { projectId: this.projectId, permit: "build" },
      this.context
    );
    if (canBuild === false) {
      throw new AuthorizationError(
        "You don't have access to build this project assets index"
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
    await this.assertCanView();
    const [asset] = await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client,
      [assetId]
    );
    if (asset === undefined) {
      throw new AssetRepositoryNotFoundError("Asset not found");
    }
    return asset;
  }

  async readContent({
    assetId,
    range,
    asset: knownAsset,
  }: Parameters<AssetRepository["readContent"]>[0]) {
    if (knownAsset !== undefined && knownAsset.id !== assetId) {
      throw new Error("Known asset does not match requested asset id");
    }
    if (knownAsset !== undefined) {
      await this.assertCanView();
    }
    const asset = knownAsset ?? (await this.get(assetId));
    const content = await this.assetStore.readFile(asset.name, range);
    return { asset, ...content };
  }

  async createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ) {
    await this.assertCanEdit();
    const ticket = await this.dependencies.createUploadTicket(
      { ...input, projectId: this.projectId },
      this.context,
      createId
    );
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
    return asset;
  }

  async updateContent({
    assetId,
    expectedName,
    data,
  }: Parameters<AssetRepository["updateContent"]>[0]) {
    await this.assertCanEdit();
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
    return asset;
  }

  async updateMetadata(assetId: Asset["id"], values: AssetMetadataUpdate) {
    await this.assertCanEdit();
    const asset = await this.dependencies.updateAssetMetadataWithClient(
      { projectId: this.projectId, assetId, values },
      this.context.postgrest.client
    );

    return asset;
  }

  async delete(ids: Asset["id"][]) {
    await this.assertCanEdit();
    await this.dependencies.deleteAssetsWithClient(
      { projectId: this.projectId, ids },
      this.context.postgrest.client
    );
  }

  async listFolders() {
    await this.assertCanView();
    return await this.dependencies.loadAssetFoldersByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
  }

  async getFolder(folderId: string) {
    await this.assertCanView();
    const [folder] =
      await this.dependencies.loadAssetFoldersByProjectWithClient(
        this.projectId,
        this.context.postgrest.client,
        [folderId]
      );
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

  async updateFolder(folderId: string, values: AssetFolderUpdate) {
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

  async synchronize() {
    await this.assertCanEdit();
    return await this.synchronizeTrusted();
  }

  private async synchronizeTrusted(
    requirements?: ContentCompilationPlan,
    assetIds?: string[]
  ) {
    return await this.dependencies.synchronizeCanonicalAssets({
      client: this.context.postgrest.client,
      assetClient: this.assetStore,
      projectId: this.projectId,
      assetIds,
      ...(requirements === undefined
        ? {}
        : {
            requirements: {
              structuredProperties: requirements.structuredProperties,
              excerpt: requirements.excerpt,
            },
          }),
    });
  }

  async prepareIndex(requirements?: ContentCompilationPlan) {
    await this.assertCanBuild();
    return await this.prepareIndexAfterAuthorization(requirements, true);
  }

  private async prepareIndexAfterAuthorization(
    requirements: ContentCompilationPlan | undefined,
    strict: boolean
  ) {
    const source = this.createContentSource(strict);
    const compile = async (
      entries: Parameters<typeof createAssetIndex>[0]["entries"]
    ) =>
      await this.dependencies.createAssetIndex({
        projectId: this.projectId,
        entries,
        maxBytes: this.contentDatabaseMaxBytes,
        ...(requirements === undefined ? {} : { plan: requirements }),
      });
    if (this.compilationCache === undefined) {
      const { entries } = await materializeContentSource({
        source,
        plan: requirements,
      });
      return await compile(entries);
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const snapshot = await source.openSnapshot();
      const key = createContentCompilationCacheKey({
        projectId: this.projectId,
        sourceRevision: snapshot.revision,
        plan: requirements,
        strict,
        maxBytes: this.contentDatabaseMaxBytes,
      });
      try {
        return await this.compilationCache.getOrCreate(key, async () => {
          const { entries } = await materializeContentSnapshot({
            snapshot,
            plan: requirements,
          });
          return await compile(entries);
        });
      } catch (error) {
        if (error instanceof ContentSourceChangedError === false) {
          throw error;
        }
      }
    }
    throw new ContentSourceChangedError();
  }

  private createContentSource(strict: boolean): ContentSource {
    const loadBaseEntries = () =>
      this.dependencies.loadCanonicalAssetBaseEntries({
        client: this.context.postgrest.client,
        projectId: this.projectId,
      });
    return {
      openSnapshot: async () => {
        const baseEntries = await loadBaseEntries();
        const revision = await computeCanonicalAssetRevision(baseEntries);
        return {
          revision,
          files: baseEntries.map(({ document }) => ({
            id: document._id,
            path: document.path,
            contentType: document.mimeType,
            contentRef: document.contentRef,
            revision: document.revision,
            size: document.size,
            createdAt: document.createdAt,
          })),
          loadEntries: (plan) =>
            this.loadCompilerEntries({
              baseEntries,
              requirements: plan,
              strict,
            }),
          isCurrent: async () =>
            (await computeCanonicalAssetRevision(await loadBaseEntries())) ===
            revision,
        };
      },
    };
  }

  private async loadCompilerEntries({
    baseEntries,
    requirements,
    strict,
  }: {
    baseEntries: Awaited<ReturnType<typeof loadCanonicalAssetBaseEntries>>;
    requirements?: ContentCompilationPlan;
    strict: boolean;
  }) {
    const candidateBaseEntries =
      requirements === undefined
        ? baseEntries
        : baseEntries.filter(({ document }) =>
            isContentDocumentCandidate({
              document,
              plan: requirements,
              available: "base",
            })
          );
    const candidateAssetIds =
      requirements === undefined
        ? undefined
        : candidateBaseEntries.map(({ assetId }) => assetId);
    if (
      requirements === undefined ||
      requirements.structuredProperties ||
      requirements.excerpt ||
      requirements.hydratedContent
    ) {
      const result = await this.synchronizeTrusted(
        requirements,
        candidateAssetIds
      );
      if (strict && result.issues.length > 0) {
        throw new AssetIndexPreparationError(result.issues);
      }
      return await this.loadCanonicalCompilerEntries(
        requirements,
        candidateAssetIds,
        strict
      );
    }
    return candidateBaseEntries;
  }

  async readIndex(requirements?: ContentCompilationPlan) {
    await this.assertCanView();
    return await this.prepareIndexAfterAuthorization(requirements, false);
  }

  async readFieldCatalog() {
    const database = getContentDatabaseForArtifact(
      await this.readIndex(createContentFieldCatalogCompilationPlan())
    );
    return database.getFieldCatalog();
  }

  private async loadCanonicalCompilerEntries(
    requirements?: ContentCompilationPlan,
    assetIds?: string[],
    strict = false
  ) {
    const entries = await this.dependencies.loadCanonicalAssetFileEntries({
      client: this.context.postgrest.client,
      projectId: this.projectId,
      assetIds,
    });
    const projectedEntries =
      requirements === undefined
        ? entries
        : entries.map((entry) => {
            const { excerpt, ...document } = entry.document;
            return {
              ...entry,
              document: {
                ...document,
                properties:
                  requirements.structuredPropertyPaths === "all"
                    ? entry.document.properties
                    : selectAssetProperties({
                        properties: entry.document.properties,
                        fields: requirements.structuredPropertyPaths,
                      }),
                ...(requirements.excerpt && excerpt !== undefined
                  ? { excerpt }
                  : {}),
              },
            };
          });
    const hydrationAssetIds =
      requirements === undefined
        ? undefined
        : selectContentHydrationCandidates({
            documents: projectedEntries.map(({ document }) => document),
            plan: requirements,
          });
    const candidateEntries =
      requirements === undefined
        ? projectedEntries
        : projectedEntries.filter(({ document }) =>
            isContentDocumentCandidate({
              document,
              plan: requirements,
              available: "all",
            })
          );
    const compilerEntries = await Promise.all(
      candidateEntries.map(async (entry) => {
        if (
          requirements === undefined ||
          hydrationAssetIds?.has(entry.assetId) !== true
        ) {
          return entry;
        }
        if (entry.document.size > contentEngineLimits.hydratedFileBytes) {
          return entry;
        }
        const response = await this.assetStore.readFile(
          entry.document.contentRef,
          { offset: 0, length: entry.document.size }
        );
        const bytes = await readBoundedBytes(
          response.data,
          entry.document.size
        );
        if (bytes.byteLength !== entry.document.size) {
          throw new Error("Asset content does not match its canonical size");
        }
        let content: string;
        try {
          content = decodeUtf8(bytes);
        } catch {
          if (strict) {
            throw new AssetIndexPreparationError([
              {
                assetId: entry.assetId,
                storageName: entry.document.contentRef,
                revision: entry.revision,
                message: "Selected asset content is not valid UTF-8",
              },
            ]);
          }
          return entry;
        }
        return { ...entry, content };
      })
    );
    return compilerEntries;
  }

  async query(request: AssetQueryRequestInput) {
    const query = assetQuery.parse(request.query);
    const plan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({ id: "preview", query }),
    ]);
    const database = getContentDatabaseForArtifact(await this.readIndex(plan));
    return await database.query(request, this.assetStore.readFile);
  }
}
