import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import { Upload } from "tus-js-client";
import {
  apiClientHeader,
  apiClientVersionHeader,
  getApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";
import {
  buildPatchTransaction,
  restorePointPatchTransaction,
  buildPatchNamespaces,
  bundleVersion as currentBundleVersion,
  importProjectBundleResult,
  parseMissingImportedAssetFilesMessage,
  publishedProjectBundle,
  maxProjectBundleSize,
  stagedUploadPath,
  stagedUploadProjectIdHeader,
  parseBuilderUrl,
  projectSessionRestorePointPath,
  type BuildPatchTransaction,
  getPublicApiOperation,
  getPublicApiOperationPath,
  type ImportProjectBundleResult,
  isPublicApiRemoteErrorCode,
  type PublishedProjectBundle,
  type PublicApiCommand,
} from "@webstudio-is/protocol";
export { getBundleVersion, bundleVersion } from "@webstudio-is/protocol";
export { parseBuilderUrl } from "@webstudio-is/protocol";
export type {
  BuildPatchTransaction,
  PublishedProjectBundle,
  ProjectBundle,
  PublicApiRemoteErrorCode,
} from "@webstudio-is/protocol";

const maxResponsePreviewLength = 500;

type WebstudioFragmentPayload = {
  children: unknown[];
  instances: unknown[];
  assets: unknown[];
  dataSources: unknown[];
  resources: unknown[];
  props: unknown[];
  breakpoints: unknown[];
  styleSourceSelections: unknown[];
  styleSources: unknown[];
  styles: unknown[];
};

const getResponsePreview = async (response: Response) => {
  try {
    const text = await response.clone().text();
    return text.replace(/\s+/g, " ").trim().slice(0, maxResponsePreviewLength);
  } catch {
    return "";
  }
};

const createApiResponseErrorMessage = async (
  request: RequestInfo | URL,
  response: Response
) => {
  const contentType = response.headers.get("content-type") ?? "unknown";
  const status = `${response.status} ${response.statusText}`.trim();
  const url =
    typeof request === "string" || request instanceof URL
      ? request.toString()
      : request.url;
  const preview = await getResponsePreview(response);
  const hint =
    response.status === 413
      ? "The request may be too large for the API."
      : undefined;

  return [
    `API returned ${contentType} instead of JSON from ${url}.`,
    `HTTP status: ${status}.`,
    preview === "" ? undefined : `Response preview: ${preview}`,
    hint,
  ]
    .filter(Boolean)
    .join("\n");
};

const fetchJsonResponse: typeof fetch = async (request, init) => {
  const response = await fetch(request, init);
  const contentType = response.headers.get("content-type");

  if (contentType?.includes("json") !== true) {
    throw new Error(await createApiResponseErrorMessage(request, response));
  }

  return response;
};

const createHeaders = (headers: Record<string, string | undefined>) => {
  return new Headers(createHeadersObject(headers));
};

const createHeadersObject = (headers: Record<string, string | undefined>) => {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(headers)) {
    if (value !== undefined) {
      result[name] = value;
    }
  }
  return result;
};

type RequestHeaders = Record<string, string | undefined>;
type ApiClientName = "browser" | "cli" | "service";

export const createApiClientHeaders = ({
  name,
  version,
}: {
  name: ApiClientName;
  version: string;
}): RequestHeaders => ({
  [apiClientHeader]: name,
  [apiClientVersionHeader]: version,
});

export const getApiCompatibilityMessage = (
  error: unknown,
  {
    runLatestCommand,
    updateCommand,
  }: {
    runLatestCommand: string;
    updateCommand: string;
  }
) => {
  const payload = getApiCompatibilityPayload(error);
  if (payload?.action.type !== "updateCli") {
    return;
  }

  return `${payload.message}

Update the CLI with:
  ${updateCommand}

Or run the latest version once with:
  ${runLatestCommand}`;
};

export const getApiErrorCode = (error: unknown) => {
  const data =
    typeof error === "object" && error !== null
      ? (error as { data?: unknown }).data
      : undefined;
  if (typeof data !== "object" || data === null) {
    return;
  }
  const code =
    (data as { webstudioCode?: unknown }).webstudioCode ??
    (data as { code?: unknown }).code;
  return typeof code === "string" && isPublicApiRemoteErrorCode(code)
    ? code
    : undefined;
};

const createTrpcClient = (origin: string, headers: RequestHeaders) => {
  const { sourceOrigin } = parseBuilderUrl(origin);
  const url = new URL("/trpc", sourceOrigin);

  return createTRPCUntypedClient({
    links: [
      httpBatchLink({
        url: url.href,
        headers,
        fetch: fetchJsonResponse,
      }),
    ],
  });
};

const createAuthTrpcClient = (params: {
  origin: string;
  authToken: string;
  headers?: RequestHeaders;
}) => {
  const client = createTrpcClient(params.origin, {
    ...params.headers,
    "x-auth-token": params.authToken,
  });
  return {
    query: <Result = unknown>(path: string, input?: unknown) =>
      client.query(path, input) as Promise<Result>,
    mutation: <Result = unknown>(path: string, input?: unknown) =>
      client.mutation(path, input) as Promise<Result>,
  };
};

type AuthProjectParams = {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: RequestHeaders;
};

type PaginatedQueryInput = {
  cursor?: string;
  limit?: number;
  verbose?: boolean;
};

type AuthTokenParams = {
  origin: string;
  authToken: string;
  headers?: RequestHeaders;
};

const queryProjectApi = async <Result = unknown>(
  params: AuthProjectParams,
  path: string,
  input: Record<string, unknown> = {}
) => {
  return await createAuthTrpcClient(params).query<Result>(path, {
    projectId: params.projectId,
    ...input,
  });
};

const mutateProjectApi = async <Result = unknown>(
  params: AuthProjectParams,
  path: string,
  input: Record<string, unknown> = {}
) => {
  return await createAuthTrpcClient(params).mutation<Result>(path, {
    projectId: params.projectId,
    ...input,
  });
};

const pickInput = <Params extends object, Key extends keyof Params>(
  params: Params,
  keys: readonly Key[]
) => {
  const input: Record<string, unknown> = {};
  for (const key of keys) {
    input[String(key)] = params[key];
  }
  return input;
};

const projectQuery =
  <Params extends AuthProjectParams, Result = unknown>(
    path: string,
    getInput: (params: Params) => Record<string, unknown> = () => ({})
  ) =>
  async (params: Params) =>
    await queryProjectApi<Result>(params, path, getInput(params));

const projectMutation =
  <Params extends AuthProjectParams, Result = unknown>(
    path: string,
    getInput: (params: Params) => Record<string, unknown> = () => ({})
  ) =>
  async (params: Params) =>
    await mutateProjectApi<Result>(params, path, getInput(params));

const projectQueryInput = <Params extends AuthProjectParams, Result = unknown>(
  command: PublicApiCommand
) => {
  const operation = getPublicApiOperation(command);
  return projectQuery<Params, Result>(
    getPublicApiOperationPath(command),
    (params) =>
      pickInput(params, operation.inputFields as readonly (keyof Params)[])
  );
};

const projectMutationInput = <
  Params extends AuthProjectParams,
  Result = unknown,
>(
  command: PublicApiCommand
) => {
  const operation = getPublicApiOperation(command);
  return projectMutation<Params, Result>(
    getPublicApiOperationPath(command),
    (params) => ({
      ...pickInput(params, operation.inputFields as readonly (keyof Params)[]),
      ...(operation.requiresAssets || operation.requiresConfirm
        ? { confirm: true }
        : {}),
    })
  );
};

const projectConfirmedMutationInput = <
  Params extends AuthProjectParams,
  Result = unknown,
>(
  command: PublicApiCommand
) => {
  const operation = getPublicApiOperation(command);
  return projectMutation<Params, Result>(
    getPublicApiOperationPath(command),
    (params) => ({
      ...pickInput(params, operation.inputFields as readonly (keyof Params)[]),
      confirm: true,
    })
  );
};

type RuntimeOperationParams = AuthProjectParams & Record<string, unknown>;

const runtimeProjectMutation = <Command extends PublicApiCommand>(
  command: Command
) => projectMutationInput<RuntimeOperationParams>(command);

const stagedUploadChunkSize = 3 * 1024 * 1024;

const formatMebibytes = (bytes: number) =>
  `${Math.round(bytes / 1024 / 1024)} MiB`;

type Asset = PublishedProjectBundle["assets"][number];
type BinaryAssetData = Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer>;
type AssetContentData = BinaryAssetData | string;

type AssetUpload = {
  asset: Asset;
  data: BinaryAssetData;
};

type AssetUploadDescriptor = {
  name: string;
  type: Asset["type"];
  format?: string;
  meta?: Record<string, unknown>;
  description?: string | null;
  folderId?: string;
};

type AssetUploadResult = { uploadedAssets?: Asset[] };
type AssetUploadBatchResult =
  | { status: "fulfilled"; uploadedAssets: Asset[] }
  | { status: "rejected"; asset: Asset; error: unknown };

const formatError = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

const retryOnce = async <Result>(task: () => Promise<Result>) => {
  try {
    return await task();
  } catch {
    return await task();
  }
};

const getAssetUploadUrl = ({
  asset,
  origin,
  projectId,
}: {
  asset: Asset;
  origin: string;
  projectId: string;
}) => {
  const { sourceOrigin } = parseBuilderUrl(origin);
  const url = new URL(
    `/rest/assets/${encodeURIComponent(asset.name)}`,
    sourceOrigin
  );
  url.searchParams.set("projectId", projectId);
  url.searchParams.set("type", asset.type);
  if (asset.folderId !== undefined) {
    url.searchParams.set("folderId", asset.folderId);
  }
  if (asset.type === "image") {
    url.searchParams.set("width", String(asset.meta.width));
    url.searchParams.set("height", String(asset.meta.height));
    url.searchParams.set("format", asset.format);
  }
  return url;
};

export const uploadAsset = async (
  params: AuthProjectParams & {
    upload: AssetUpload;
  }
): Promise<Asset[]> => {
  const { authToken, headers, origin, projectId, upload } = params;
  const response = await fetchJsonResponse(
    getAssetUploadUrl({
      asset: upload.asset,
      origin,
      projectId,
    }),
    {
      method: "POST",
      body: upload.data,
      headers: createHeaders({
        ...headers,
        "x-auth-token": authToken,
        "x-webstudio-asset-description": upload.asset.description ?? undefined,
        "content-type": "application/octet-stream",
      }),
    }
  );
  const result = (await response.json()) as
    | AssetUploadResult
    | {
        errors?: string;
      };
  if (
    typeof result === "object" &&
    result !== null &&
    "errors" in result &&
    typeof result.errors === "string"
  ) {
    throw new Error(result.errors);
  }
  return "uploadedAssets" in result && Array.isArray(result.uploadedAssets)
    ? result.uploadedAssets
    : [];
};

export const uploadAssets = async (
  params: AuthProjectParams & {
    assets: Asset[];
    readAssetData: (asset: Asset) => Promise<BinaryAssetData>;
  }
): Promise<Asset[]> => {
  const results: AssetUploadBatchResult[] = await Promise.all(
    params.assets.map(async (asset) => {
      try {
        const uploadedAssets = await retryOnce(async () => {
          const data = await params.readAssetData(asset);
          return await uploadAsset({
            authToken: params.authToken,
            headers: params.headers,
            origin: params.origin,
            projectId: params.projectId,
            upload: {
              asset,
              data,
            },
          });
        });
        return { status: "fulfilled", uploadedAssets };
      } catch (error) {
        return { status: "rejected", asset, error };
      }
    })
  );

  const failedUploads = results.flatMap((result) =>
    result.status === "rejected"
      ? [{ asset: result.asset, error: result.error }]
      : []
  );
  if (failedUploads.length > 0) {
    throw new Error(
      `Failed to upload assets: ${failedUploads
        .map(({ asset, error }) => `${asset.name}: ${formatError(error)}`)
        .join("; ")}`
    );
  }
  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.uploadedAssets : []
  );
};

const toUploadAsset = ({
  descriptor,
  projectId,
}: {
  descriptor: AssetUploadDescriptor;
  projectId: string;
}): Asset => {
  const base = {
    id: "",
    projectId,
    name: descriptor.name,
    filename: descriptor.name,
    description: descriptor.description ?? null,
    folderId: descriptor.folderId,
    size: 0,
    createdAt: new Date().toISOString(),
  };
  if (descriptor.type === "image") {
    const width = descriptor.meta?.width;
    const height = descriptor.meta?.height;
    if (
      typeof width !== "number" ||
      typeof height !== "number" ||
      descriptor.format === undefined
    ) {
      throw new Error(
        `Image asset "${descriptor.name}" requires format, meta.width, and meta.height.`
      );
    }
    return {
      ...base,
      type: "image",
      format: descriptor.format,
      meta: { width, height },
    };
  }
  if (descriptor.type === "font") {
    return {
      ...base,
      type: "font",
      format: descriptor.format ?? "woff2",
      meta: descriptor.meta ?? {},
    } as Asset;
  }
  return {
    ...base,
    type: "file",
    format: descriptor.format ?? descriptor.name.split(".").at(-1) ?? "",
    meta: {},
  };
};

export const uploadProjectAsset = async (
  params: AuthProjectParams & {
    asset: AssetUploadDescriptor;
    readAssetData: (asset: AssetUploadDescriptor) => Promise<BinaryAssetData>;
  }
) => {
  const asset = toUploadAsset({
    descriptor: params.asset,
    projectId: params.projectId,
  });
  const uploaded = await uploadAssets({
    authToken: params.authToken,
    headers: params.headers,
    origin: params.origin,
    projectId: params.projectId,
    assets: [asset],
    readAssetData: () => params.readAssetData(params.asset),
  });
  return { uploaded };
};

export const uploadProjectAssets = async (
  params: AuthProjectParams & {
    assets: AssetUploadDescriptor[];
    readAssetData: (asset: AssetUploadDescriptor) => Promise<BinaryAssetData>;
  }
) => {
  const descriptorByName = new Map(
    params.assets.map((descriptor) => [descriptor.name, descriptor])
  );
  const uploaded = await uploadAssets({
    authToken: params.authToken,
    headers: params.headers,
    origin: params.origin,
    projectId: params.projectId,
    assets: params.assets.map((descriptor) =>
      toUploadAsset({ descriptor, projectId: params.projectId })
    ),
    readAssetData: (asset) => {
      const descriptor = descriptorByName.get(asset.name);
      if (descriptor === undefined) {
        throw new Error(`Asset descriptor not found for ${asset.name}.`);
      }
      return params.readAssetData(descriptor);
    },
  });
  return { uploaded };
};

type AssetContentUpdateResult =
  | { asset: Asset }
  | {
      errors: string;
    };

export const updateProjectAssetContent = async (
  params: Omit<AuthProjectParams, "authToken"> & {
    authToken?: string;
    assetId: string;
    expectedName: string;
    readAssetData: () => Promise<AssetContentData>;
    request?: typeof fetch;
    requestOrigin?: string;
  }
): Promise<{ asset: Asset }> => {
  const request = params.request ?? fetch;
  const { sourceOrigin } = parseBuilderUrl(params.origin);
  const url = new URL(
    `/rest/assets/${encodeURIComponent(params.assetId)}/content`,
    params.requestOrigin ?? sourceOrigin
  );
  url.searchParams.set("projectId", params.projectId);
  url.searchParams.set("expectedName", params.expectedName);
  const response = await request(url, {
    method: "PUT",
    body: await params.readAssetData(),
    headers: createHeaders({
      ...params.headers,
      "x-auth-token": params.authToken,
      "content-type": "application/octet-stream",
    }),
  });
  const result = (await response.json()) as AssetContentUpdateResult;
  if ("errors" in result) {
    throw Object.assign(new Error(result.errors), { status: response.status });
  }
  return result;
};

export const loadProjectBundleByBuildId = async (
  params: {
    buildId: string;
    origin: string;
    headers?: RequestHeaders;
  } & (
    | {
        serviceToken: string;
      }
    | { authToken: string }
    | { authToken?: undefined; serviceToken?: undefined }
  )
): Promise<PublishedProjectBundle> => {
  const headers: RequestHeaders =
    "serviceToken" in params
      ? { Authorization: params.serviceToken }
      : "authToken" in params
        ? { "x-auth-token": params.authToken }
        : {};

  const data = await createTrpcClient(params.origin, {
    ...params.headers,
    ...headers,
  }).query("build.loadProjectBundleByBuildId", {
    buildId: params.buildId,
    bundleVersion: currentBundleVersion,
  });
  return publishedProjectBundle.parse(data);
};

export const loadProjectBundleByProjectId = async (
  params: AuthProjectParams
): Promise<PublishedProjectBundle> => {
  const data = await createAuthTrpcClient(params).query(
    "build.loadProjectBundleByProjectId",
    {
      projectId: params.projectId,
      bundleVersion: currentBundleVersion,
    }
  );
  return publishedProjectBundle.parse(data);
};

export const toLocalProjectBundle = (project: PublishedProjectBundle) => {
  const normalizedProject = publishedProjectBundle.parse(project);
  const {
    assets,
    assetFolders,
    build,
    origin,
    page,
    pages,
    projectDomain,
    projectTitle,
    user,
  } = normalizedProject;
  return {
    bundleVersion: currentBundleVersion,
    build,
    page,
    pages,
    assets,
    assetFolders,
    user,
    projectDomain,
    projectTitle,
    origin,
  };
};

export const checkProjectBuildPermission = async (
  params: AuthProjectParams
): Promise<void> => {
  await createAuthTrpcClient(params).query(
    "build.checkProjectBuildPermission",
    {
      projectId: params.projectId,
    }
  );
};

const formatSchemaIssues = (
  issues: Array<{ path: PropertyKey[]; message: string }>
) =>
  issues
    .map((issue) => {
      const path = issue.path.map(String).join(".");
      return path === "" ? issue.message : `${path}: ${issue.message}`;
    })
    .join(", ");

export const parseBuildPatchTransactions = (transactions: unknown) => {
  const input =
    typeof transactions === "object" &&
    transactions !== null &&
    "transactions" in transactions
      ? (transactions as { transactions: unknown }).transactions
      : transactions;

  const result = buildPatchTransaction.array().safeParse(input);
  if (result.success === false) {
    throw new Error(
      `Invalid patch JSON: ${formatSchemaIssues(result.error.issues)}`
    );
  }
  return result.data;
};

const parseRestorePointPatchTransactions = (transactions: unknown) => {
  const result = restorePointPatchTransaction.array().safeParse(transactions);
  if (result.success === false) {
    throw new Error(
      `Invalid restore point transaction: ${formatSchemaIssues(result.error.issues)}`
    );
  }
  return result.data;
};

export const getBuildPatchSummary = (transactions: BuildPatchTransaction[]) => {
  const namespaces = new Set<(typeof buildPatchNamespaces)[number]>();
  let patchCount = 0;
  for (const transaction of transactions) {
    for (const item of transaction.payload) {
      namespaces.add(item.namespace);
      patchCount += item.patches.length;
    }
  }
  return {
    transactionCount: transactions.length,
    patchCount,
    namespaces: [...namespaces],
  };
};

export const getApiTokenInfo = async (params: AuthTokenParams) => {
  return await createAuthTrpcClient(params).query(
    getPublicApiOperationPath("whoami")
  );
};

export const getProjectInfo = projectQuery(
  getPublicApiOperationPath("inspect")
);

export const getProjectPermissions = projectQuery(
  getPublicApiOperationPath("permissions")
);

export const getBuildSnapshot = projectQueryInput<
  AuthProjectParams & {
    include?: string[];
    version?: number;
    verbose?: boolean;
    cursor?: string;
    limit?: number;
  }
>("snapshot");

export const applyBuildPatch = async (
  params: AuthProjectParams & {
    baseVersion: number;
    transactions: unknown;
  }
) => {
  return await mutateProjectApi(
    params,
    getPublicApiOperationPath("apply-patch"),
    {
      baseVersion: params.baseVersion,
      transactions: parseBuildPatchTransactions(params.transactions),
    }
  );
};

export const applyRestorePointPatch = async (
  params: AuthProjectParams & {
    baseVersion: number;
    transactions: unknown;
  }
) =>
  await mutateProjectApi(params, projectSessionRestorePointPath, {
    baseVersion: params.baseVersion,
    transactions: parseRestorePointPatchTransactions(params.transactions),
  });

type PageMetaInput = {
  description?: string;
  language?: string;
  redirect?: string;
  status?: string;
  socialImageUrl?: string;
  socialImageAssetId?: string;
  excludePageFromSearch?: boolean;
  documentType?: "html" | "xml" | "text";
  content?: string;
  auth?: { method: "basic"; login: string; password: string };
  custom?: Array<{ property: string; content: string }>;
};

type PageFieldsInput = {
  name?: string;
  path?: string;
  title?: string;
  isDraft?: boolean;
  parentFolderId?: string;
  meta?: PageMetaInput;
};

export const listPages = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput
>("list-pages");

export const getPage = projectQueryInput<
  AuthProjectParams & {
    pageId: string;
  }
>("get-page");

export const getPageByPath = projectQueryInput<
  AuthProjectParams & {
    path: string;
  }
>("get-page-by-path");

export const createPage = projectMutationInput<
  AuthProjectParams & {
    name: string;
    path: string;
    title?: string;
    parentFolderId?: string;
    meta?: PageMetaInput;
  }
>("create-page");

export const updatePage = projectMutationInput<
  AuthProjectParams & {
    pageId: string;
    values: PageFieldsInput;
  }
>("update-page");

export const updatePageSettings = runtimeProjectMutation(
  "update-page-settings"
);

export const updatePageMarketplace = runtimeProjectMutation(
  "update-page-marketplace"
);

export const savePagePathInHistory = runtimeProjectMutation(
  "save-page-path-history"
);

export const setHomePage = runtimeProjectMutation("set-home-page");

export const updateMarketplaceProduct = runtimeProjectMutation(
  "update-marketplace-product"
);

export const getMarketplaceProduct = projectQueryInput<AuthProjectParams>(
  "get-marketplace-product"
);

export const setRedirects = runtimeProjectMutation("set-redirects");

export const copyPage = runtimeProjectMutation("copy-page");

export const createPageTemplate = runtimeProjectMutation(
  "create-page-template"
);

export const updatePageTemplate = runtimeProjectMutation(
  "update-page-template"
);

export const deletePageTemplate = runtimeProjectMutation(
  "delete-page-template"
);

export const duplicatePageTemplate = runtimeProjectMutation(
  "duplicate-page-template"
);

export const reorderPageTemplate = runtimeProjectMutation(
  "reorder-page-template"
);

export const duplicateFolder = runtimeProjectMutation("duplicate-folder");

export const insertPageTransferItem = runtimeProjectMutation(
  "insert-page-transfer-item"
);

export const movePageTreeItem = runtimeProjectMutation("move-page-tree-item");

export const reparentPageTreeOrphans = runtimeProjectMutation(
  "reparent-page-tree-orphans"
);

export const reparentInstance = runtimeProjectMutation("reparent-instance");

export const fillGrid = runtimeProjectMutation("fill-grid");

export const wrapInstance = runtimeProjectMutation("wrap-instance");

export const convertInstance = runtimeProjectMutation("convert-instance");

export const unwrapInstance = runtimeProjectMutation("unwrap-instance");

export const duplicateInstance = runtimeProjectMutation("duplicate-instance");

export const deleteInstanceBySelector = runtimeProjectMutation(
  "delete-instance-by-selector"
);

export const setTextContent = runtimeProjectMutation("set-text-content");

export const updateTextTree = runtimeProjectMutation("update-text-tree");

export const setInstanceTag = runtimeProjectMutation("set-instance-tag");

export const setInstanceLabel = runtimeProjectMutation("set-instance-label");

export const updateSelectedStyleDeclarations = runtimeProjectMutation(
  "update-selected-styles"
);

export const deleteSelectedStyleDeclarations = runtimeProjectMutation(
  "delete-selected-styles"
);

export const createAttachedDesignTokens = runtimeProjectMutation(
  "create-attached-design-token"
);

export const renameStyleSource = runtimeProjectMutation("rename-style-source");

export const deleteStyleSources = runtimeProjectMutation("delete-style-source");

export const setStyleSourceLock = runtimeProjectMutation(
  "set-style-source-lock"
);

export const reorderStyleSources = runtimeProjectMutation(
  "reorder-style-sources"
);

export const clearStyleSourceStyles = runtimeProjectMutation(
  "clear-style-source-styles"
);

export const duplicateStyleSource = runtimeProjectMutation(
  "duplicate-style-source"
);

export const convertLocalStyleSourceToToken = runtimeProjectMutation(
  "convert-local-style-source-to-token"
);

export const renameCssVariable = runtimeProjectMutation("rename-css-variable");

export const deleteUnusedVariables = runtimeProjectMutation(
  "delete-unused-variables"
);

export const upsertResource = runtimeProjectMutation("upsert-resource");

export const upsertResourceProp = runtimeProjectMutation(
  "upsert-resource-prop"
);

export const integrateRuntimeUi = runtimeProjectMutation(
  "integrate-runtime-ui"
);

export const updateAsset = runtimeProjectMutation("update-asset");

export const addAsset = runtimeProjectMutation("add-asset");

type ProjectSettingsInput = {
  meta?: {
    siteName?: string | null;
    contactEmail?: string | null;
    faviconAssetId?: string | null;
    code?: string | null;
    auth?: string | null;
  };
  compiler?: {
    atomicStyles?: boolean | null;
  };
};

export const getProjectSettings = projectQueryInput<
  AuthProjectParams & Pick<PaginatedQueryInput, "verbose">
>("get-project-settings");

export const updateProjectSettings = projectMutationInput<
  AuthProjectParams & ProjectSettingsInput
>("update-project-settings");

export const listRedirects = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput
>("list-redirects");

export const createRedirect = projectMutationInput<
  AuthProjectParams & {
    old: string;
    new: string;
    status?: "301" | "302";
  }
>("create-redirect");

export const updateRedirect = projectMutationInput<
  AuthProjectParams & {
    old: string;
    values: {
      old?: string;
      new?: string;
      status?: "301" | "302" | null;
    };
  }
>("update-redirect");

export const deleteRedirect = projectMutationInput<
  AuthProjectParams & {
    old: string;
  }
>("delete-redirect");

export const listBreakpoints = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput
>("list-breakpoints");

type BreakpointInput = {
  id: string;
  label: string;
  minWidth?: number;
  maxWidth?: number;
  condition?: string;
};

type BreakpointCreateInput = Omit<BreakpointInput, "id">;
type BreakpointUpdateInput = Partial<Omit<BreakpointInput, "id">>;
type NullableBreakpointUpdateInput = {
  [Key in keyof BreakpointUpdateInput]?: BreakpointUpdateInput[Key] | null;
};

export const createBreakpoint = projectMutationInput<
  AuthProjectParams & BreakpointCreateInput
>("create-breakpoint");

export const updateBreakpoint = projectMutationInput<
  AuthProjectParams & {
    breakpointId: string;
    values: NullableBreakpointUpdateInput;
  }
>("update-breakpoint");

export const deleteBreakpoint = projectMutationInput<
  AuthProjectParams & {
    breakpointId: string;
  }
>("delete-breakpoint");

export const deletePage = projectMutationInput<
  AuthProjectParams & {
    pageId: string;
  }
>("delete-page");

export const duplicatePage = projectMutationInput<
  AuthProjectParams & {
    pageId: string;
    parentFolderId?: string;
    name?: string;
    path?: string;
  }
>("duplicate-page");

export const listPageTemplates = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput
>("list-page-templates");

export const createPageFromTemplate = projectMutationInput<
  AuthProjectParams & {
    templateId: string;
    parentFolderId?: string;
    name: string;
    path: string;
  }
>("create-page-from-template");

export const listFolders = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput
>("list-folders");

export const createFolder = projectMutationInput<
  AuthProjectParams & {
    name: string;
    slug: string;
    parentFolderId?: string;
  }
>("create-folder");

export const updateFolder = projectMutationInput<
  AuthProjectParams & {
    folderId: string;
    values: {
      name?: string;
      slug?: string;
      parentFolderId?: string;
    };
  }
>("update-folder");

export const deleteFolder = projectMutationInput<
  AuthProjectParams & {
    folderId: string;
  }
>("delete-folder");

export const searchProject = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput & Record<string, unknown>
>("search-project");

export const audit = projectQueryInput<
  AuthProjectParams & Record<string, unknown>
>("audit");

export const verifyBindings = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput & Record<string, unknown>
>("verify-bindings");

export const listFonts = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput & Record<string, unknown>
>("list-fonts");

export const replacePropText = projectMutationInput<
  AuthProjectParams & Record<string, unknown>
>("replace-prop-text");

export const replaceText = projectMutationInput<
  AuthProjectParams & Record<string, unknown>
>("replace-text");

export const replaceResourceText = projectMutationInput<
  AuthProjectParams & Record<string, unknown>
>("replace-resource-text");

export const setImageDescriptions = projectMutationInput<
  AuthProjectParams & Record<string, unknown>
>("set-image-descriptions");

export const listInstances = projectQueryInput<
  AuthProjectParams &
    PaginatedQueryInput & {
      pageId?: string;
      pagePath?: string;
      rootInstanceId?: string;
      maxDepth?: number;
      topLevelOnly?: boolean;
      component?: string;
      tag?: string;
      labelContains?: string;
    }
>("list-instances");

export const inspectInstance = projectQueryInput<
  AuthProjectParams & {
    instanceId: string;
    include?: string[];
    childDepth?: number;
  }
>("inspect-instance");

export const insertComponent = projectMutationInput<
  AuthProjectParams & {
    parentInstanceId: string;
    component: string;
    mode?: "append" | "prepend" | "replace";
    insertIndex?: number;
  }
>("insert-component");

export const insertCollection = runtimeProjectMutation("insert-collection");

export const attachSharedSlot = runtimeProjectMutation("attach-slot");

export const extractSharedSlot = runtimeProjectMutation("extract-slot");

export const insertFragment = projectMutationInput<
  AuthProjectParams & {
    parentInstanceId: string;
    fragment: WebstudioFragmentPayload;
    mode?: "append" | "prepend" | "replace";
    insertIndex?: number;
  }
>("insert-fragment");

export const moveInstance = projectMutationInput<
  AuthProjectParams & {
    moves: Array<{
      instanceId: string;
      parentInstanceId: string;
      insertIndex?: number;
    }>;
  }
>("move-instance");

export const cloneInstance = projectMutationInput<
  AuthProjectParams & {
    sourceInstanceId: string;
    targetParentInstanceId?: string;
    insertIndex?: number;
  }
>("clone-instance");

export const deleteInstance = projectMutationInput<
  AuthProjectParams & {
    instanceIds: string[];
  }
>("delete-instance");

type PropValueInput = {
  instanceId: string;
  name: string;
  type:
    | "number"
    | "string"
    | "boolean"
    | "json"
    | "asset"
    | "page"
    | "string[]"
    | "parameter"
    | "resource"
    | "expression"
    | "action"
    | "animationAction";
  value: unknown;
  required?: boolean;
};

type PropBindingInput = {
  instanceId: string;
  name: string;
  binding:
    | { type: "expression"; value: string }
    | { type: "parameter"; value: string }
    | { type: "resource"; value: string }
    | {
        type: "action";
        value: Array<{ type: "execute"; args: string[]; code: string }>;
      };
};

export const updateProps = projectMutationInput<
  AuthProjectParams & {
    updates: PropValueInput[];
  }
>("update-props");

export const deleteProps = projectMutationInput<
  AuthProjectParams & {
    deletions: Array<{ instanceId: string; name: string }>;
  }
>("delete-props");

export const bindProps = projectMutationInput<
  AuthProjectParams & {
    bindings: PropBindingInput[];
  }
>("bind-props");

export const listTexts = projectQueryInput<
  AuthProjectParams & {
    pageId?: string;
    pagePath?: string;
    instanceId?: string;
    mode?: "text" | "expression" | "all";
    contains?: string;
  } & PaginatedQueryInput
>("list-texts");

export const updateText = projectMutationInput<
  AuthProjectParams & {
    instanceId: string;
    childIndex: number;
    text: string;
    mode?: "text" | "expression";
  }
>("update-text");

export const getStyleDeclarations = projectQueryInput<
  AuthProjectParams & {
    instanceIds?: string[];
    pageId?: string;
    pagePath?: string;
    breakpoint?: string;
    state?: string;
    property?: string;
    propertyFilter?: string;
    includeTokens?: boolean;
  }
>("get-styles");

type StyleDeclarationUpdateInput = {
  instanceId: string;
  property: string;
  value: unknown;
  breakpoint?: string;
  state?: string;
  createLocalIfMissing?: boolean;
};

type StyleDeclarationDeleteInput = {
  instanceId: string;
  property: string;
  breakpoint?: string;
  state?: string;
};

export const updateStyleDeclarations = projectMutationInput<
  AuthProjectParams & {
    updates: StyleDeclarationUpdateInput[];
  }
>("update-styles");

export const deleteStyleDeclarations = projectMutationInput<
  AuthProjectParams & {
    deletions: StyleDeclarationDeleteInput[];
  }
>("delete-styles");

export const replaceStyleValues = projectMutationInput<
  AuthProjectParams & {
    property: string;
    fromValue: unknown;
    toValue: unknown;
    pageId?: string;
    pagePath?: string;
  }
>("replace-styles");

export const listDesignTokens = projectQueryInput<
  AuthProjectParams &
    PaginatedQueryInput & {
      filter?: string;
      withUsage?: boolean;
      sort?: "name" | "usage";
    }
>("list-design-tokens");

type DesignTokenStyleInput = {
  property: string;
  value: unknown;
  breakpoint?: string;
  state?: string;
};

export const createDesignTokens = projectMutationInput<
  AuthProjectParams & {
    tokens: Array<{
      name: string;
      styles?: Record<string, unknown>;
      declarations?: DesignTokenStyleInput[];
    }>;
  }
>("create-design-token");

export const importDesignTokens = runtimeProjectMutation(
  "import-design-tokens"
);

export const updateDesignTokenStyles = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    updates: DesignTokenStyleInput[];
  }
>("update-design-token-styles");

export const deleteDesignTokenStyles = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    deletions: Array<Omit<StyleDeclarationDeleteInput, "instanceId">>;
  }
>("delete-design-token-styles");

export const attachDesignToken = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    instanceIds: string[];
    position?: "before-local" | "after-local";
  }
>("attach-design-token");

export const detachDesignToken = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    instanceIds: string[];
  }
>("detach-design-token");

export const extractDesignToken = projectMutationInput<
  AuthProjectParams & {
    instanceIds: string[];
    name: string;
    removeLocalProps?: string[];
  }
>("extract-design-token");

export const listCssVariables = projectQueryInput<
  AuthProjectParams &
    PaginatedQueryInput & {
      filter?: string;
      withUsage?: boolean;
    }
>("list-css-variables");

export const defineCssVariables = projectMutationInput<
  AuthProjectParams & {
    vars: Record<string, string | Record<string, unknown>>;
    overwrite?: boolean;
  }
>("define-css-variable");

export const deleteCssVariables = projectConfirmedMutationInput<
  AuthProjectParams & {
    names: string[];
    force?: boolean;
  }
>("delete-css-variable");

export const rewriteCssVariableRefs = projectMutationInput<
  AuthProjectParams & {
    map: Record<string, string>;
    scopeRegex?: string;
  }
>("rewrite-css-variable-refs");

type VariableValueInput =
  | { type: "number"; value: number }
  | { type: "string"; value: string }
  | { type: "boolean"; value: boolean }
  | { type: "string[]"; value: string[] }
  | { type: "json"; value: unknown };

export const listVariables = projectQueryInput<
  AuthProjectParams &
    PaginatedQueryInput & {
      scopeInstanceId?: string;
    }
>("list-variables");

export const createVariable = projectMutationInput<
  AuthProjectParams & {
    scopeInstanceId: string;
    name: string;
    value: VariableValueInput;
  }
>("create-variable");

export const updateVariable = projectMutationInput<
  AuthProjectParams & {
    dataSourceId: string;
    values: {
      scopeInstanceId?: string;
      name?: string;
      value?: VariableValueInput;
    };
  }
>("update-variable");

export const deleteVariable = projectMutationInput<
  AuthProjectParams & {
    dataSourceId: string;
  }
>("delete-variable");

type ResourceFieldsInput = {
  name: string;
  control?: "system" | "graphql";
  method: "get" | "post" | "put" | "delete";
  url: string;
  searchParams?: Array<{ name: string; value: string }>;
  headers: Array<{ name: string; value: string }>;
  body?: string;
};

export const listResources = projectQueryInput<
  AuthProjectParams &
    PaginatedQueryInput & {
      scopeInstanceId?: string;
    }
>("list-resources");

export const createResource = projectMutationInput<
  AuthProjectParams & {
    resource: ResourceFieldsInput;
    scopeInstanceId?: string;
    dataSourceName?: string;
  }
>("create-resource");

export const updateResource = projectMutationInput<
  AuthProjectParams & {
    resourceId: string;
    values: Partial<ResourceFieldsInput>;
    dataSourceName?: string;
    scopeInstanceId?: string;
  }
>("update-resource");

export const deleteResource = projectMutationInput<
  AuthProjectParams & {
    resourceId: string;
    force?: boolean;
  }
>("delete-resource");

export const listPublishes = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput
>("list-publishes");

export const publish = projectMutationInput<
  AuthProjectParams & {
    target: "staging" | "production";
    domains?: string[];
    message?: string;
    idempotencyKey?: string;
  }
>("publish");

export const getPublishJob = projectQueryInput<
  AuthProjectParams & { jobId: string }
>("get-publish-job");

export const unpublish = projectConfirmedMutationInput<
  AuthProjectParams & {
    target: "staging" | "production";
    domains?: string[];
    message?: string;
    idempotencyKey?: string;
  }
>("unpublish");

export const listDomains = projectQueryInput<
  AuthProjectParams & PaginatedQueryInput
>("list-domains");

export const createDomain = projectMutationInput<
  AuthProjectParams & { domain: string }
>("create-domain");

export const updateDomain = projectMutationInput<
  AuthProjectParams & {
    domainId: string;
    updates: { domain?: string };
  }
>("update-domain");

export const deleteDomain = projectConfirmedMutationInput<
  AuthProjectParams & { domainId: string }
>("delete-domain");

export const verifyDomain = projectMutationInput<
  AuthProjectParams & { domainId: string }
>("verify-domain");

export const listAssetFolders =
  projectQueryInput<AuthProjectParams>("list-asset-folders");

export const createAssetFolder = projectMutationInput<
  AuthProjectParams & {
    name: string;
    parentId?: string;
  }
>("create-asset-folder");

export const updateAssetFolder = projectMutationInput<
  AuthProjectParams & {
    folderId: string;
    values: {
      name?: string;
      parentId?: string | null;
    };
  }
>("update-asset-folder");

export const deleteAssetFolder = projectMutationInput<
  AuthProjectParams & { folderId: string }
>("delete-asset-folder");

export const duplicateAssetFolder = projectMutationInput<
  AuthProjectParams & {
    folderId: string;
    parentId?: string | null;
  }
>("duplicate-asset-folder");

export const listAssets = projectQueryInput<
  AuthProjectParams &
    PaginatedQueryInput & {
      type?: "image" | "font";
      sort?: "name" | "size" | "createdAt" | "usage";
      withUsage?: boolean;
    }
>("list-assets");

export const getAsset = projectQueryInput<
  AuthProjectParams & { assetId: string }
>("get-asset");

export const findAssetUsage = projectQueryInput<
  AuthProjectParams &
    PaginatedQueryInput & {
      assetId: string;
    }
>("find-asset-usage");

export const replaceAsset = projectConfirmedMutationInput<
  AuthProjectParams & {
    fromAssetId: string;
    toAssetId: string;
  }
>("replace-asset");

export const deleteAssets = projectConfirmedMutationInput<
  AuthProjectParams & {
    assetIdsOrPrefixes: string[];
    force?: boolean;
  }
>("delete-asset");

export const duplicateAsset = projectMutationInput<
  AuthProjectParams & {
    assetId: string;
    folderId?: string | null;
  }
>("duplicate-asset");

const getUploadIdFromUrl = (uploadUrl: string | null) => {
  if (uploadUrl === null) {
    throw new Error("Project bundle upload did not return an upload URL.");
  }

  const { pathname } = new URL(uploadUrl);
  const uploadId = pathname.split("/").filter(Boolean).at(-1);
  if (uploadId === undefined) {
    throw new Error("Project bundle upload did not return an upload id.");
  }

  return decodeURIComponent(uploadId);
};

const uploadProjectBundleData = async (
  params: AuthProjectParams & {
    data: PublishedProjectBundle;
  }
) => {
  const { sourceOrigin } = parseBuilderUrl(params.origin);
  const endpoint = new URL(stagedUploadPath, sourceOrigin);
  const data = JSON.stringify(params.data);
  if (new TextEncoder().encode(data).byteLength > maxProjectBundleSize) {
    throw new Error(
      `Project bundle is too large to import. Maximum size is ${formatMebibytes(maxProjectBundleSize)}.`
    );
  }
  const file =
    typeof Buffer === "undefined"
      ? new Blob([data], { type: "application/json" })
      : Buffer.from(data);

  return await new Promise<string>((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: endpoint.href,
      chunkSize: stagedUploadChunkSize,
      retryDelays: [0, 1000],
      removeFingerprintOnSuccess: true,
      storeFingerprintForResuming: false,
      headers: createHeadersObject({
        ...params.headers,
        "x-auth-token": params.authToken,
        [stagedUploadProjectIdHeader]: params.projectId,
      }),
      metadata: {
        projectId: params.projectId,
      },
      onError: reject,
      onSuccess: () => resolve(getUploadIdFromUrl(upload.url)),
    });
    upload.start();
  });
};

export const importProjectBundle = async (
  params: AuthProjectParams & {
    data: PublishedProjectBundle;
    ignoreVersionCheck?: boolean;
  }
): Promise<ImportProjectBundleResult> => {
  const uploadId = await uploadProjectBundleData(params);
  const result = await createAuthTrpcClient(params).mutation(
    "build.importProjectBundle",
    {
      projectId: params.projectId,
      uploadId,
      ignoreVersionCheck: params.ignoreVersionCheck,
    }
  );
  return importProjectBundleResult.parse(result);
};

export const importProjectBundleWithAssets = async (
  params: AuthProjectParams & {
    data: PublishedProjectBundle;
    ignoreVersionCheck?: boolean;
    maxMissingAssetImportRetries?: number;
    onImportAttempt?: () => void;
    onMissingAssets?: (assets: Asset[]) => void;
    onUploadAssets?: (assets: Asset[]) => void;
  } & (
      | {
          skipAssets: true;
          readAssetData?: undefined;
        }
      | {
          skipAssets?: false;
          readAssetData: (asset: Asset) => Promise<BinaryAssetData>;
        }
    )
): Promise<ImportProjectBundleResult> => {
  await checkProjectBuildPermission(params);

  let dataToImport =
    params.skipAssets === true ? { ...params.data, assets: [] } : params.data;

  const maxRetries = params.maxMissingAssetImportRetries ?? 5;
  let uploadAttempts = 0;
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    params.onImportAttempt?.();
    try {
      return await importProjectBundle({
        ...params,
        data: dataToImport,
        ignoreVersionCheck: params.ignoreVersionCheck,
      });
    } catch (error) {
      const missingAssetNames =
        params.skipAssets === true
          ? undefined
          : parseMissingImportedAssetFilesMessage(error);
      const assetNames = missingAssetNames ?? [];
      if (assetNames.length === 0 || attempt === maxRetries) {
        throw error;
      }

      const missingImportAssets = dataToImport.assets.filter((asset) =>
        assetNames.includes(asset.name)
      );
      if (missingImportAssets.length !== assetNames.length) {
        throw error;
      }

      const missingAssetIds = new Set(
        missingImportAssets.map((asset) => asset.id)
      );
      const missingAssets = params.data.assets.filter((asset) =>
        missingAssetIds.has(asset.id)
      );
      if (missingAssets.length !== missingImportAssets.length) {
        throw error;
      }

      const readAssetData =
        params.skipAssets === true ? undefined : params.readAssetData;
      if (readAssetData === undefined) {
        throw error;
      }

      if (uploadAttempts === 0) {
        params.onUploadAssets?.(missingAssets);
      } else {
        params.onMissingAssets?.(missingAssets);
      }
      const uploadedAssets = await uploadAssets({
        ...params,
        assets: missingAssets,
        readAssetData,
      });
      if (uploadedAssets.length !== missingAssets.length) {
        throw new Error(
          `Expected ${missingAssets.length} uploaded assets, received ${uploadedAssets.length}.`
        );
      }
      const uploadedNamesById = new Map(
        missingAssets.map((asset, index) => [
          asset.id,
          uploadedAssets[index].name,
        ])
      );
      dataToImport = {
        ...dataToImport,
        assets: dataToImport.assets.map((asset) => {
          const name = uploadedNamesById.get(asset.id);
          return name === undefined ? asset : { ...asset, name };
        }),
      };
      uploadAttempts += 1;
    }
  }

  throw new Error("Project import failed.");
};
