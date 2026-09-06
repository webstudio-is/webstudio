import {
  assetQuery,
  AssetResourceHydrationError,
  contentEngineLimits,
  createContentCompilationPlan,
  createContentFieldCatalogCompilationPlan,
  createDocumentResolutionSession,
  createCollectionEntry,
  extractMarkdownFrontmatter,
  createLiteralContentCompilationQuery,
  getCollectionTemplateValidationError,
  getContentArtifactRuntimeAssetIds,
  getAssetQueryErrorDiagnosticIssue,
  getCollectionValidationError,
  getDocumentFormatByContentType,
  DocumentSourceCompilationAggregateError,
  isAssetQueryCoveredByCompilationPlan,
  isContentDocumentCandidate,
  prepareContentCompilerEntries,
  requiresRuntimeDocumentData,
  requiresStructuredProperties,
  validateAssetQueryAgainstCatalog,
  collectionConfigFilename,
  ContentCollectionError,
  parseCollectionConfig,
  type AssetQueryRequestInput,
  type AssetQueryPreviewResult,
  type AssetQueryExecutionPreviewResult,
  type AssetQuery,
  type AssetQueryExecutionResult,
  type AssetQueryDiagnosticIssue,
  type AssetRuntimeData,
  type BuilderAssetFieldCatalog,
  type ContentArtifactV1,
  type ContentCompilationPlan,
  type DocumentGraphRuntimeObserver,
  type DocumentSourceLoader,
  observeDocumentSourceLoader,
} from "@webstudio-is/content-engine";
import { parseMdxDocument } from "@webstudio-is/content-engine/mdx";
import { createHash } from "node:crypto";
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
  DocumentSourceDiagnosticsError,
  readBoundedBytes,
  serializeJsonDeterministically,
  toBuilderAssetFieldCatalog,
  type ContentSource,
} from "@webstudio-is/content-engine/compiler";
import {
  createId,
  formatAssetName,
  getAssetDisplayNameParts,
  isMdxFileAsset,
  toAssetReferenceRuntimeData,
  type Asset,
  type AssetFolder,
} from "@webstudio-is/sdk";
import { assetResourceLimits } from "@webstudio-is/sdk/asset-resource-limits";
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
import {
  createUploadTicket,
  uploadFile,
  type CreateUploadTicketInput,
} from "./upload";
import { updateAssetContent } from "./revision";
import {
  deleteAssetsWithClient,
  deleteAssetUploadReservationWithClient,
  loadAssetUploadReservationsByProjectWithClient,
  updateAssetFilenameIfCurrentWithClient,
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
import type { AssetContentRead as SharedAssetContentRead } from "@webstudio-is/content-engine/asset-content-repository";
import { validateTextAssetSourceBytes } from "@webstudio-is/content-engine/mdx";
import { removeMetadataIssuesDuplicatedBySource } from "./diagnostic-utils";
import {
  assertUniqueCollectionFilenames,
  getCollectionFolderIds,
  getCollectionReservedAssetIds,
  validateCollectionFolder,
  type CollectionFolderDefinition,
} from "./collection-persistence";

type CreateId = () => Asset["id"];
type RepositoryObjectStore = AssetObjectReader & Partial<AssetObjectWriter>;

type ContentBytesReference = {
  contentRef: string;
  revision: string;
};

type PreparedDiagnosticIssue = Omit<AssetQueryDiagnosticIssue, "scope">;
type DiagnosticIssueIdentity = Pick<
  AssetQueryDiagnosticIssue,
  | "severity"
  | "code"
  | "assetId"
  | "path"
  | "line"
  | "column"
  | "reference"
  | "nodeType"
  | "reason"
  | "sourceRange"
  | "message"
> &
  Partial<Pick<AssetQueryDiagnosticIssue, "phase">>;

const diagnosticIssuesByArtifact = new WeakMap<
  ContentArtifactV1,
  readonly PreparedDiagnosticIssue[]
>();
const diagnosticPathsByArtifact = new WeakMap<
  ContentArtifactV1,
  ReadonlyMap<string, string>
>();

const getDiagnosticIssueKey = (issue: DiagnosticIssueIdentity) =>
  JSON.stringify([
    issue.severity,
    issue.phase,
    issue.code,
    issue.assetId,
    issue.path,
    issue.line,
    issue.column,
    issue.reference,
    issue.nodeType,
    issue.reason,
    issue.sourceRange,
    issue.message,
  ]);

const getPreparedDiagnosticIssues = ({
  entries,
  assetReferenceIssues,
  sourceIssues,
  preparationIssues,
}: {
  entries: Parameters<typeof createAssetIndex>[0]["entries"];
  assetReferenceIssues: Awaited<
    ReturnType<typeof materializeContentSource>
  >["assetReferenceIssues"];
  sourceIssues: Awaited<
    ReturnType<typeof materializeContentSource>
  >["sourceIssues"];
  preparationIssues: readonly PreparedDiagnosticIssue[];
}): PreparedDiagnosticIssue[] => {
  const pathsById = new Map(
    entries.map(({ assetId, document }) => [assetId, document.path])
  );
  const metadataIssues = removeMetadataIssuesDuplicatedBySource({
    metadataIssues: entries.flatMap(({ assetId, document }) =>
      document.metadataError === undefined
        ? []
        : [
            {
              severity: "warning" as const,
              phase: "metadata" as const,
              code: document.metadataError.code,
              message: document.metadataError.message,
              assetId,
              path: document.path,
              ...(document.metadataError.reason === undefined
                ? {}
                : { reason: document.metadataError.reason }),
              ...(document.metadataError.line === undefined
                ? {}
                : { line: document.metadataError.line }),
              ...(document.metadataError.column === undefined
                ? {}
                : { column: document.metadataError.column }),
            },
          ]
    ),
    sourceIssues,
  });
  const referenceIssues = assetReferenceIssues.flatMap((issue) => {
    const path = pathsById.get(issue.sourceDocumentId);
    return path === undefined
      ? []
      : [
          {
            severity: "warning" as const,
            phase: "reference" as const,
            code: issue.code,
            message: `Referenced asset was not found: ${issue.assetUrl}`,
            assetId: issue.sourceDocumentId,
            path,
            reference: issue.assetUrl,
          },
        ];
  });
  const issues = [...metadataIssues, ...referenceIssues, ...preparationIssues];
  issues.push(
    ...sourceIssues.map((issue) => ({ ...issue, phase: "source" as const }))
  );
  return [
    ...new Map(
      issues.map((issue) => [getDiagnosticIssueKey(issue), issue])
    ).values(),
  ];
};

const parseCollectionTemplate = async (source: string) => {
  try {
    return await parseMdxDocument({ source });
  } catch (error) {
    const details = error instanceof Error ? `: ${error.message}` : "";
    throw new AssetRepositoryConflictError(
      `Collection template is invalid${details}`,
      { cause: error }
    );
  }
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
  deleteAssetUploadReservationWithClient,
  loadAssetUploadReservationsByProjectWithClient,
  updateAssetFilenameIfCurrentWithClient,
  updateAssetMetadataWithClient,
  loadAssetsByProjectWithClient,
  loadAssetFoldersByProjectWithClient,
  upsertAssetFolderWithClient,
  deleteAssetFoldersWithClient,
  createId: (): string => createId("nano"),
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

export type AssetContentRead = Omit<SharedAssetContentRead, "asset"> & {
  asset: Asset;
};

type AssetQueryPreviewOptions = {
  databasePlan?: ContentCompilationPlan;
  diagnosticsPlan?: ContentCompilationPlan;
  includeDiagnostics?: boolean;
  includeUnresolvedDiagnostics?: boolean;
  signal?: AbortSignal;
};

type AssetQueryResultOnly = { data: AssetQueryExecutionResult };

const getAssetQueryResultIds = (result: AssetQueryExecutionResult) =>
  "items" in result
    ? result.items.map(({ id }) => id)
    : result.item === null
      ? []
      : [result.item.id];

const createAssetQueryDiagnosticMatchQuery = (
  query: AssetQuery
): AssetQuery => ({
  ...query,
  result: "many",
  limit: contentEngineLimits.candidateDocuments,
  offset: 0,
  output: {
    mode: "fields",
    includeMetadata: false,
    fields: [["id"]],
  },
  content: { mode: "none" },
});

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
  createCollectionEntry(input: {
    folderId: string;
    values: Readonly<Record<string, unknown>>;
  }): Promise<Asset>;
  updateCollectionConfigAndTemplateName(input: {
    folderId: string;
    configAssetId: Asset["id"];
    expectedConfigName: Asset["name"];
    templateAssetId: Asset["id"];
    expectedTemplateFilename: Asset["filename"];
    templateFilename: string;
    configSource: string;
  }): Promise<{ configAsset: Asset; templateAsset: Asset }>;
  updateFolder(
    folderId: string,
    values: AssetFolderUpdate
  ): Promise<AssetFolder>;
  deleteFolder(folderId: string): Promise<void>;
  validateCollections(assets: readonly Asset[]): Promise<void>;
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

  private async assertCanConfigureCollections() {
    await this.assertPermit("build", "configure this project collections");
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
      try {
        await this.dependencies.deleteAssetUploadReservationWithClient(
          { projectId: this.projectId, assetId, name },
          this.context.postgrest.client
        );
      } catch {
        // Cleanup is best effort. Keep the original upload/validation error so
        // callers can repair the actual problem; stale reservations expire.
        console.error("Failed to clean up an asset upload reservation");
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

  private async readCollectionAssetBytes(asset: Asset) {
    if (asset.size > contentEngineLimits.hydratedFileBytes) {
      throw new ContentCollectionError(
        `Collection file "${formatAssetName(
          asset
        )}" exceeds the content size limit`
      );
    }
    const content = await this.readContent({ assetId: asset.id, asset });
    const bytes = await readBoundedBytes(
      content.data,
      contentEngineLimits.hydratedFileBytes
    );
    if (bytes.byteLength !== asset.size) {
      throw new ContentCollectionError(
        `Collection file "${formatAssetName(
          asset
        )}" content length does not match its metadata`
      );
    }
    return bytes;
  }

  async createUploadTicket(
    input: Omit<CreateUploadTicketInput, "projectId">,
    createId?: CreateId
  ) {
    await this.assertCanEdit();
    let existingReservedAsset: Asset | undefined;
    let isExistingTemplateRetry = false;
    const displayName = formatAssetName({
      name: input.filename,
      filename: input.displayFilename,
    });
    if (
      input.folderId !== undefined &&
      displayName === collectionConfigFilename
    ) {
      await this.assertCanConfigureCollections();
    }
    if (input.folderId !== undefined) {
      const assets = await this.dependencies.loadAssetsByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      );
      const configAsset = assets.find(
        (asset) =>
          asset.folderId === input.folderId &&
          formatAssetName(asset) === collectionConfigFilename
      );
      if (configAsset !== undefined) {
        if (
          displayName === collectionConfigFilename &&
          input.contentHash !== undefined
        ) {
          existingReservedAsset = configAsset;
        } else if (displayName.endsWith(".mdx") === false) {
          throw new AssetRepositoryConflictError(
            "Use New entry to add files to a collection folder"
          );
        } else {
          const config = parseCollectionConfig(
            decodeUtf8(await this.readCollectionAssetBytes(configAsset))
          );
          const templateAsset = assets.find(
            (asset) =>
              asset.folderId === input.folderId &&
              formatAssetName(asset) === config.template
          );
          if (displayName === config.template && templateAsset === undefined) {
            await this.assertCanConfigureCollections();
          } else if (
            displayName === config.template &&
            templateAsset !== undefined &&
            input.contentHash !== undefined
          ) {
            await this.assertCanConfigureCollections();
            existingReservedAsset = templateAsset;
            isExistingTemplateRetry = true;
          } else {
            throw new AssetRepositoryConflictError(
              "Use New entry to add files to a collection folder"
            );
          }
        }
      }
    }
    const ticket = await this.dependencies.createUploadTicket(
      { ...input, projectId: this.projectId },
      this.context,
      createId
    );
    if (existingReservedAsset !== undefined && ticket.deduplicated === false) {
      await this.getUploadErrorCleanup(ticket.assetId)?.(ticket.name);
      throw new AssetRepositoryConflictError(
        `Collection file "${displayName}" already exists with different content`
      );
    }
    if (ticket.deduplicated) {
      await this.validateCompletedCollectionUpload({
        asset: ticket.asset,
        allowCollectionFolder: false,
        allowInvalidTemplateRepair:
          existingReservedAsset === undefined || isExistingTemplateRetry,
        cleanupOnError: ticket.asset.id !== existingReservedAsset?.id,
      });
    }
    return ticket;
  }

  private async validateCompletedCollectionUpload({
    asset,
    assets,
    allowCollectionFolder,
    allowInvalidTemplateRepair = true,
    cleanupOnError = true,
  }: {
    asset: Asset;
    assets?: readonly Asset[];
    allowCollectionFolder: boolean;
    allowInvalidTemplateRepair?: boolean;
    cleanupOnError?: boolean;
  }): Promise<CollectionFolderDefinition | undefined> {
    if (asset.folderId === undefined) {
      return;
    }
    const projectAssets =
      assets ??
      (await this.dependencies.loadAssetsByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      ));
    const currentAssets = projectAssets.some(
      (candidate) => candidate.id === asset.id
    )
      ? projectAssets
      : [...projectAssets, asset];
    try {
      const isMissingTemplateRepair = await this.assertUploadAllowed({
        asset,
        assets: currentAssets,
        allowCollectionFolder,
      });
      if (isMissingTemplateRepair && isMdxFileAsset(asset) === false) {
        throw new ContentCollectionError(
          "Collection templates must be MDX files"
        );
      }
      if (formatAssetName(asset) === collectionConfigFilename) {
        parseCollectionConfig(
          decodeUtf8(await this.readCollectionAssetBytes(asset))
        );
      }
      const isCollectionFolder = currentAssets.some(
        (candidate) =>
          candidate.folderId === asset.folderId &&
          formatAssetName(candidate) === collectionConfigFilename
      );
      if (allowCollectionFolder && isCollectionFolder === false) {
        throw new ContentCollectionError(
          "Collection configuration not found after entry upload"
        );
      }
      if (
        isCollectionFolder &&
        (isMissingTemplateRepair === false ||
          allowInvalidTemplateRepair === false)
      ) {
        return await validateCollectionFolder({
          assets: currentAssets,
          folderId: asset.folderId,
          assetStore: this.assetStore,
        });
      }
    } catch (error) {
      if (cleanupOnError) {
        try {
          await this.dependencies.deleteAssetsWithClient(
            { projectId: this.projectId, ids: [asset.id] },
            this.context.postgrest.client
          );
        } catch {
          console.error("Failed to clean up an invalid uploaded asset");
        }
      }
      throw error;
    }
  }

  private async completeReservedUpload({
    name,
    data,
    assetInfoFallback,
    assetDataOverride,
    assetId,
    allowCollectionFolder,
  }: Parameters<AssetRepository["completeUpload"]>[0] & {
    allowCollectionFolder: boolean;
  }) {
    // Reserved upload names are not authorization credentials. Recheck the
    // derived owning project when the second upload step writes file content.
    await this.assertCanEdit();
    const reservations =
      await this.dependencies.loadAssetUploadReservationsByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      );
    const reservation = reservations.find(
      (candidate) =>
        (assetId === undefined && candidate.name === name) ||
        (assetId !== undefined &&
          candidate.id === assetId &&
          candidate.name === name)
    );
    if (reservation !== undefined) {
      try {
        await this.assertUploadAllowed({
          asset: reservation,
          allowCollectionFolder,
        });
      } catch (error) {
        if (reservation.status !== "UPLOADED") {
          const cleanup = this.getUploadErrorCleanup(reservation.id);
          await cleanup?.(reservation.name);
        }
        throw error;
      }
    }
    const asset = await this.dependencies.uploadFile(
      name,
      data,
      this.getWritableStore(),
      this.context,
      assetInfoFallback,
      assetDataOverride,
      this.getUploadErrorCleanup(assetId)
    );
    if (asset.folderId === undefined) {
      return asset;
    }
    const assets = await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
    await this.validateCompletedCollectionUpload({
      asset,
      assets,
      allowCollectionFolder,
    });
    return asset;
  }

  private async assertUploadAllowed({
    asset,
    assets,
    allowCollectionFolder,
  }: {
    asset: Pick<Asset, "id" | "name" | "filename" | "folderId">;
    assets?: readonly Asset[];
    allowCollectionFolder: boolean;
  }) {
    const displayName = formatAssetName(asset);
    if (
      asset.folderId !== undefined &&
      displayName === collectionConfigFilename
    ) {
      await this.assertCanConfigureCollections();
      return false;
    }
    if (allowCollectionFolder || asset.folderId === undefined) {
      return false;
    }
    const projectAssets =
      assets ??
      (await this.dependencies.loadAssetsByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      ));
    const configAsset = projectAssets.find(
      (candidate) =>
        candidate.folderId === asset.folderId &&
        formatAssetName(candidate) === collectionConfigFilename
    );
    if (configAsset === undefined) {
      return false;
    }
    if (displayName.endsWith(".mdx") === false) {
      throw new AssetRepositoryConflictError(
        "Use New entry to add files to a collection folder"
      );
    }
    const config = parseCollectionConfig(
      decodeUtf8(await this.readCollectionAssetBytes(configAsset))
    );
    const templateExists = projectAssets.some(
      (candidate) =>
        candidate.id !== asset.id &&
        candidate.folderId === asset.folderId &&
        formatAssetName(candidate) === config.template
    );
    if (displayName === config.template && templateExists === false) {
      await this.assertCanConfigureCollections();
      return true;
    }
    throw new AssetRepositoryConflictError(
      "Use New entry to add files to a collection folder"
    );
  }

  async completeUpload(
    input: Parameters<AssetRepository["completeUpload"]>[0]
  ) {
    return await this.completeReservedUpload({
      ...input,
      allowCollectionFolder: false,
    });
  }

  private async prepareCollectionAssetContent({
    currentAsset,
    extension,
    data,
  }: {
    currentAsset: Asset;
    extension?: string;
    data: ReadableStream<Uint8Array>;
  }) {
    if (currentAsset.folderId === undefined) {
      return data;
    }
    const isCollectionConfig =
      formatAssetName(currentAsset) === collectionConfigFilename;
    if (isCollectionConfig) {
      await this.assertCanConfigureCollections();
    }
    if (
      isCollectionConfig === false &&
      isMdxFileAsset(currentAsset) === false
    ) {
      return data;
    }
    const assets = await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
    const siblings = assets.filter(
      (asset) => asset.folderId === currentAsset.folderId
    );
    const configAsset = siblings.find(
      (asset) => formatAssetName(asset) === collectionConfigFilename
    );
    if (configAsset === undefined) {
      if (isCollectionConfig) {
        await this.assertCanConfigureCollections();
      }
      return data;
    }
    const reservedAssetIds = await getCollectionReservedAssetIds({
      assets,
      assetStore: this.assetStore,
      folderIds: new Set([currentAsset.folderId]),
    });
    if (isCollectionConfig === false && reservedAssetIds.has(currentAsset.id)) {
      await this.assertCanConfigureCollections();
    }
    const bytes = await readBoundedBytes(
      data,
      contentEngineLimits.hydratedFileBytes
    );
    const nextData = new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
    if (isCollectionConfig) {
      if (extension !== undefined && extension.toLowerCase() !== "json") {
        throw new AssetRepositoryConflictError(
          "collection.json must remain a JSON file"
        );
      }
      const nextConfig = parseCollectionConfig(decodeUtf8(bytes));
      const configAssets = siblings.filter(
        (asset) => formatAssetName(asset) === collectionConfigFilename
      );
      if (configAssets.length !== 1) {
        throw new AssetRepositoryConflictError(
          "A collection folder must contain exactly one collection.json"
        );
      }
      if (
        siblings.some(
          (asset) =>
            asset.id !== currentAsset.id && isMdxFileAsset(asset) === false
        )
      ) {
        throw new AssetRepositoryConflictError(
          "Move non-entry files into a subfolder"
        );
      }
      const templateAssets = siblings.filter(
        (asset) =>
          asset.id !== currentAsset.id &&
          formatAssetName(asset) === nextConfig.template &&
          isMdxFileAsset(asset)
      );
      const templateAsset = templateAssets[0];
      if (templateAsset === undefined) {
        throw new AssetRepositoryNotFoundError(
          `Collection template "${nextConfig.template}" not found`
        );
      }
      if (templateAssets.length !== 1) {
        throw new AssetRepositoryConflictError(
          `Collection template "${nextConfig.template}" is ambiguous`
        );
      }
      assertUniqueCollectionFilenames(siblings.map(formatAssetName));
      const templateBytes = await this.readCollectionAssetBytes(templateAsset);
      const templateDocument = await parseCollectionTemplate(
        decodeUtf8(templateBytes)
      );
      const templateValidationError = getCollectionTemplateValidationError(
        nextConfig,
        templateDocument.frontmatter.properties
      );
      if (templateValidationError !== undefined) {
        throw new AssetRepositoryConflictError(
          `Collection template "${nextConfig.template}": ${templateValidationError}`
        );
      }
      for (const entryAsset of siblings) {
        if (
          entryAsset.id === currentAsset.id ||
          entryAsset.id === templateAsset.id ||
          isMdxFileAsset(entryAsset) === false
        ) {
          continue;
        }
        const entryContent = await this.readContent({
          assetId: entryAsset.id,
          asset: entryAsset,
        });
        const { properties } = await extractMarkdownFrontmatter(
          entryContent.data
        );
        const validationError = getCollectionValidationError(
          nextConfig,
          properties
        );
        if (validationError !== undefined) {
          throw new AssetRepositoryConflictError(
            `Collection entry "${formatAssetName(
              entryAsset
            )}": ${validationError}`
          );
        }
        const slug = properties[nextConfig.slugField];
        if (slug !== getAssetDisplayNameParts(entryAsset).basename) {
          throw new AssetRepositoryConflictError(
            `Collection entry "${formatAssetName(
              entryAsset
            )}": The slug must match the entry filename`
          );
        }
      }
      return nextData;
    }
    if (
      isMdxFileAsset(currentAsset) &&
      extension !== undefined &&
      extension.toLowerCase() !== "mdx"
    ) {
      throw new AssetRepositoryConflictError(
        "Collection MDX files must remain MDX files"
      );
    }
    let config;
    try {
      config = parseCollectionConfig(
        decodeUtf8(await this.readCollectionAssetBytes(configAsset))
      );
    } catch (error) {
      if (error instanceof ContentCollectionError === false) {
        throw error;
      }
      return nextData;
    }
    if (formatAssetName(currentAsset) === config.template) {
      const { frontmatter } = await parseCollectionTemplate(decodeUtf8(bytes));
      const validationError = getCollectionTemplateValidationError(
        config,
        frontmatter.properties
      );
      if (validationError !== undefined) {
        throw new AssetRepositoryConflictError(
          `Collection template: ${validationError}`
        );
      }
      return nextData;
    }
    if (isMdxFileAsset(currentAsset) === false) {
      return nextData;
    }
    const nextFrontmatter = await extractMarkdownFrontmatter(bytes);
    const currentContent = await this.readContent({
      assetId: currentAsset.id,
      asset: currentAsset,
    });
    const currentFrontmatter = await extractMarkdownFrontmatter(
      currentContent.data
    );
    const frontmatterChanged =
      serializeJsonDeterministically(nextFrontmatter.properties) !==
      serializeJsonDeterministically(currentFrontmatter.properties);
    const validationError = getCollectionValidationError(
      config,
      nextFrontmatter.properties
    );
    if (validationError !== undefined && frontmatterChanged) {
      throw new AssetRepositoryConflictError(validationError);
    }
    if (frontmatterChanged) {
      const slug = nextFrontmatter.properties[config.slugField];
      const filenameSlug = getAssetDisplayNameParts(currentAsset).basename;
      if (slug !== filenameSlug) {
        throw new AssetRepositoryConflictError(
          "The slug must match the entry filename"
        );
      }
    }
    return nextData;
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
        prepareData: ({ asset, data }) =>
          this.prepareCollectionAssetContent({
            currentAsset: asset,
            extension,
            data,
          }),
      },
      this.getWritableStore(),
      this.context
    );
    return asset;
  }

  async updateMetadata(assetId: Asset["id"], values: AssetMetadataUpdate) {
    await this.assertCanEdit();
    const assets = await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
    const currentAsset = assets.find((asset) => asset.id === assetId);
    const reservedAssetIds = await getCollectionReservedAssetIds({
      assets,
      assetStore: this.assetStore,
      folderIds: new Set(
        [currentAsset?.folderId, values.folderId].filter(
          (folderId): folderId is string => typeof folderId === "string"
        )
      ),
    });
    const nextFilename =
      values.filename === undefined
        ? currentAsset?.filename
        : (values.filename ?? undefined);
    const nextDisplayName =
      currentAsset === undefined
        ? undefined
        : formatAssetName({
            name: currentAsset.name,
            filename: nextFilename,
          });
    const nextFolderId =
      values.folderId === null
        ? undefined
        : (values.folderId ?? currentAsset?.folderId);
    if (
      reservedAssetIds.has(assetId) ||
      (nextFolderId !== undefined &&
        nextDisplayName === collectionConfigFilename)
    ) {
      await this.assertCanConfigureCollections();
    }
    if (typeof values.folderId === "string" || values.filename !== undefined) {
      if (
        values.filename !== undefined &&
        currentAsset?.folderId !== undefined &&
        values.filename !== getAssetDisplayNameParts(currentAsset).basename &&
        isMdxFileAsset(currentAsset) &&
        assets.some(
          (asset) =>
            asset.folderId === currentAsset.folderId &&
            formatAssetName(asset) === collectionConfigFilename
        )
      ) {
        throw new AssetRepositoryConflictError(
          "Collection MDX filenames cannot be changed"
        );
      }
      if (
        typeof values.folderId === "string" &&
        currentAsset?.folderId !== values.folderId &&
        assets.some(
          (asset) =>
            asset.folderId === values.folderId &&
            formatAssetName(asset) === collectionConfigFilename
        )
      ) {
        throw new AssetRepositoryConflictError(
          "Use New entry to add files to a collection folder"
        );
      }
    }
    if (currentAsset !== undefined) {
      const nextAsset: Asset = {
        ...currentAsset,
        ...(values.filename === undefined
          ? {}
          : values.filename === null
            ? { filename: undefined }
            : { filename: values.filename }),
        ...(values.folderId === undefined
          ? {}
          : values.folderId === null
            ? { folderId: undefined }
            : { folderId: values.folderId }),
      };
      const projectedAssets = assets.map((asset) =>
        asset.id === currentAsset.id ? nextAsset : asset
      );
      if (
        nextAsset.folderId !== undefined &&
        formatAssetName(nextAsset) === collectionConfigFilename &&
        (currentAsset.folderId !== nextAsset.folderId ||
          formatAssetName(currentAsset) !== collectionConfigFilename)
      ) {
        await validateCollectionFolder({
          assets: projectedAssets,
          folderId: nextAsset.folderId,
          assetStore: this.assetStore,
        });
      }
      if (
        reservedAssetIds.has(currentAsset.id) &&
        currentAsset.folderId !== undefined &&
        currentAsset.folderId !== nextAsset.folderId &&
        projectedAssets.some(
          (asset) =>
            asset.folderId === currentAsset.folderId &&
            formatAssetName(asset) === collectionConfigFilename
        )
      ) {
        await validateCollectionFolder({
          assets: projectedAssets,
          folderId: currentAsset.folderId,
          assetStore: this.assetStore,
        });
      }
    }
    const asset = await this.dependencies.updateAssetMetadataWithClient(
      { projectId: this.projectId, assetId, values },
      this.context.postgrest.client
    );

    return asset;
  }

  async delete(ids: Asset["id"][]) {
    await this.assertCanEdit();
    const assets = await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
    const reservedAssetIds = await getCollectionReservedAssetIds({
      assets,
      assetStore: this.assetStore,
      folderIds: new Set(
        assets.flatMap((asset) =>
          ids.includes(asset.id) && asset.folderId !== undefined
            ? [asset.folderId]
            : []
        )
      ),
    });
    if (ids.some((id) => reservedAssetIds.has(id))) {
      await this.assertCanConfigureCollections();
    }
    const nextAssets = assets.filter(
      (asset) => ids.includes(asset.id) === false
    );
    const affectedFolderIds = new Set(
      assets.flatMap((asset) =>
        ids.includes(asset.id) &&
        reservedAssetIds.has(asset.id) &&
        asset.folderId !== undefined
          ? [asset.folderId]
          : []
      )
    );
    for (const folderId of affectedFolderIds) {
      if (
        nextAssets.some(
          (asset) =>
            asset.folderId === folderId &&
            formatAssetName(asset) === collectionConfigFilename
        )
      ) {
        await validateCollectionFolder({
          assets: nextAssets,
          folderId,
          assetStore: this.assetStore,
        });
      }
    }
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

  async createCollectionEntry({
    folderId,
    values,
  }: {
    folderId: string;
    values: Readonly<Record<string, unknown>>;
  }) {
    await this.assertCanEdit();
    const [folders, assets] = await Promise.all([
      this.dependencies.loadAssetFoldersByProjectWithClient(
        this.projectId,
        this.context.postgrest.client,
        [folderId]
      ),
      this.dependencies.loadAssetsByProjectWithClient(
        this.projectId,
        this.context.postgrest.client
      ),
    ]);
    if (folders.length === 0) {
      throw new AssetRepositoryNotFoundError("Asset folder not found");
    }
    const siblings = assets.filter((asset) => asset.folderId === folderId);
    const configAssets = siblings.filter(
      (asset) => formatAssetName(asset) === collectionConfigFilename
    );
    const configAsset = configAssets[0];
    if (configAsset === undefined) {
      throw new AssetRepositoryNotFoundError(
        "Collection configuration not found"
      );
    }
    if (configAssets.length !== 1) {
      throw new AssetRepositoryConflictError(
        "A collection folder must contain exactly one collection.json"
      );
    }
    const config = parseCollectionConfig(
      decodeUtf8(await this.readCollectionAssetBytes(configAsset))
    );
    const templateAssets = siblings.filter(
      (asset) =>
        formatAssetName(asset) === config.template && isMdxFileAsset(asset)
    );
    const templateAsset = templateAssets[0];
    if (templateAsset === undefined) {
      throw new AssetRepositoryNotFoundError(
        `Collection template "${config.template}" not found`
      );
    }
    if (templateAssets.length !== 1) {
      throw new AssetRepositoryConflictError(
        `Collection template "${config.template}" is ambiguous`
      );
    }
    assertUniqueCollectionFilenames(siblings.map(formatAssetName));
    if (
      siblings.some(
        (asset) =>
          asset.id !== configAsset.id &&
          asset.id !== templateAsset.id &&
          isMdxFileAsset(asset) === false
      )
    ) {
      throw new AssetRepositoryConflictError(
        "Move non-entry files into a subfolder"
      );
    }
    const entry = await createCollectionEntry({
      config,
      templateSource: decodeUtf8(
        await this.readCollectionAssetBytes(templateAsset)
      ),
      values,
      // Persistence performs the collision check so an exact retry can return
      // the entry created by the first request instead of reporting a false
      // conflict after the response was lost.
      existingFilenames: [],
    });
    if (entry.filename.length > assetResourceLimits.assetFilenameCharacters) {
      throw new AssetRepositoryConflictError(
        "The generated entry filename is too long"
      );
    }
    const existingAsset = siblings.find(
      (asset) =>
        formatAssetName(asset).toLowerCase() === entry.filename.toLowerCase()
    );
    if (existingAsset !== undefined) {
      if (
        existingAsset.id === configAsset.id ||
        existingAsset.id === templateAsset.id
      ) {
        throw new AssetRepositoryConflictError(
          `An entry named "${entry.filename}" already exists`
        );
      }
      const existingSource = decodeUtf8(
        await this.readCollectionAssetBytes(existingAsset)
      );
      if (existingSource === entry.source) {
        return existingAsset;
      }
      throw new AssetRepositoryConflictError(
        `An entry named "${entry.filename}" already exists`
      );
    }
    const bytes = new TextEncoder().encode(entry.source);
    const contentHash = createHash("sha256").update(bytes).digest("hex");
    const ticket = await this.dependencies.createUploadTicket(
      {
        projectId: this.projectId,
        type: "file",
        filename: entry.filename,
        displayFilename: entry.filename.slice(0, -".mdx".length),
        folderId,
        contentHash,
      },
      this.context
    );
    if (ticket.deduplicated) {
      if (
        ticket.asset.id !== configAsset.id &&
        ticket.asset.id !== templateAsset.id &&
        ticket.asset.folderId === folderId &&
        formatAssetName(ticket.asset).toLowerCase() ===
          entry.filename.toLowerCase()
      ) {
        const definition = await this.validateCompletedCollectionUpload({
          asset: ticket.asset,
          allowCollectionFolder: true,
        });
        if (
          definition !== undefined &&
          (ticket.asset.id === definition.configAsset.id ||
            ticket.asset.id === definition.templateAsset.id)
        ) {
          throw new AssetRepositoryConflictError(
            `An entry named "${entry.filename}" already exists`
          );
        }
        return ticket.asset;
      }
      throw new AssetRepositoryConflictError(
        "Entry upload was deduplicated incorrectly"
      );
    }
    let reservations: Awaited<
      ReturnType<typeof loadAssetUploadReservationsByProjectWithClient>
    >;
    try {
      reservations =
        await this.dependencies.loadAssetUploadReservationsByProjectWithClient(
          this.projectId,
          this.context.postgrest.client
        );
    } catch (error) {
      await this.getUploadErrorCleanup(ticket.assetId)?.(ticket.name);
      throw error;
    }
    const matchingReservations = reservations
      .filter(
        (candidate) =>
          candidate.folderId === folderId &&
          candidate.filename?.toLowerCase() ===
            entry.filename.slice(0, -".mdx".length).toLowerCase()
      )
      .sort(
        (left, right) =>
          left.createdAt.localeCompare(right.createdAt) ||
          left.id.localeCompare(right.id)
      );
    const duplicateReservation =
      matchingReservations[0] !== undefined &&
      matchingReservations[0].id !== ticket.assetId;
    if (duplicateReservation) {
      await this.getUploadErrorCleanup(ticket.assetId)?.(ticket.name);
      throw new AssetRepositoryConflictError(
        `An entry named "${entry.filename}" already exists`
      );
    }
    return await this.completeReservedUpload({
      name: ticket.name,
      data: new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      }),
      assetInfoFallback: undefined,
      assetId: ticket.assetId,
      allowCollectionFolder: true,
    });
  }

  async updateCollectionConfigAndTemplateName({
    folderId,
    configAssetId,
    expectedConfigName,
    templateAssetId,
    expectedTemplateFilename,
    templateFilename,
    configSource,
  }: {
    folderId: string;
    configAssetId: Asset["id"];
    expectedConfigName: Asset["name"];
    templateAssetId: Asset["id"];
    expectedTemplateFilename: Asset["filename"];
    templateFilename: string;
    configSource: string;
  }) {
    await this.assertCanConfigureCollections();
    if (
      templateFilename.length === 0 ||
      templateFilename.length > assetResourceLimits.assetFilenameCharacters
    ) {
      throw new AssetRepositoryConflictError(
        "Collection template name is invalid"
      );
    }
    const assets = await this.dependencies.loadAssetsByProjectWithClient(
      this.projectId,
      this.context.postgrest.client
    );
    const configAsset = assets.find(
      (asset) =>
        asset.id === configAssetId &&
        asset.folderId === folderId &&
        formatAssetName(asset) === collectionConfigFilename
    );
    if (configAsset === undefined) {
      throw new AssetRepositoryNotFoundError(
        "Collection configuration not found"
      );
    }
    if (configAsset.name !== expectedConfigName) {
      throw new AssetRepositoryConflictError(
        "Collection configuration changed while settings were being saved"
      );
    }
    const currentConfig = parseCollectionConfig(
      decodeUtf8(await this.readCollectionAssetBytes(configAsset))
    );
    const templateAsset = assets.find(
      (asset) =>
        asset.id === templateAssetId &&
        asset.folderId === folderId &&
        formatAssetName(asset) === currentConfig.template &&
        isMdxFileAsset(asset)
    );
    if (templateAsset === undefined) {
      throw new AssetRepositoryNotFoundError("Collection template not found");
    }
    if (templateAsset.filename !== expectedTemplateFilename) {
      throw new AssetRepositoryConflictError(
        "Collection template changed while settings were being saved"
      );
    }
    const nextTemplateAsset = { ...templateAsset, filename: templateFilename };
    const nextConfig = parseCollectionConfig(configSource);
    if (nextConfig.template !== formatAssetName(nextTemplateAsset)) {
      throw new AssetRepositoryConflictError(
        "Collection configuration does not reference the renamed template"
      );
    }
    const configBytes = new TextEncoder().encode(configSource);
    const projectedAssets = assets.map((asset) => {
      if (asset.id === configAsset.id) {
        return { ...asset, size: configBytes.byteLength };
      }
      return asset.id === templateAsset.id ? nextTemplateAsset : asset;
    });
    const projectedAssetStore: AssetObjectReader = {
      readFile: async (name, range) => {
        if (name !== configAsset.name) {
          return await this.assetStore.readFile(name, range);
        }
        const bytes =
          range === undefined
            ? configBytes
            : configBytes.subarray(range.offset, range.offset + range.length);
        return {
          data: {
            [Symbol.asyncIterator]: async function* () {
              yield bytes;
            },
          },
          contentLength: bytes.byteLength,
        };
      },
    };
    await validateCollectionFolder({
      assets: projectedAssets,
      folderId,
      assetStore: projectedAssetStore,
    });

    const renamedTemplate =
      await this.dependencies.updateAssetFilenameIfCurrentWithClient(
        {
          projectId: this.projectId,
          assetId: templateAsset.id,
          expectedFilename: expectedTemplateFilename,
          filename: templateFilename,
        },
        this.context.postgrest.client
      );
    if (renamedTemplate === undefined) {
      throw new AssetRepositoryConflictError(
        "Collection template changed while settings were being saved"
      );
    }
    try {
      const updatedConfig = await this.updateContent({
        assetId: configAsset.id,
        expectedName: configAsset.name,
        data: new ReadableStream({
          start(controller) {
            controller.enqueue(configBytes);
            controller.close();
          },
        }),
      });
      return { configAsset: updatedConfig, templateAsset: renamedTemplate };
    } catch (error) {
      const currentAssets =
        await this.dependencies.loadAssetsByProjectWithClient(
          this.projectId,
          this.context.postgrest.client
        );
      const currentConfigAsset = currentAssets.find(
        (asset) => asset.id === configAsset.id && asset.folderId === folderId
      );
      const currentTemplateAsset = currentAssets.find(
        (asset) => asset.id === templateAsset.id && asset.folderId === folderId
      );
      if (
        currentConfigAsset === undefined ||
        currentTemplateAsset === undefined
      ) {
        throw new Error(
          "Collection settings failed and the current collection state could not be verified",
          { cause: error }
        );
      }
      const currentConfigSource = decodeUtf8(
        await this.readCollectionAssetBytes(currentConfigAsset)
      );
      const currentTemplateName = formatAssetName(currentTemplateAsset);
      if (
        currentConfigSource === configSource &&
        currentTemplateName === formatAssetName(nextTemplateAsset)
      ) {
        return {
          configAsset: currentConfigAsset,
          templateAsset: currentTemplateAsset,
        };
      }
      let currentConfig;
      try {
        currentConfig = parseCollectionConfig(currentConfigSource);
      } catch {
        throw new Error(
          "Collection settings failed and the current collection state could not be verified",
          { cause: error }
        );
      }
      if (
        currentConfig.template !== formatAssetName(templateAsset) ||
        currentTemplateAsset.filename !== templateFilename
      ) {
        throw error;
      }
      const restoredTemplate =
        await this.dependencies.updateAssetFilenameIfCurrentWithClient(
          {
            projectId: this.projectId,
            assetId: templateAsset.id,
            expectedFilename: templateFilename,
            filename: templateAsset.filename,
          },
          this.context.postgrest.client
        );
      if (restoredTemplate === undefined) {
        throw new Error(
          "Collection settings failed and the template name could not be restored",
          { cause: error }
        );
      }
      throw error;
    }
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

  async validateCollections(assets: readonly Asset[]) {
    await this.assertCanBuild();
    for (const folderId of getCollectionFolderIds(assets)) {
      await validateCollectionFolder({
        assets,
        folderId,
        assetStore: this.assetStore,
      });
    }
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
    const preparationIssues: PreparedDiagnosticIssue[] = [];
    const preservePreparationIssues = async <Value>(
      operation: () => Promise<Value>
    ) => {
      try {
        return await operation();
      } catch (error) {
        if (error instanceof DocumentSourceCompilationAggregateError) {
          const diagnostics = error.errors.flatMap((nestedError) => {
            const diagnostic = getAssetQueryErrorDiagnosticIssue({
              error: nestedError,
            });
            return diagnostic === undefined ? [] : [diagnostic];
          });
          if (diagnostics.length === error.errors.length) {
            throw new DocumentSourceDiagnosticsError([
              ...preparationIssues,
              ...diagnostics,
            ]);
          }
        }
        const diagnostic = getAssetQueryErrorDiagnosticIssue({ error });
        if (diagnostic !== undefined) {
          throw new DocumentSourceDiagnosticsError([
            ...new Map(
              [...preparationIssues, diagnostic].map((issue) => [
                getDiagnosticIssueKey(issue),
                issue,
              ])
            ).values(),
          ]);
        }
        if (
          error instanceof DocumentSourceDiagnosticsError === false ||
          preparationIssues.length === 0
        ) {
          throw error;
        }
        const diagnostics = [
          ...new Map(
            [...preparationIssues, ...error.diagnostics].map((diagnostic) => [
              getDiagnosticIssueKey(diagnostic),
              diagnostic,
            ])
          ).values(),
        ];
        throw new DocumentSourceDiagnosticsError(diagnostics, error.scope);
      }
    };
    const source = this.createContentSource(
      strict,
      contentBytesCache,
      preparationIssues
    );
    const compile = async (
      entries: Parameters<typeof createAssetIndex>[0]["entries"],
      assetReferences: Parameters<
        typeof createAssetIndex
      >[0]["assetReferences"],
      assetValueReferences: Parameters<
        typeof createAssetIndex
      >[0]["assetValueReferences"],
      documentGraph: Parameters<typeof createAssetIndex>[0]["documentGraph"],
      assetReferenceIssues: Awaited<
        ReturnType<typeof materializeContentSource>
      >["assetReferenceIssues"],
      sourceIssues: Awaited<
        ReturnType<typeof materializeContentSource>
      >["sourceIssues"]
    ) => {
      const artifact = await this.measurePerformance(
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
      diagnosticIssuesByArtifact.set(
        artifact,
        getPreparedDiagnosticIssues({
          entries,
          assetReferenceIssues,
          sourceIssues,
          preparationIssues,
        })
      );
      diagnosticPathsByArtifact.set(
        artifact,
        new Map(
          entries.map(({ assetId, document }) => [assetId, document.path])
        )
      );
      return artifact;
    };
    if (this.compilationCache === undefined) {
      emitAssetQueryPerformanceEvent(this.onPerformanceEvent, {
        type: "compilation-cache",
        status: "disabled",
      });
      const {
        entries,
        assetReferences,
        assetValueReferences,
        documentGraph,
        assetReferenceIssues,
        sourceIssues,
      } = await preservePreparationIssues(() =>
        materializeContentSource({
          source,
          plan: requirements,
          maximumContentBytes: this.contentDatabaseMaxBytes,
          onPerformanceEvent: this.onPerformanceEvent,
          performanceNow: this.dependencies.performanceNow,
        })
      );
      return await compile(
        entries,
        assetReferences,
        assetValueReferences,
        documentGraph,
        assetReferenceIssues,
        sourceIssues
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
              assetReferenceIssues,
              sourceIssues,
            } = await preservePreparationIssues(() =>
              materializeContentSnapshot({
                snapshot,
                plan: requirements,
                maximumContentBytes: this.contentDatabaseMaxBytes,
                onPerformanceEvent: this.onPerformanceEvent,
                performanceNow: this.dependencies.performanceNow,
              })
            );
            return await compile(
              entries,
              assetReferences,
              assetValueReferences,
              documentGraph,
              assetReferenceIssues,
              sourceIssues
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
    contentBytesCache = new RequestContentBytesCache(),
    preparationIssues: PreparedDiagnosticIssue[] = []
  ): ContentSource {
    const readFile = this.assetStore.readFile;
    const onPerformanceEvent = this.onPerformanceEvent;
    const performanceNow = this.dependencies.performanceNow;
    const loadBaseEntries = () =>
      this.dependencies.loadCanonicalAssetBaseEntries({
        client: this.context.postgrest.client,
        projectId: this.projectId,
      });
    const excludeCollectionFiles = async (
      entries: Awaited<ReturnType<typeof loadCanonicalAssetBaseEntries>>
    ) => {
      const reservedAssetIds = new Set<string>();
      for (const entry of entries) {
        if (entry.document.name !== collectionConfigFilename) {
          continue;
        }
        const folderId = entry.document.folderId;
        if (folderId === undefined) {
          continue;
        }
        const siblings = entries.filter(
          (candidate) => candidate.document.folderId === folderId
        );
        reservedAssetIds.add(entry.assetId);
        if (
          siblings.filter(
            (candidate) => candidate.document.name === collectionConfigFilename
          ).length !== 1
        ) {
          throw new ContentCollectionError(
            "A collection folder must contain exactly one collection.json"
          );
        }
        if (entry.document.size > contentEngineLimits.hydratedFileBytes) {
          throw new ContentCollectionError(
            "collection.json exceeds the content size limit"
          );
        }
        try {
          const response = await readFile(entry.document.contentRef);
          const bytes = await readBoundedBytes(
            response.data,
            contentEngineLimits.hydratedFileBytes
          );
          if (bytes.byteLength !== entry.document.size) {
            throw new ContentCollectionError(
              "collection.json content length does not match its metadata"
            );
          }
          const config = parseCollectionConfig(decodeUtf8(bytes));
          const templates = siblings.filter(
            (candidate) => candidate.document.name === config.template
          );
          const template = templates[0];
          if (template === undefined) {
            throw new ContentCollectionError(
              `Collection template "${config.template}" not found`
            );
          }
          if (templates.length !== 1) {
            throw new ContentCollectionError(
              `Collection template "${config.template}" is ambiguous`
            );
          }
          assertUniqueCollectionFilenames(
            siblings.map((candidate) => candidate.document.name)
          );
          if (template.document.size > contentEngineLimits.hydratedFileBytes) {
            throw new ContentCollectionError(
              `Collection template "${config.template}" exceeds the content size limit`
            );
          }
          const templateResponse = await readFile(template.document.contentRef);
          const templateBytes = await readBoundedBytes(
            templateResponse.data,
            contentEngineLimits.hydratedFileBytes
          );
          if (templateBytes.byteLength !== template.document.size) {
            throw new ContentCollectionError(
              `Collection template "${config.template}" content length does not match its metadata`
            );
          }
          let templateDocument;
          try {
            templateDocument = await parseMdxDocument({
              source: decodeUtf8(templateBytes),
            });
          } catch (error) {
            const details = error instanceof Error ? `: ${error.message}` : "";
            throw new ContentCollectionError(
              `Collection template is invalid${details}`,
              { cause: error }
            );
          }
          const templateValidationError = getCollectionTemplateValidationError(
            config,
            templateDocument.frontmatter.properties
          );
          if (templateValidationError !== undefined) {
            throw new ContentCollectionError(
              `Collection template "${config.template}": ${templateValidationError}`
            );
          }
          reservedAssetIds.add(template.assetId);
          for (const candidate of siblings) {
            if (
              candidate.assetId === entry.assetId ||
              candidate.assetId === template.assetId
            ) {
              continue;
            }
            if (candidate.document.extension.toLowerCase() !== "mdx") {
              throw new ContentCollectionError(
                "Move non-entry files into a subfolder"
              );
            }
            let properties: Record<string, unknown>;
            try {
              const response = await readFile(
                candidate.document.contentRef,
                candidate.document.size === 0
                  ? undefined
                  : { offset: 0, length: candidate.document.size }
              );
              properties = (await extractMarkdownFrontmatter(response.data))
                .properties;
            } catch (error) {
              const details =
                error instanceof Error ? `: ${error.message}` : "";
              throw new ContentCollectionError(
                `Collection entry "${candidate.document.name}" is invalid${details}`,
                { cause: error }
              );
            }
            const validationError = getCollectionValidationError(
              config,
              properties
            );
            if (validationError !== undefined) {
              throw new ContentCollectionError(
                `Collection entry "${candidate.document.name}": ${validationError}`
              );
            }
            if (properties[config.slugField] !== candidate.document.key) {
              throw new ContentCollectionError(
                `Collection entry "${candidate.document.name}": The slug must match the entry filename`
              );
            }
          }
        } catch (error) {
          if (error instanceof ContentCollectionError) {
            throw error;
          }
          throw new ContentCollectionError(
            "Collection configuration could not be read"
          );
        }
      }
      return entries.filter(
        (entry) => reservedAssetIds.has(entry.assetId) === false
      );
    };
    return {
      openSnapshot: async () => {
        // Each snapshot must report only issues observed during its own
        // preparation, including when uncached materialization retries.
        preparationIssues.length = 0;
        const allBaseEntries = await loadBaseEntries();
        const revision = await computeCanonicalAssetRevision(allBaseEntries);
        const baseEntries = await excludeCollectionFiles(allBaseEntries);
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
              preparationIssues,
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
    preparationIssues,
  }: {
    baseEntries: Awaited<ReturnType<typeof loadCanonicalAssetBaseEntries>>;
    requirements?: ContentCompilationPlan;
    strict: boolean;
    maximumContentBytes?: number;
    contentBytesCache: RequestContentBytesCache;
    preparationIssues: PreparedDiagnosticIssue[];
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
          const pathsById = new Map(
            baseEntries.map(({ assetId, document }) => [assetId, document.path])
          );
          for (const issue of result.issues) {
            preparationIssues.push({
              severity: "warning",
              phase: "metadata",
              code: "METADATA_PREPARATION_FAILED",
              message: issue.message,
              assetId: issue.assetId,
              path: pathsById.get(issue.assetId) ?? issue.storageName,
            });
          }
          return await this.dependencies.loadCanonicalAssetFileEntries({
            client: this.context.postgrest.client,
            projectId: this.projectId,
            assetIds: candidateAssetIds,
          });
        }
      );
    }
    const byteSourceDiagnostics: PreparedDiagnosticIssue[] = [];
    const preparedEntries = await this.measurePerformance(
      "compiler-entries",
      async () =>
        await prepareContentCompilerEntries({
          entries,
          plan: requirements,
          loadContent: async (entry) => {
            let bytes = contentBytesCache.get({
              contentRef: entry.document.contentRef,
              revision: entry.revision,
            });
            if (bytes === undefined) {
              const startedAt = this.dependencies.performanceNow();
              try {
                const response = await this.assetStore.readFile(
                  entry.document.contentRef,
                  { offset: 0, length: entry.document.size }
                );
                bytes = await readBoundedBytes(
                  response.data,
                  entry.document.size
                );
                if (bytes.byteLength !== entry.document.size) {
                  throw new Error(
                    "Asset content does not match its canonical size"
                  );
                }
              } catch (error) {
                const message =
                  error instanceof Error && error.message !== ""
                    ? error.message
                    : "Selected asset content could not be read";
                if (strict) {
                  throw new AssetIndexPreparationError([
                    {
                      assetId: entry.assetId,
                      storageName: entry.document.contentRef,
                      revision: entry.revision,
                      message,
                    },
                  ]);
                }
                preparationIssues.push({
                  severity: "warning",
                  phase: "source",
                  code: "CONTENT_READ_FAILED",
                  message,
                  assetId: entry.assetId,
                  path: entry.document.path,
                });
                return;
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
            }
            const documentFormat = getDocumentFormatByContentType(
              entry.document.mimeType
            );
            if (documentFormat === "markdown" || documentFormat === "mdx") {
              const validation = await validateTextAssetSourceBytes({
                source: bytes,
                format: documentFormat === "markdown" ? "md" : "mdx",
              });
              byteSourceDiagnostics.push(
                ...validation.diagnostics.map((diagnostic) => ({
                  severity: diagnostic.severity,
                  phase: "source" as const,
                  code: diagnostic.code,
                  message: diagnostic.message,
                  assetId: entry.assetId,
                  path: entry.document.path,
                  ...("nodeType" in diagnostic &&
                  diagnostic.nodeType !== undefined
                    ? { nodeType: diagnostic.nodeType }
                    : {}),
                  ...("reason" in diagnostic && diagnostic.reason !== undefined
                    ? { reason: diagnostic.reason }
                    : {}),
                  ...("sourceRange" in diagnostic &&
                  diagnostic.sourceRange !== undefined
                    ? {
                        line: diagnostic.sourceRange.start.line,
                        column: diagnostic.sourceRange.start.column,
                        sourceRange: diagnostic.sourceRange,
                      }
                    : "line" in diagnostic && diagnostic.line !== undefined
                      ? {
                          line: diagnostic.line,
                          ...(diagnostic.column === undefined
                            ? {}
                            : { column: diagnostic.column }),
                        }
                      : {}),
                }))
              );
              return validation.source;
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
              preparationIssues.push({
                severity: "warning",
                phase: "metadata",
                code: "CONTENT_DECODING_FAILED",
                message: "Selected asset content is not valid UTF-8",
                assetId: entry.assetId,
                path: entry.document.path,
              });
              return;
            }
            return content;
          },
          maximumContentBytes,
        })
    );
    preparationIssues.push(...byteSourceDiagnostics);
    if (byteSourceDiagnostics.some(({ severity }) => severity === "error")) {
      throw new DocumentSourceDiagnosticsError(byteSourceDiagnostics);
    }
    return preparedEntries;
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
    const executeDocumentGraphQuery = async <Result>({
      artifact,
      operation,
    }: {
      artifact: ContentArtifactV1;
      operation: () => Promise<Result>;
    }) => {
      try {
        return await operation();
      } catch (error) {
        const diagnostic = getAssetQueryErrorDiagnosticIssue({
          error,
          pathsByAssetId: diagnosticPathsByArtifact.get(artifact),
        });
        if (diagnostic !== undefined) {
          throw new DocumentSourceDiagnosticsError([diagnostic]);
        }
        throw error;
      }
    };
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
    const contentRevisions = new Map(
      index.documents.flatMap((document) =>
        typeof document.contentRef === "string" &&
        typeof document.revision === "string"
          ? [[document.contentRef, document.revision] as const]
          : []
      )
    );
    const readQueryContent = async (
      contentRef: string,
      range?: AssetReadRange
    ) => {
      const revision = contentRevisions.get(contentRef);
      const cachedBytes =
        revision === undefined
          ? undefined
          : contentBytesCache.get({ contentRef, revision });
      if (cachedBytes === undefined) {
        return await this.assetStore.readFile(contentRef, range);
      }
      const bytes =
        range === undefined
          ? cachedBytes
          : cachedBytes.subarray(range.offset, range.offset + range.length);
      return {
        contentLength: bytes.byteLength,
        data: {
          async *[Symbol.asyncIterator]() {
            yield bytes;
          },
        },
      };
    };
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
    const executeData = () =>
      this.measurePerformance("document-resolution", () =>
        executeDocumentGraphQuery({
          artifact: index,
          operation: () =>
            database.queryWithDocumentGraph({
              request,
              readContent: readQueryContent,
              runtimeAssets,
              load: this.createQueryDocumentLoader(contentBytesCache),
              signal,
              onEvent: this.onDocumentGraphEvent,
            }),
        })
      );
    if (includeDiagnostics === false) {
      const data = await executeData();
      signal?.throwIfAborted();
      return { data };
    }
    const diagnosticMatchQuery = createAssetQueryDiagnosticMatchQuery(query);
    const diagnosticMatchPlan = createContentCompilationPlan([
      createLiteralContentCompilationQuery({
        id: "preview-diagnostic-matches",
        query: diagnosticMatchQuery,
      }),
    ]);
    const diagnosticMatchIndex = await this.prepareIndexAfterAuthorization(
      diagnosticMatchPlan,
      false,
      contentBytesCache
    );
    signal?.throwIfAborted();
    const diagnosticRuntimeAssets = await this.measurePerformance(
      "runtime-assets",
      () =>
        this.loadQueryRuntimeAssets({
          artifact: diagnosticMatchIndex,
          plan: diagnosticMatchPlan,
        })
    );
    signal?.throwIfAborted();
    const diagnosticMatchResult = await this.measurePerformance(
      "document-resolution",
      () =>
        executeDocumentGraphQuery({
          artifact: diagnosticMatchIndex,
          operation: () =>
            getContentDatabaseForArtifact(
              diagnosticMatchIndex
            ).queryWithDocumentGraph({
              request: { query: diagnosticMatchQuery },
              readContent: this.assetStore.readFile,
              runtimeAssets: diagnosticRuntimeAssets,
              load: this.createQueryDocumentLoader(contentBytesCache),
              signal,
              onEvent: this.onDocumentGraphEvent,
            }),
        })
    );
    const matchingIds = getAssetQueryResultIds(diagnosticMatchResult);
    const matchingIdSet = new Set(matchingIds);
    const queryIndexIssues = [
      ...(diagnosticIssuesByArtifact.get(queryIndex) ?? []),
      ...(diagnosticIssuesByArtifact.get(diagnosticMatchIndex) ?? []),
    ].filter((issue) => matchingIdSet.has(issue.assetId));
    let sourceDiagnosticsIndex = queryIndex;
    if (matchingIds.length > 0) {
      const sourceDiagnosticsPlan = createContentCompilationPlan([
        createLiteralContentCompilationQuery({
          id: "preview-source-diagnostics",
          query: {
            result: "many",
            where: {
              all: [
                { field: ["id"], operator: "in", value: matchingIds },
                {
                  field: ["extension"],
                  operator: "in",
                  value: ["md", "markdown", "mdx"],
                },
              ],
            },
            sort: [],
            limit: matchingIds.length,
            offset: 0,
            output: {
              mode: "fields",
              includeMetadata: false,
              fields: [["id"]],
            },
            content: { mode: "full" },
          },
        }),
      ]);
      try {
        sourceDiagnosticsIndex = await this.prepareIndexAfterAuthorization(
          sourceDiagnosticsPlan,
          false,
          contentBytesCache
        );
      } catch (error) {
        if (error instanceof DocumentSourceDiagnosticsError) {
          const diagnostics = [
            ...queryIndexIssues.map((issue) => ({
              ...issue,
              scope: "query" as const,
            })),
            ...error.diagnostics.map((diagnostic) => ({
              ...diagnostic,
              scope: "query" as const,
              phase: diagnostic.phase ?? ("source" as const),
            })),
          ];
          throw new DocumentSourceDiagnosticsError([
            ...new Map(
              diagnostics.map((diagnostic) => [
                getDiagnosticIssueKey(diagnostic),
                diagnostic,
              ])
            ).values(),
          ]);
        }
        throw error;
      }
    }
    signal?.throwIfAborted();
    const queryIssues = [
      ...new Map(
        [
          ...queryIndexIssues,
          ...(sourceDiagnosticsIndex === queryIndex
            ? []
            : (diagnosticIssuesByArtifact.get(sourceDiagnosticsIndex) ?? [])),
        ].map((issue) => [getDiagnosticIssueKey(issue), issue])
      ).values(),
    ].map((issue) => ({ ...issue, scope: "query" as const }));
    let data: AssetQueryExecutionResult;
    try {
      data = await executeData();
    } catch (error) {
      if (
        error instanceof DocumentSourceDiagnosticsError &&
        queryIssues.length > 0
      ) {
        throw new DocumentSourceDiagnosticsError([
          ...new Map(
            [...queryIssues, ...error.diagnostics].map((diagnostic) => [
              getDiagnosticIssueKey(diagnostic),
              diagnostic,
            ])
          ).values(),
        ]);
      }
      if (
        error instanceof AssetResourceHydrationError &&
        queryIssues.length > 0
      ) {
        const hydrationDiagnostics = Array.isArray(error.details?.diagnostics)
          ? error.details.diagnostics
          : [];
        throw new AssetResourceHydrationError({
          code: error.code,
          message: error.message,
          details: {
            ...error.details,
            diagnostics: [...queryIssues, ...hydrationDiagnostics],
          },
        });
      }
      throw error;
    }
    signal?.throwIfAborted();
    let publishedIndex: typeof index;
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
      try {
        publishedIndex = await this.measurePerformance(
          "diagnostics-preparation",
          () =>
            diagnosticsRepository.prepareIndexAfterAuthorization(
              publishedPlan,
              false
            )
        );
      } catch (error) {
        if (error instanceof DocumentSourceDiagnosticsError) {
          // Published-plan diagnostics can contain files selected by other
          // resources. Keep this preview scoped to the current query.
          publishedIndex = queryIndex;
        } else {
          throw error;
        }
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
    const queryDatabase = getContentDatabaseForArtifact(queryIndex);
    const publishedDatabase = getContentDatabaseForArtifact(publishedIndex);
    const queryValidation = validateAssetQueryAgainstCatalog({
      query,
      catalog: queryDatabase.getFieldCatalog(),
    });
    // Source diagnostics in this panel belong only to the current query.
    const issues = queryIssues.sort(
      (left, right) =>
        left.path.localeCompare(right.path) ||
        left.code.localeCompare(right.code) ||
        left.message.localeCompare(right.message)
    );
    return {
      data,
      __diagnostics__: {
        scope: "query-preview",
        ...(queryValidation.warnings.length === 0
          ? {}
          : { queryWarnings: queryValidation.warnings }),
        ...(queryValidation.warningIssues.length === 0
          ? {}
          : { queryIssues: queryValidation.warningIssues }),
        query: toCapacityStats(queryDatabase.getStats()),
        database: toCapacityStats(publishedDatabase.getStats()),
        ...(includeUnresolvedDiagnostics
          ? { artifacts: { query: queryIndex, database: publishedIndex } }
          : {}),
        ...(unresolved === undefined ? {} : { unresolved }),
        ...(issues.length === 0
          ? {}
          : {
              issues,
              issueCount: issues.length,
              issuesTruncated: false,
            }),
      },
    };
  }
}
