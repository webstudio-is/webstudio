import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import { Upload } from "tus-js-client";
import {
  importProjectBundleResult,
  publishedProjectBundle,
  maxProjectBundleSize,
  stagedUploadPath,
  stagedUploadProjectIdHeader,
  type ImportProjectBundleResult,
  type PublishedProjectBundle,
} from "@webstudio-is/protocol";
export { getBundleVersion, bundleVersion } from "@webstudio-is/protocol";
export type {
  PublishedProjectBundle,
  ProjectBundle,
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
}) =>
  createTrpcClient(params.origin, {
    ...params.headers,
    "x-auth-token": params.authToken,
  });

type AuthProjectParams = {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: RequestHeaders;
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
): Promise<void> => {
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
  const result = await response.json();
  if (
    typeof result === "object" &&
    result !== null &&
    "errors" in result &&
    typeof result.errors === "string"
  ) {
    throw new Error(result.errors);
  }
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

// For easier detecting the builder URL
const buildProjectDomainPrefix = "p-";

export const parseBuilderUrl = (urlStr: string) => {
  const url = new URL(urlStr);

  const fragments = url.host.split(".");
  // Regular expression to match the prefix, UUID, and any optional string after '-dot-'
  const re =
    /^(?<prefix>[a-z-]+)(?<uuid>[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})(-dot-(?<branch>.*))?/;
  const match = fragments[0].match(re);

  // Extract prefix, projectId (UUID), and branch (if exists)
  const prefix = match?.groups?.prefix;
  const projectId = match?.groups?.uuid;
  const branch = match?.groups?.branch;

  if (prefix !== buildProjectDomainPrefix) {
    return {
      projectId: undefined,
      sourceOrigin: url.origin,
    };
  }

  if (projectId === undefined) {
    return {
      projectId: undefined,
      sourceOrigin: url.origin,
    };
  }

  fragments[0] = fragments[0].replace(re, branch ?? "");

  const sourceUrl = new URL(url.origin);
  sourceUrl.protocol = "https";
  sourceUrl.host = fragments.filter(Boolean).join(".");

  return {
    projectId,
    sourceOrigin: sourceUrl.origin,
  };
};
