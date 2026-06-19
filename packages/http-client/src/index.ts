import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import type {
  AssetFileData,
  ImportProjectDataResult,
  SyncedProjectData,
} from "@webstudio-is/api-contract";

export {
  getSyncDataVersion,
  isAssetFileDataString,
  syncDataVersion,
} from "@webstudio-is/api-contract";
export type { AssetFileData, SyncedProjectData };

const createTrpcClient = (
  origin: string,
  headers: Record<string, string | undefined>
) => {
  const { sourceOrigin } = parseBuilderUrl(origin);
  const url = new URL("/trpc", sourceOrigin);

  return createTRPCUntypedClient({
    links: [
      httpBatchLink({
        url: url.href,
        headers,
      }),
    ],
  });
};

export const loadProjectDataByBuildId = async (
  params: {
    buildId: string;
    origin: string;
    headers?: Record<string, string | undefined>;
  } & (
    | {
        seviceToken: string;
      }
    | { authToken: string }
  )
): Promise<SyncedProjectData> => {
  const headers: Record<string, string | undefined> =
    "seviceToken" in params
      ? { Authorization: params.seviceToken }
      : { "x-auth-token": params.authToken };

  return (await createTrpcClient(params.origin, {
    ...params.headers,
    ...headers,
  }).query("build.loadProjectDataByBuildId", {
    buildId: params.buildId,
  })) as SyncedProjectData;
};

export const loadProjectDataByProjectId = async (params: {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: Record<string, string | undefined>;
}): Promise<SyncedProjectData> => {
  return (await createTrpcClient(params.origin, {
    ...params.headers,
    "x-auth-token": params.authToken,
  }).query("build.loadProjectDataByProjectId", {
    projectId: params.projectId,
  })) as SyncedProjectData;
};

export const importProjectData = async (params: {
  projectId: string;
  origin: string;
  authToken: string;
  data: SyncedProjectData;
  assetFiles?: AssetFileData[];
  ignoreVersionCheck?: boolean;
  headers?: Record<string, string | undefined>;
}): Promise<ImportProjectDataResult> => {
  return (await createTrpcClient(params.origin, {
    ...params.headers,
    "x-auth-token": params.authToken,
  }).mutation("build.importProjectData", {
    projectId: params.projectId,
    data: params.data,
    assetFiles: params.assetFiles,
    ignoreVersionCheck: params.ignoreVersionCheck,
  })) as { version: number };
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
