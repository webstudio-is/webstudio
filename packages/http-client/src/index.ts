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
  type ImportProjectBundleResult,
  isPublicApiRemoteErrorCode,
  type PublishedProjectBundle,
} from "@webstudio-is/protocol";
import { getPublicApiOperationPath } from "./api-operations";
export {
  getPublicApiOperation,
  getPublicApiOperationPath,
  publicApiOperations,
  type PublicApiCommand,
  type PublicApiOperationMethod,
  type PublicApiOperationPermit,
} from "./api-operations";
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
  path: string,
  keys: readonly (keyof Params)[]
) => projectQuery<Params, Result>(path, (params) => pickInput(params, keys));

const projectMutationInput = <
  Params extends AuthProjectParams,
  Result = unknown,
>(
  path: string,
  keys: readonly (keyof Params)[]
) => projectMutation<Params, Result>(path, (params) => pickInput(params, keys));

const projectConfirmedMutationInput = <
  Params extends AuthProjectParams,
  Result = unknown,
>(
  path: string,
  keys: readonly (keyof Params)[]
) =>
  projectMutation<Params, Result>(path, (params) => ({
    ...pickInput(params, keys),
    confirm: true,
  }));

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
  const failedUploads: { asset: Asset; error: unknown }[] = [];
  const uploadedAssets: Asset[] = [];

  await Promise.all(
    params.assets.map(async (asset) => {
      try {
        await retryOnce(async () => {
          const data = await params.readAssetData(asset);
          const assetWithId = {
            ...asset,
            id: asset.id || (await getSha256Hash(data)),
          };
          uploadedAssets.push(
            ...(await uploadAsset({
              authToken: params.authToken,
              headers: params.headers,
              origin: params.origin,
              projectId: params.projectId,
              upload: {
                asset: assetWithId,
                data,
              },
            }))
          );
        });
      } catch (error) {
        failedUploads.push({ asset, error });
      }
    })
  );

  if (failedUploads.length > 0) {
    throw new Error(
      `Failed to upload assets: ${failedUploads
        .map(({ asset, error }) => `${asset.name}: ${formatError(error)}`)
        .join("; ")}`
    );
  }
  return uploadedAssets;
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
  )
): Promise<PublishedProjectBundle> => {
  const headers: RequestHeaders =
    "serviceToken" in params
      ? { Authorization: params.serviceToken }
      : { "x-auth-token": params.authToken };

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
>(getPublicApiOperationPath("snapshot"), ["include", "version"]);

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
>(getPublicApiOperationPath("list-pages"), ["includeFolders"]);

export const getPage = projectQueryInput<
  AuthProjectParams & {
    pageId: string;
  }
>(getPublicApiOperationPath("get-page"), ["pageId"]);

export const getPageByPath = projectQueryInput<
  AuthProjectParams & {
    path: string;
  }
>(getPublicApiOperationPath("get-page-by-path"), ["path"]);

export const createPage = projectMutationInput<
  AuthProjectParams & {
    pageId?: string;
    name: string;
    path: string;
    title?: string;
    parentFolderId?: string;
    meta?: PageMetaInput;
  }
>(getPublicApiOperationPath("create-page"), [
  "pageId",
  "name",
  "path",
  "title",
  "parentFolderId",
  "meta",
]);

export const updatePage = projectMutationInput<
  AuthProjectParams & {
    pageId: string;
    values: PageFieldsInput;
  }
>(getPublicApiOperationPath("update-page"), ["pageId", "values"]);

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
>(getPublicApiOperationPath("update-project-settings"), ["meta", "compiler"]);

export const listRedirects = projectQuery(
  getPublicApiOperationPath("list-redirects")
);

export const createRedirect = projectMutationInput<
  AuthProjectParams & {
    old: string;
    new: string;
    status?: "301" | "302";
  }
>(getPublicApiOperationPath("create-redirect"), ["old", "new", "status"]);

export const updateRedirect = projectMutationInput<
  AuthProjectParams & {
    old: string;
    values: {
      old?: string;
      new?: string;
      status?: "301" | "302" | null;
    };
  }
>(getPublicApiOperationPath("update-redirect"), ["old", "values"]);

export const deleteRedirect = projectMutationInput<
  AuthProjectParams & {
    old: string;
  }
>(getPublicApiOperationPath("delete-redirect"), ["old"]);

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
>(getPublicApiOperationPath("create-breakpoint"), [
  "id",
  "label",
  "minWidth",
  "maxWidth",
  "condition",
]);

export const updateBreakpoint = projectMutationInput<
  AuthProjectParams & {
    breakpointId: string;
    values: NullableBreakpointUpdateInput;
  }
>(getPublicApiOperationPath("update-breakpoint"), ["breakpointId", "values"]);

export const deleteBreakpoint = projectMutationInput<
  AuthProjectParams & {
    breakpointId: string;
  }
>(getPublicApiOperationPath("delete-breakpoint"), ["breakpointId"]);

export const deletePage = projectMutationInput<
  AuthProjectParams & {
    pageId: string;
  }
>(getPublicApiOperationPath("delete-page"), ["pageId"]);

export const duplicatePage = projectMutationInput<
  AuthProjectParams & {
    pageId: string;
    parentFolderId?: string;
    name?: string;
    path?: string;
  }
>(getPublicApiOperationPath("duplicate-page"), [
  "pageId",
  "parentFolderId",
  "name",
  "path",
]);

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
>(getPublicApiOperationPath("create-page-from-template"), [
  "templateId",
  "parentFolderId",
  "name",
  "path",
]);

export const listFolders = projectQueryInput<
  AuthProjectParams & {
    includePages?: boolean;
  }
>(getPublicApiOperationPath("list-folders"), ["includePages"]);

export const createFolder = projectMutationInput<
  AuthProjectParams & {
    folderId?: string;
    name: string;
    slug: string;
    parentFolderId?: string;
  }
>(getPublicApiOperationPath("create-folder"), [
  "folderId",
  "name",
  "slug",
  "parentFolderId",
]);

export const updateFolder = projectMutationInput<
  AuthProjectParams & {
    folderId: string;
    values: {
      name?: string;
      slug?: string;
      parentFolderId?: string;
    };
  }
>(getPublicApiOperationPath("update-folder"), ["folderId", "values"]);

export const deleteFolder = projectMutationInput<
  AuthProjectParams & {
    folderId: string;
  }
>(getPublicApiOperationPath("delete-folder"), ["folderId"]);

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
>(getPublicApiOperationPath("list-instances"), [
  "pageId",
  "pagePath",
  "rootInstanceId",
  "maxDepth",
  "topLevelOnly",
  "component",
  "tag",
  "labelContains",
]);

export const inspectInstance = projectQueryInput<
  AuthProjectParams & {
    instanceId: string;
    include?: string[];
    childDepth?: number;
  }
>(getPublicApiOperationPath("inspect-instance"), [
  "instanceId",
  "include",
  "childDepth",
]);

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
>(getPublicApiOperationPath("append-instance"), [
  "parentInstanceId",
  "mode",
  "insertIndex",
  "children",
]);

export const moveInstance = projectMutationInput<
  AuthProjectParams & {
    moves: Array<{
      instanceId: string;
      parentInstanceId: string;
      insertIndex?: number;
    }>;
  }
>(getPublicApiOperationPath("move-instance"), ["moves"]);

export const cloneInstance = projectMutationInput<
  AuthProjectParams & {
    sourceInstanceId: string;
    targetParentInstanceId?: string;
    insertIndex?: number;
  }
>(getPublicApiOperationPath("clone-instance"), [
  "sourceInstanceId",
  "targetParentInstanceId",
  "insertIndex",
]);

export const deleteInstance = projectMutationInput<
  AuthProjectParams & {
    instanceIds: string[];
  }
>(getPublicApiOperationPath("delete-instance"), ["instanceIds"]);

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
>(getPublicApiOperationPath("update-props"), ["updates"]);

export const deleteProps = projectMutationInput<
  AuthProjectParams & {
    deletions: Array<{ instanceId: string; name: string }>;
  }
>(getPublicApiOperationPath("delete-props"), ["deletions"]);

export const bindProps = projectMutationInput<
  AuthProjectParams & {
    bindings: PropBindingInput[];
  }
>(getPublicApiOperationPath("bind-props"), ["bindings"]);

export const listTexts = projectQueryInput<
  AuthProjectParams & {
    pageId?: string;
    pagePath?: string;
    instanceId?: string;
    mode?: "text" | "expression" | "all";
    contains?: string;
    maxValueLength?: number;
  }
>(getPublicApiOperationPath("list-texts"), [
  "pageId",
  "pagePath",
  "instanceId",
  "mode",
  "contains",
  "maxValueLength",
]);

export const updateText = projectMutationInput<
  AuthProjectParams & {
    instanceId: string;
    childIndex: number;
    text: string;
    mode?: "text" | "expression";
  }
>(getPublicApiOperationPath("update-text"), [
  "instanceId",
  "childIndex",
  "text",
  "mode",
]);

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
>(getPublicApiOperationPath("get-styles"), [
  "instanceIds",
  "pageId",
  "pagePath",
  "breakpoint",
  "state",
  "property",
  "propertyFilter",
  "includeTokens",
]);

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
>(getPublicApiOperationPath("update-styles"), ["updates"]);

export const deleteStyleDeclarations = projectMutationInput<
  AuthProjectParams & {
    deletions: StyleDeclarationDeleteInput[];
  }
>(getPublicApiOperationPath("delete-styles"), ["deletions"]);

export const replaceStyleValues = projectMutationInput<
  AuthProjectParams & {
    property: string;
    fromValue: unknown;
    toValue: unknown;
    pageId?: string;
    pagePath?: string;
  }
>(getPublicApiOperationPath("replace-styles"), [
  "property",
  "fromValue",
  "toValue",
  "pageId",
  "pagePath",
]);

export const listDesignTokens = projectQueryInput<
  AuthProjectParams & {
    filter?: string;
    withUsage?: boolean;
    sort?: "name" | "usage";
  }
>(getPublicApiOperationPath("list-design-tokens"), [
  "filter",
  "withUsage",
  "sort",
]);

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
>(getPublicApiOperationPath("create-design-token"), ["tokens"]);

export const updateDesignTokenStyles = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    updates: DesignTokenStyleInput[];
  }
>(getPublicApiOperationPath("update-design-token-styles"), [
  "designTokenId",
  "updates",
]);

export const deleteDesignTokenStyles = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    deletions: Array<Omit<StyleDeclarationDeleteInput, "instanceId">>;
  }
>(getPublicApiOperationPath("delete-design-token-styles"), [
  "designTokenId",
  "deletions",
]);

export const attachDesignToken = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    instanceIds: string[];
    position?: "before-local" | "after-local";
  }
>(getPublicApiOperationPath("attach-design-token"), [
  "designTokenId",
  "instanceIds",
  "position",
]);

export const detachDesignToken = projectMutationInput<
  AuthProjectParams & {
    designTokenId: string;
    instanceIds: string[];
  }
>(getPublicApiOperationPath("detach-design-token"), [
  "designTokenId",
  "instanceIds",
]);

export const extractDesignToken = projectMutationInput<
  AuthProjectParams & {
    instanceIds: string[];
    name: string;
    removeLocalProps?: string[];
  }
>(getPublicApiOperationPath("extract-design-token"), [
  "instanceIds",
  "name",
  "removeLocalProps",
]);

export const listCssVariables = projectQueryInput<
  AuthProjectParams & {
    filter?: string;
    withUsage?: boolean;
  }
>(getPublicApiOperationPath("list-css-variables"), ["filter", "withUsage"]);

export const defineCssVariables = projectMutationInput<
  AuthProjectParams & {
    vars: Record<string, string | Record<string, unknown>>;
    overwrite?: boolean;
  }
>(getPublicApiOperationPath("define-css-variable"), ["vars", "overwrite"]);

export const deleteCssVariables = projectConfirmedMutationInput<
  AuthProjectParams & {
    names: string[];
    force?: boolean;
  }
>(getPublicApiOperationPath("delete-css-variable"), ["names", "force"]);

export const rewriteCssVariableRefs = projectMutationInput<
  AuthProjectParams & {
    map: Record<string, string>;
    scopeRegex?: string;
  }
>(getPublicApiOperationPath("rewrite-css-variable-refs"), [
  "map",
  "scopeRegex",
]);

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
>(getPublicApiOperationPath("list-variables"), ["scopeInstanceId"]);

export const createVariable = projectMutationInput<
  AuthProjectParams & {
    dataSourceId?: string;
    scopeInstanceId: string;
    name: string;
    value: VariableValueInput;
  }
>(getPublicApiOperationPath("create-variable"), [
  "dataSourceId",
  "scopeInstanceId",
  "name",
  "value",
]);

export const updateVariable = projectMutationInput<
  AuthProjectParams & {
    dataSourceId: string;
    values: {
      scopeInstanceId?: string;
      name?: string;
      value?: VariableValueInput;
    };
  }
>(getPublicApiOperationPath("update-variable"), ["dataSourceId", "values"]);

export const deleteVariable = projectMutationInput<
  AuthProjectParams & {
    dataSourceId: string;
  }
>(getPublicApiOperationPath("delete-variable"), ["dataSourceId"]);

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
>(getPublicApiOperationPath("list-resources"), ["scopeInstanceId"]);

export const createResource = projectMutationInput<
  AuthProjectParams & {
    resourceId?: string;
    resource: ResourceFieldsInput;
    dataSourceId?: string;
    scopeInstanceId?: string;
    dataSourceName?: string;
  }
>(getPublicApiOperationPath("create-resource"), [
  "resourceId",
  "resource",
  "dataSourceId",
  "scopeInstanceId",
  "dataSourceName",
]);

export const updateResource = projectMutationInput<
  AuthProjectParams & {
    resourceId: string;
    values: Partial<ResourceFieldsInput>;
    dataSourceName?: string;
    scopeInstanceId?: string;
  }
>(getPublicApiOperationPath("update-resource"), [
  "resourceId",
  "values",
  "dataSourceName",
  "scopeInstanceId",
]);

export const deleteResource = projectMutationInput<
  AuthProjectParams & {
    resourceId: string;
    force?: boolean;
  }
>(getPublicApiOperationPath("delete-resource"), ["resourceId", "force"]);

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
>(getPublicApiOperationPath("publish"), [
  "target",
  "domains",
  "message",
  "idempotencyKey",
]);

export const getPublishJob = projectQueryInput<
  AuthProjectParams & { jobId: string }
>(getPublicApiOperationPath("get-publish-job"), ["jobId"]);

export const unpublish = projectConfirmedMutationInput<
  AuthProjectParams & {
    target: "staging" | "production";
    domains?: string[];
    message?: string;
    idempotencyKey?: string;
  }
>(getPublicApiOperationPath("unpublish"), [
  "target",
  "domains",
  "message",
  "idempotencyKey",
]);

export const listDomains = projectQuery(
  getPublicApiOperationPath("list-domains")
);

export const createDomain = projectMutationInput<
  AuthProjectParams & { domain: string }
>(getPublicApiOperationPath("create-domain"), ["domain"]);

export const updateDomain = projectMutationInput<
  AuthProjectParams & {
    domainId: string;
    updates: { domain?: string };
  }
>(getPublicApiOperationPath("update-domain"), ["domainId", "updates"]);

export const deleteDomain = projectConfirmedMutationInput<
  AuthProjectParams & { domainId: string }
>(getPublicApiOperationPath("delete-domain"), ["domainId"]);

export const verifyDomain = projectMutationInput<
  AuthProjectParams & { domainId: string }
>(getPublicApiOperationPath("verify-domain"), ["domainId"]);

export const listAssets = projectQueryInput<
  AuthProjectParams & {
    type?: "image" | "font";
    sort?: "name" | "size" | "createdAt" | "usage";
    withUsage?: boolean;
    cursor?: string;
    limit?: number;
  }
>(getPublicApiOperationPath("list-assets"), [
  "type",
  "sort",
  "withUsage",
  "cursor",
  "limit",
]);

export const findAssetUsage = projectQueryInput<
  AuthProjectParams & {
    assetId: string;
  }
>(getPublicApiOperationPath("find-asset-usage"), ["assetId"]);

export const replaceAsset = projectConfirmedMutationInput<
  AuthProjectParams & {
    fromAssetId: string;
    toAssetId: string;
  }
>(getPublicApiOperationPath("replace-asset"), ["fromAssetId", "toAssetId"]);

export const deleteAssets = projectConfirmedMutationInput<
  AuthProjectParams & {
    assetIdsOrPrefixes: string[];
    force?: boolean;
  }
>(getPublicApiOperationPath("delete-asset"), ["assetIdsOrPrefixes", "force"]);

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
