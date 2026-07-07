import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import { Upload } from "tus-js-client";
import {
  apiClientHeader,
  apiClientVersionHeader,
  getApiCompatibilityPayload,
} from "@webstudio-is/trpc-interface/api-compatibility";
import {
  buildPatchTransaction,
  buildPatchNamespaces,
  bundleVersion as currentBundleVersion,
  importProjectBundleResult,
  parseMissingImportedAssetFilesMessage,
  publishedProjectBundle,
  maxProjectBundleSize,
  stagedUploadPath,
  stagedUploadProjectIdHeader,
  parseBuilderUrl,
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
  const code = (data as { code?: unknown }).code;
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
    (params) =>
      pickInput(params, operation.inputFields as readonly (keyof Params)[])
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

const stagedUploadChunkSize = 3 * 1024 * 1024;

const formatMebibytes = (bytes: number) =>
  `${Math.round(bytes / 1024 / 1024)} MiB`;

type Asset = PublishedProjectBundle["assets"][number];
type BinaryAssetData = Blob | ArrayBuffer | ArrayBufferView<ArrayBuffer>;

type AssetUpload = {
  asset: Asset;
  data: BinaryAssetData;
};

type AssetUploadDescriptor = {
  id?: string;
  name: string;
  type: Asset["type"];
  format?: string;
  meta?: Record<string, unknown>;
  description?: string | null;
};

type AssetUploadResult = { uploadedAssets?: Asset[] };
type AssetUploadBatchResult =
  | { status: "fulfilled"; uploadedAssets: Asset[] }
  | { status: "rejected"; asset: Asset; error: unknown };

const toArrayBuffer = async (data: BinaryAssetData) => {
  if (data instanceof Blob) {
    return data.arrayBuffer();
  }
  if (ArrayBuffer.isView(data)) {
    return data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    );
  }
  return data;
};

const getSha256Hash = async (data: BinaryAssetData) => {
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    await toArrayBuffer(data)
  );
  return Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

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
  url.searchParams.set("assetId", asset.id);
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
    ? result.uploadedAssets.map((asset) => ({
        ...asset,
        id: asset.id || upload.asset.id,
      }))
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
          const assetWithId = {
            ...asset,
            id: asset.id || (await getSha256Hash(data)),
          };
          return await uploadAsset({
            authToken: params.authToken,
            headers: params.headers,
            origin: params.origin,
            projectId: params.projectId,
            upload: {
              asset: assetWithId,
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
    id: descriptor.id ?? "",
    projectId,
    name: descriptor.name,
    filename: descriptor.name,
    description: descriptor.description ?? null,
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
    }
  );
  return publishedProjectBundle.parse(data);
};

export const toLocalProjectBundle = (project: PublishedProjectBundle) => {
  const normalizedProject = publishedProjectBundle.parse(project);
  const {
    assets,
    build,
    bundleVersion: synchronizedBundleVersion,
    origin,
    page,
    pages,
    projectDomain,
    projectTitle,
    user,
  } = normalizedProject;
  return {
    bundleVersion: synchronizedBundleVersion ?? currentBundleVersion,
    build,
    page,
    pages,
    assets,
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
  issues: Array<{ path: Array<string | number>; message: string }>
) =>
  issues
    .map((issue) => {
      const path = issue.path.join(".");
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
  parentFolderId?: string;
  meta?: PageMetaInput;
};

export const listPages = projectQueryInput<
  AuthProjectParams & {
    includeFolders?: boolean;
  }
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
    pageId?: string;
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

export const getProjectSettings = projectQuery(
  getPublicApiOperationPath("get-project-settings")
);

export const updateProjectSettings = projectMutationInput<
  AuthProjectParams & ProjectSettingsInput
>("update-project-settings");

export const listRedirects = projectQuery(
  getPublicApiOperationPath("list-redirects")
);

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

export const listBreakpoints = projectQuery(
  getPublicApiOperationPath("list-breakpoints")
);

type BreakpointInput = {
  id: string;
  label: string;
  minWidth?: number;
  maxWidth?: number;
  condition?: string;
};

type BreakpointUpdateInput = Partial<Omit<BreakpointInput, "id">>;
type NullableBreakpointUpdateInput = {
  [Key in keyof BreakpointUpdateInput]?: BreakpointUpdateInput[Key] | null;
};

export const createBreakpoint = projectMutationInput<
  AuthProjectParams & BreakpointInput
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

export const listPageTemplates = projectQuery(
  getPublicApiOperationPath("list-page-templates")
);

export const createPageFromTemplate = projectMutationInput<
  AuthProjectParams & {
    templateId: string;
    parentFolderId?: string;
    name: string;
    path: string;
  }
>("create-page-from-template");

export const listFolders = projectQueryInput<
  AuthProjectParams & {
    includePages?: boolean;
  }
>("list-folders");

export const createFolder = projectMutationInput<
  AuthProjectParams & {
    folderId?: string;
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

export const listInstances = projectQueryInput<
  AuthProjectParams & {
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

export const appendInstance = projectMutationInput<
  AuthProjectParams & {
    parentInstanceId: string;
    mode?: "append" | "prepend" | "replace";
    insertIndex?: number;
    children: Array<{
      instanceId?: string;
      component?: string;
      tag: string;
      label?: string;
      text?: string;
    }>;
  }
>("append-instance");

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
  propId?: string;
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
  propId?: string;
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
    maxValueLength?: number;
  }
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
  AuthProjectParams & {
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
      tokenId?: string;
      name: string;
      styles?: Record<string, unknown>;
      declarations?: DesignTokenStyleInput[];
    }>;
  }
>("create-design-token");

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
  AuthProjectParams & {
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
  AuthProjectParams & {
    scopeInstanceId?: string;
  }
>("list-variables");

export const createVariable = projectMutationInput<
  AuthProjectParams & {
    dataSourceId?: string;
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
  AuthProjectParams & {
    scopeInstanceId?: string;
  }
>("list-resources");

export const createResource = projectMutationInput<
  AuthProjectParams & {
    resourceId?: string;
    resource: ResourceFieldsInput;
    dataSourceId?: string;
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

export const listPublishes = projectQuery(
  getPublicApiOperationPath("list-publishes")
);

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

export const listDomains = projectQuery(
  getPublicApiOperationPath("list-domains")
);

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

export const listAssets = projectQueryInput<
  AuthProjectParams & {
    type?: "image" | "font";
    sort?: "name" | "size" | "createdAt" | "usage";
    withUsage?: boolean;
    cursor?: string;
    limit?: number;
  }
>("list-assets");

export const findAssetUsage = projectQueryInput<
  AuthProjectParams & {
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

  const dataToImport =
    params.skipAssets === true ? { ...params.data, assets: [] } : params.data;

  if (params.skipAssets !== true) {
    params.onUploadAssets?.(params.data.assets);
    await uploadAssets({
      ...params,
      assets: params.data.assets,
      readAssetData: params.readAssetData,
    });
  }

  const maxRetries = params.maxMissingAssetImportRetries ?? 5;
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

      const missingAssets = params.data.assets.filter((asset) =>
        assetNames.includes(asset.name)
      );
      if (missingAssets.length !== assetNames.length) {
        throw error;
      }

      const readAssetData =
        params.skipAssets === true ? undefined : params.readAssetData;
      if (readAssetData === undefined) {
        throw error;
      }

      params.onMissingAssets?.(missingAssets);
      await uploadAssets({
        ...params,
        assets: missingAssets,
        readAssetData,
      });
    }
  }

  throw new Error("Project import failed.");
};
