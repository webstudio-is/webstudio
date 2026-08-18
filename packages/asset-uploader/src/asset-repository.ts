import {
  assetQuery,
  contentEngineLimits,
  createContentCompilationPlan,
  createContentFieldCatalogCompilationPlan,
  createDocumentResolutionSession,
  createLiteralContentCompilationQuery,
  getContentArtifactRuntimeAssetIds,
  getDocumentFormatByContentType,
  isAssetQueryCoveredByCompilationPlan,
  isContentDocumentCandidate,
  prepareContentCompilerEntries,
  requiresRuntimeDocumentData,
  requiresStructuredProperties,
  type AssetQueryRequestInput,
  type AssetQueryPreviewResult,
  type AssetQueryExecutionPreviewResult,
  type AssetQuery,
  type AssetQueryExecutionResult,
  type AssetRuntimeData,
  type BuilderAssetFieldCatalog,
  type ContentArtifactV1,
  type ContentCompilationPlan,
  type DocumentGraphRuntimeObserver,
  type DocumentSourceLoader,
  observeDocumentSourceLoader,
} from "@webstudio-is/content-engine";
import {
  createAssetIndex,
  createAssetFieldCatalog,
  createContentSourceFile,
  computeCanonicalAssetRevision,
  decodeUtf8,
  fullCanonicalAssetMetadataRequirements,
  materializeContentSource,
  materializeContentSnapshot,
  ContentSourceChangedError,
  readBoundedBytes,
  serializeJsonDeterministically,
  toBuilderAssetFieldCatalog,
  type ContentSource,
} from "@webstudio-is/content-engine/compiler";
import {
  toAssetReferenceRuntimeData,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
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
  AssetInfoFallback,
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
  areCanonicalAssetFileEntriesCurrent,
  loadCanonicalAssetBaseEntries,
  synchronizeCanonicalAssets,
} from "./canonical-metadata-backfill";
import {
  loadCanonicalAssetFileEntries,
  loadCanonicalAssetFileEntriesForRecovery,
} from "./canonical-metadata-persistence";
import {
  deleteAssetFoldersWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
} from "./folder-persistence";
import {
  createContentCompilationCache,
  createContentCompilationCacheKey,
  getContentDatabaseForArtifact,
  type ContentCompilationCache,
} from "./content-compilation-cache";
import {
  AssetRepositoryConflictError,
  AssetRepositoryNotFoundError,
} from "./asset-repository-errors";
import {
  emitAssetQueryPerformanceEvent,
  measureAssetQueryPerformance,
  type AssetQueryPerformanceObserver,
  type AssetQueryPerformancePhase,
} from "./query-performance";

type CreateId = () => Asset["id"];
type RepositoryObjectStore = AssetObjectReader & Partial<AssetObjectWriter>;

type ContentBytesReference = {
  contentRef: string;
  revision: string;
};

class RequestContentBytesCache {
  private values = new Map<string, Uint8Array>();
  private byteLength = 0;

  private getKey({ contentRef, revision }: ContentBytesReference) {
    return JSON.stringify([contentRef, revision]);
  }

  get(reference: ContentBytesReference) {
    return this.values.get(this.getKey(reference));
  }

  set({
    contentRef,
    revision,
    bytes,
  }: ContentBytesReference & { bytes: Uint8Array }) {
    const key = this.getKey({ contentRef, revision });
    const previous = this.values.get(key);
    const nextByteLength =
      this.byteLength - (previous?.byteLength ?? 0) + bytes.byteLength;
    if (nextByteLength > contentEngineLimits.hydratedTotalBytes) {
      return;
    }
    this.values.set(key, bytes);
    this.byteLength = nextByteLength;
  }
}

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
  loadCanonicalAssetFileEntriesForRecovery,
  createAssetIndex,
  performanceNow: () => performance.now(),
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
      `Asset index preparation failed for ${issues.length} asset${
        issues.length === 1 ? "" : "s"
      }: ${issues
        .map(
          ({ assetId, storageName, message }) =>
            `${assetId} (${storageName}): ${message}`
        )
        .join("; ")}`
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

type AssetQueryPreviewOptions = {
  databasePlan?: ContentCompilationPlan;
  diagnosticsPlan?: ContentCompilationPlan;
  includeDiagnostics?: boolean;
  includeUnresolvedDiagnostics?: boolean;
  signal?: AbortSignal;
};

type AssetQueryResultOnly = { data: AssetQueryExecutionResult };
type AssetQueryOptionsWithoutDiagnostics = AssetQueryPreviewOptions & {
  includeDiagnostics: false;
};
type AssetQueryOptionsWithDiagnostics = AssetQueryPreviewOptions & {
  includeDiagnostics?: true;
};
type AssetQueryBatchOptions = {
  databasePlan?: ContentCompilationPlan;
  signal?: AbortSignal;
};

const createAssetQueryBatchPlan = (queries: readonly AssetQuery[]) => {
  // The generated artifact must depend on query semantics, not request order or
  // duplicate callers. Stable keys also make equivalent batches reproducible.
  const queryByKey = new Map<string, AssetQuery>();
  for (const query of queries) {
    queryByKey.set(serializeJsonDeterministically(query), query);
  }
  const compilationQueries = [...queryByKey]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, query], index) =>
      createLiteralContentCompilationQuery({
        id: `batch-${index}`,
        query,
      })
    );
  return createContentCompilationPlan(compilationQueries);
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
    assetInfoFallback: AssetInfoFallback | undefined;
    assetDataOverride?: AssetDataOverride;
    assetId?: Asset["id"];
  }): Promise<Asset>;
  updateContent(input: {
    assetId: Asset["id"];
    expectedName: string;
    extension?: string;
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
  readFieldCatalog(): Promise<BuilderAssetFieldCatalog>;
  query(
    request: AssetQueryRequestInput,
    options: AssetQueryOptionsWithoutDiagnostics
  ): Promise<AssetQueryResultOnly>;
  query(
    request: AssetQueryRequestInput,
    options?: AssetQueryOptionsWithDiagnostics
  ): Promise<AssetQueryPreviewResult>;
  queryMany(
    requests: readonly AssetQueryRequestInput[],
    options?: AssetQueryBatchOptions
  ): Promise<PromiseSettledResult<AssetQueryResultOnly>[]>;
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
export class PostgresAssetRepository implements AssetRepository {
  private readonly projectId: string;
  private readonly context: AppContext;
  private readonly assetStore: RepositoryObjectStore;
  private readonly dependencies: AssetRepositoryDependencies;
  private readonly contentDatabaseMaxBytes: number;
  private readonly compilationCache: ContentCompilationCache | undefined;
  private readonly onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
  private readonly onPerformanceEvent?: AssetQueryPerformanceObserver;

  constructor({
    projectId,
    context,
    assetStore,
    dependencies,
    contentDatabaseMaxBytes = contentEngineLimits.databaseBytes,
    compilationCache,
    onDocumentGraphEvent,
    onPerformanceEvent,
  }: {
    projectId: string;
    context: AppContext;
    assetStore: RepositoryObjectStore;
    dependencies?: Partial<AssetRepositoryDependencies>;
    contentDatabaseMaxBytes?: number;
    compilationCache?: ContentCompilationCache | false;
    onDocumentGraphEvent?: DocumentGraphRuntimeObserver;
    onPerformanceEvent?: AssetQueryPerformanceObserver;
  }) {
    this.projectId = projectId;
    this.context = context;
    this.assetStore = assetStore;
    this.dependencies = { ...defaultDependencies, ...dependencies };
    this.contentDatabaseMaxBytes = contentDatabaseMaxBytes;
    this.compilationCache =
      compilationCache === false
        ? undefined
        : (compilationCache ?? createContentCompilationCache());
    this.onDocumentGraphEvent = onDocumentGraphEvent;
    this.onPerformanceEvent = onPerformanceEvent;
  }

  private measurePerformance<Value>(
    phase: AssetQueryPerformancePhase,
    operation: () => Promise<Value>
  ) {
    return measureAssetQueryPerformance({
      phase,
      operation,
      observer: this.onPerformanceEvent,
      now: this.dependencies.performanceNow,
    });
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

  private async assertPermit(
    permit: "view" | "edit" | "build",
    action: string
  ) {
    const permitted = await this.dependencies.hasProjectPermit(
      { projectId: this.projectId, permit },
      this.context
    );
    if (permitted === false) {
      throw new AuthorizationError(`You don't have access to ${action}`);
    }
  }

  private async assertCanEdit() {
    await this.assertPermit("edit", "edit this project assets");
  }

  private async assertCanView() {
    await this.assertPermit("view", "view this project assets");
  }

  private async assertCanViewWithPerformance() {
    await this.measurePerformance("repository-authorization", () =>
      this.assertCanView()
    );
  }

  private async assertCanBuild() {
    // Index preparation only reads asset data and produces a derived artifact.
    // Callers that perform an actual build or publish enforce the stronger
    // build permit before invoking this method.
    if (this.context.authorization?.type === "service") {
      return;
    }
    await this.assertCanViewWithPerformance();
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
    extension,
    data,
  }: Parameters<AssetRepository["updateContent"]>[0]) {
    await this.assertCanEdit();
    const asset = await this.dependencies.updateAssetContent(
      {
        assetId,
        projectId: this.projectId,
        expectedName,
        extension,
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
              structuredProperties: requiresStructuredProperties(requirements),
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
    strict: boolean,
    contentBytesCache = new RequestContentBytesCache()
  ) {
    const source = this.createContentSource(strict, contentBytesCache);
    const compile = async (
      entries: Parameters<typeof createAssetIndex>[0]["entries"],
      assetReferences: Parameters<
        typeof createAssetIndex
      >[0]["assetReferences"],
      assetValueReferences: Parameters<
        typeof createAssetIndex
      >[0]["assetValueReferences"],
      documentGraph: Parameters<typeof createAssetIndex>[0]["documentGraph"]
    ) =>
      await this.measurePerformance(
        "artifact-compilation",
        async () =>
          await this.dependencies.createAssetIndex({
            projectId: this.projectId,
            entries,
            assetReferences,
            ...(assetValueReferences === undefined ||
            Object.keys(assetValueReferences).length === 0
              ? {}
              : { assetValueReferences }),
            documentGraph,
            maxBytes: this.contentDatabaseMaxBytes,
            ...(requirements === undefined ? {} : { plan: requirements }),
          })
      );
    if (this.compilationCache === undefined) {
      emitAssetQueryPerformanceEvent(this.onPerformanceEvent, {
        type: "compilation-cache",
        status: "disabled",
      });
      const { entries, assetReferences, assetValueReferences, documentGraph } =
        await materializeContentSource({
          source,
          plan: requirements,
          maximumContentBytes: this.contentDatabaseMaxBytes,
          onPerformanceEvent: this.onPerformanceEvent,
          performanceNow: this.dependencies.performanceNow,
        });
      return await compile(
        entries,
        assetReferences,
        assetValueReferences,
        documentGraph
      );
    }
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const snapshot = await this.measurePerformance(
        "source-snapshot",
        source.openSnapshot
      );
      const key = createContentCompilationCacheKey({
        projectId: this.projectId,
        sourceRevision: snapshot.revision,
        plan: requirements,
        strict,
        maxBytes: this.contentDatabaseMaxBytes,
      });
      try {
        const cached = this.compilationCache.getOrCreateWithStatus(
          key,
          async () => {
            const {
              entries,
              assetReferences,
              assetValueReferences,
              documentGraph,
            } = await materializeContentSnapshot({
              snapshot,
              plan: requirements,
              maximumContentBytes: this.contentDatabaseMaxBytes,
              onPerformanceEvent: this.onPerformanceEvent,
              performanceNow: this.dependencies.performanceNow,
            });
            return await compile(
              entries,
              assetReferences,
              assetValueReferences,
              documentGraph
            );
          }
        );
        emitAssetQueryPerformanceEvent(this.onPerformanceEvent, {
          type: "compilation-cache",
          status: cached.status,
        });
        return await cached.promise;
      } catch (error) {
        if (error instanceof ContentSourceChangedError === false) {
          throw error;
        }
      }
    }
    throw new ContentSourceChangedError();
  }

  private createContentSource(
    strict: boolean,
    contentBytesCache = new RequestContentBytesCache()
  ): ContentSource {
    const readFile = this.assetStore.readFile;
    const onPerformanceEvent = this.onPerformanceEvent;
    const performanceNow = this.dependencies.performanceNow;
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
          files: baseEntries.map(createContentSourceFile),
          loadDocumentSources: async () =>
            baseEntries.flatMap((entry) => {
              if (
                getDocumentFormatByContentType(entry.document.mimeType) ===
                undefined
              ) {
                return [];
              }
              return [
                {
                  id: entry.assetId,
                  source: {
                    [Symbol.asyncIterator]: async function* () {
                      const cached = contentBytesCache.get({
                        contentRef: entry.document.contentRef,
                        revision: entry.revision,
                      });
                      if (cached !== undefined) {
                        yield cached;
                        return;
                      }
                      const startedAt = performanceNow();
                      const response = await readFile(
                        entry.document.contentRef,
                        entry.document.size === 0
                          ? undefined
                          : { offset: 0, length: entry.document.size }
                      );
                      const bytes = await readBoundedBytes(
                        response.data,
                        entry.document.size
                      );
                      if (bytes.byteLength !== entry.document.size) {
                        throw new Error(
                          "Asset content does not match its canonical size"
                        );
                      }
                      contentBytesCache.set({
                        contentRef: entry.document.contentRef,
                        revision: entry.revision,
                        bytes,
                      });
                      emitAssetQueryPerformanceEvent(onPerformanceEvent, {
                        type: "content-read",
                        purpose: "document-graph",
                        byteLength: bytes.byteLength,
                        durationMs: Math.max(0, performanceNow() - startedAt),
                      });
                      yield bytes;
                    },
                  },
                },
              ];
            }),
          loadEntries: (plan, options) =>
            this.loadCompilerEntries({
              baseEntries,
              requirements: plan,
              strict,
              maximumContentBytes: options?.maximumContentBytes,
              contentBytesCache,
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
    maximumContentBytes,
    contentBytesCache,
  }: {
    baseEntries: Awaited<ReturnType<typeof loadCanonicalAssetBaseEntries>>;
    requirements?: ContentCompilationPlan;
    strict: boolean;
    maximumContentBytes?: number;
    contentBytesCache: RequestContentBytesCache;
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
    let entries = candidateBaseEntries;
    if (
      requirements === undefined ||
      requiresStructuredProperties(requirements) ||
      requirements.excerpt
    ) {
      entries = await this.measurePerformance(
        "canonical-metadata",
        async () => {
          const metadataRequirements =
            requirements === undefined
              ? fullCanonicalAssetMetadataRequirements
              : {
                  structuredProperties:
                    requiresStructuredProperties(requirements),
                  excerpt: requirements.excerpt,
                };
          const current =
            await this.dependencies.loadCanonicalAssetFileEntriesForRecovery({
              client: this.context.postgrest.client,
              projectId: this.projectId,
              assetIds: candidateAssetIds,
            });
          if (
            current.inconsistentRows.length === 0 &&
            areCanonicalAssetFileEntriesCurrent({
              baseEntries: candidateBaseEntries,
              currentEntries: current.entries,
              requirements: metadataRequirements,
            })
          ) {
            return current.entries;
          }
          const result = await this.synchronizeTrusted(
            requirements,
            candidateAssetIds
          );
          if (strict && result.issues.length > 0) {
            throw new AssetIndexPreparationError(result.issues);
          }
          return await this.dependencies.loadCanonicalAssetFileEntries({
            client: this.context.postgrest.client,
            projectId: this.projectId,
            assetIds: candidateAssetIds,
          });
        }
      );
    }
    return await this.measurePerformance(
      "compiler-entries",
      async () =>
        await prepareContentCompilerEntries({
          entries,
          plan: requirements,
          loadContent: async (entry) => {
            const startedAt = this.dependencies.performanceNow();
            const response = await this.assetStore.readFile(
              entry.document.contentRef,
              { offset: 0, length: entry.document.size }
            );
            const bytes = await readBoundedBytes(
              response.data,
              entry.document.size
            );
            if (bytes.byteLength !== entry.document.size) {
              throw new Error(
                "Asset content does not match its canonical size"
              );
            }
            contentBytesCache.set({
              contentRef: entry.document.contentRef,
              revision: entry.revision,
              bytes,
            });
            emitAssetQueryPerformanceEvent(this.onPerformanceEvent, {
              type: "content-read",
              purpose: "compiler-entry",
              byteLength: bytes.byteLength,
              durationMs: Math.max(
                0,
                this.dependencies.performanceNow() - startedAt
              ),
            });
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
              return;
            }
            return content;
          },
          maximumContentBytes,
        })
    );
  }

  async readFieldCatalog() {
    await this.assertCanView();
    const { entries } = await materializeContentSource({
      source: this.createContentSource(false),
      plan: createContentFieldCatalogCompilationPlan(),
    });
    return toBuilderAssetFieldCatalog(await createAssetFieldCatalog(entries));
  }

  private async loadQueryRuntimeAssets({
    artifact,
    plan,
  }: {
    artifact: ContentArtifactV1;
    plan?: ContentCompilationPlan;
  }): Promise<Readonly<Record<string, AssetRuntimeData>> | undefined> {
    const runtimeAssetIds = getContentArtifactRuntimeAssetIds({
      artifact,
      includeDocuments: plan !== undefined && requiresRuntimeDocumentData(plan),
      includeDocumentGraph: false,
    });
    if (runtimeAssetIds.length === 0) {
      return;
    }
    return Object.fromEntries(
      (
        await this.dependencies.loadAssetsByProjectWithClient(
          this.projectId,
          this.context.postgrest.client,
          runtimeAssetIds
        )
      ).map((asset) => [
        asset.id,
        toAssetReferenceRuntimeData(asset, "https://webstudio.local"),
      ])
    );
  }

  private createQueryDocumentLoader(
    contentBytesCache?: RequestContentBytesCache
  ): DocumentSourceLoader {
    const onEvent = this.onDocumentGraphEvent;
    return observeDocumentSourceLoader({
      onEvent,
      load: async (node, { signal }) => {
        signal?.throwIfAborted();
        if (node.format === undefined) {
          throw new Error(`Document ${node.id} format is unavailable`);
        }
        const cached = contentBytesCache?.get({
          contentRef: node.contentRef,
          revision: node.revision,
        });
        if (cached !== undefined) {
          return {
            format: node.format,
            revision: node.revision,
            source: {
              [Symbol.asyncIterator]: async function* () {
                yield cached;
              },
            },
          };
        }
        const response = await this.assetStore.readFile(node.contentRef);
        signal?.throwIfAborted();
        return {
          format: node.format,
          revision: node.revision,
          source: response.data,
        };
      },
    });
  }

  async queryMany(
    requests: readonly AssetQueryRequestInput[],
    { databasePlan, signal }: AssetQueryBatchOptions = {}
  ): Promise<PromiseSettledResult<AssetQueryResultOnly>[]> {
    if (requests.length === 0) {
      return [];
    }
    await this.assertCanViewWithPerformance();
    signal?.throwIfAborted();
    const executeIndividually = (request: AssetQueryRequestInput) =>
      this.queryAfterAuthorization(request, {
        includeDiagnostics: false,
        signal,
      });
    const executions = requests.map(
      (request) => () => executeIndividually(request)
    );
    const queries = requests.map(({ query }) => {
      const result = assetQuery.safeParse(query);
      return result.success ? result.data : undefined;
    });
    const selectQueries = (indexes: readonly number[]) =>
      indexes.flatMap((index) => {
        const query = queries[index];
        return query === undefined ? [] : [query];
      });
    // Revision-pinned requests must use the saved plan that produced the
    // expected artifact. Ordinary Builder previews compile their concrete
    // query values so a detail page hydrates only the documents it needs.
    const databaseIndexes = requests.flatMap((request, index) =>
      queries[index] !== undefined &&
      request.indexRevision !== undefined &&
      databasePlan !== undefined &&
      isAssetQueryCoveredByCompilationPlan({
        plan: databasePlan,
        query: queries[index],
      })
        ? [index]
        : []
    );
    const literalIndexes = requests.flatMap((request, index) =>
      queries[index] !== undefined && request.indexRevision === undefined
        ? [index]
        : []
    );
    const contentBytesCache = new RequestContentBytesCache();
    const load = this.createQueryDocumentLoader(contentBytesCache);
    const resolutionSession = createDocumentResolutionSession({
      load,
      concurrency: contentEngineLimits.concurrentContentReads,
      signal,
    });
    const prepareSharedExecutions = async ({
      indexes,
      artifactPlan,
      preserveTruncation,
      fallbackToIndividualOnError,
    }: {
      indexes: readonly number[];
      artifactPlan: ContentCompilationPlan;
      preserveTruncation: boolean;
      fallbackToIndividualOnError: boolean;
    }) => {
      if (indexes.length === 0) {
        return;
      }
      try {
        signal?.throwIfAborted();
        const artifact = await this.measurePerformance(
          "index-preparation",
          () =>
            this.prepareIndexAfterAuthorization(
              artifactPlan,
              false,
              contentBytesCache
            )
        );
        signal?.throwIfAborted();
        const database = getContentDatabaseForArtifact(artifact);
        if (preserveTruncation || database.getStats().truncated === false) {
          const runtimePlan = createAssetQueryBatchPlan(selectQueries(indexes));
          const runtimeAssets = await this.measurePerformance(
            "runtime-assets",
            () =>
              this.loadQueryRuntimeAssets({
                artifact,
                plan: runtimePlan,
              })
          );
          signal?.throwIfAborted();
          let batchExecution:
            | Promise<PromiseSettledResult<AssetQueryExecutionResult>[]>
            | undefined;
          const executeBatch = () => {
            batchExecution ??= this.measurePerformance(
              "document-resolution",
              () =>
                database.queryManyWithDocumentGraph({
                  requests: indexes.map((index) => requests[index]),
                  readContent: this.assetStore.readFile,
                  runtimeAssets,
                  load,
                  resolutionSession,
                  signal,
                  onEvent: this.onDocumentGraphEvent,
                })
            );
            return batchExecution;
          };
          for (const [position, index] of indexes.entries()) {
            executions[index] = async () => {
              signal?.throwIfAborted();
              const result = (await executeBatch())[position];
              signal?.throwIfAborted();
              if (result.status === "rejected") {
                throw result.reason;
              }
              return {
                data: result.value,
              };
            };
          }
        }
      } catch (error) {
        // A temporary union is an optimization and may safely degrade to the
        // original per-query path. Saved-plan failures are authoritative.
        if (fallbackToIndividualOnError && signal?.aborted !== true) {
          return;
        }
        for (const index of indexes) {
          executions[index] = async () => {
            throw error;
          };
        }
      }
    };
    if (databasePlan !== undefined) {
      await prepareSharedExecutions({
        indexes: databaseIndexes,
        artifactPlan: databasePlan,
        preserveTruncation: true,
        fallbackToIndividualOnError: false,
      });
    }
    const literalPlan = createAssetQueryBatchPlan(
      selectQueries(literalIndexes)
    );
    if (literalPlan !== undefined) {
      await prepareSharedExecutions({
        indexes: literalIndexes,
        artifactPlan: literalPlan,
        preserveTruncation: false,
        fallbackToIndividualOnError: true,
      });
    }
    return await Promise.allSettled(executions.map((execute) => execute()));
  }

  query(
    request: AssetQueryRequestInput,
    options: AssetQueryOptionsWithoutDiagnostics
  ): Promise<AssetQueryResultOnly>;
  query(
    request: AssetQueryRequestInput,
    options?: AssetQueryOptionsWithDiagnostics
  ): Promise<AssetQueryPreviewResult>;
  async query(
    request: AssetQueryRequestInput,
    options: AssetQueryPreviewOptions = {}
  ): Promise<AssetQueryExecutionPreviewResult | AssetQueryResultOnly> {
    await this.assertCanViewWithPerformance();
    return await this.queryAfterAuthorization(request, options);
  }

  private async queryAfterAuthorization(
    request: AssetQueryRequestInput,
    {
      databasePlan,
      diagnosticsPlan,
      includeDiagnostics = true,
      includeUnresolvedDiagnostics = false,
      signal,
    }: AssetQueryPreviewOptions = {}
  ): Promise<AssetQueryExecutionPreviewResult | AssetQueryResultOnly> {
    signal?.throwIfAborted();
    const contentBytesCache = new RequestContentBytesCache();
    const query = assetQuery.parse(request.query);
    const plan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({ id: "preview", query }),
    ]);
    // Revision-pinned requests must use the saved plan that produced the
    // expected artifact. Unpinned previews compile the concrete query and only
    // prepare the saved deployment plan for explicit diagnostics.
    const coveredByDatabasePlan =
      databasePlan !== undefined &&
      isAssetQueryCoveredByCompilationPlan({ plan: databasePlan, query });
    const usePublishedIndex =
      request.indexRevision !== undefined && coveredByDatabasePlan;
    const index = await this.measurePerformance("index-preparation", () =>
      this.prepareIndexAfterAuthorization(
        usePublishedIndex ? databasePlan : plan,
        false,
        contentBytesCache
      )
    );
    signal?.throwIfAborted();
    const database = getContentDatabaseForArtifact(index);
    const queryIndex =
      includeDiagnostics && usePublishedIndex
        ? await this.prepareIndexAfterAuthorization(
            plan,
            false,
            contentBytesCache
          )
        : index;
    signal?.throwIfAborted();
    const runtimeAssets = await this.measurePerformance("runtime-assets", () =>
      this.loadQueryRuntimeAssets({ artifact: index, plan })
    );
    signal?.throwIfAborted();
    const unresolved = includeUnresolvedDiagnostics
      ? await getContentDatabaseForArtifact(queryIndex).query(
          query.content.mode === "none"
            ? request
            : { ...request, query: { ...query, content: { mode: "none" } } },
          undefined,
          runtimeAssets
        )
      : undefined;
    signal?.throwIfAborted();
    const data = await this.measurePerformance("document-resolution", () =>
      database.queryWithDocumentGraph({
        request,
        readContent: this.assetStore.readFile,
        runtimeAssets,
        load: this.createQueryDocumentLoader(contentBytesCache),
        signal,
        onEvent: this.onDocumentGraphEvent,
      })
    );
    signal?.throwIfAborted();
    let publishedIndex: typeof index | undefined;
    if (includeDiagnostics) {
      const publishedPlan = diagnosticsPlan ?? databasePlan;
      if (publishedPlan === undefined) {
        publishedIndex = queryIndex;
      } else {
        const diagnosticsRepository = new PostgresAssetRepository({
          projectId: this.projectId,
          context: this.context,
          assetStore: this.assetStore,
          dependencies: this.dependencies,
          contentDatabaseMaxBytes: this.contentDatabaseMaxBytes,
        });
        publishedIndex = await this.measurePerformance(
          "diagnostics-preparation",
          () =>
            diagnosticsRepository.prepareIndexAfterAuthorization(
              publishedPlan,
              false
            )
        );
      }
    }
    signal?.throwIfAborted();
    const toCapacityStats = ({
      usedBytes,
      maxBytes,
      unboundedBytes,
      includedDocumentCount,
      omittedDocumentCount,
      omissionReason,
      truncated,
    }: ReturnType<typeof database.getStats>) => ({
      usedBytes,
      maxBytes,
      unboundedBytes,
      includedDocumentCount,
      omittedDocumentCount,
      ...(omissionReason === undefined ? {} : { omissionReason }),
      truncated,
    });
    if (includeDiagnostics === false) {
      return { data };
    }
    if (publishedIndex === undefined) {
      throw new Error("Diagnostics index was not prepared");
    }
    const queryDatabase = getContentDatabaseForArtifact(queryIndex);
    const publishedDatabase = getContentDatabaseForArtifact(publishedIndex);
    return {
      data,
      __diagnostics__: {
        scope: "query-preview",
        query: toCapacityStats(queryDatabase.getStats()),
        database: toCapacityStats(publishedDatabase.getStats()),
        ...(includeUnresolvedDiagnostics
          ? { artifacts: { query: queryIndex, database: publishedIndex } }
          : {}),
        ...(unresolved === undefined ? {} : { unresolved }),
      },
    };
  }
}
