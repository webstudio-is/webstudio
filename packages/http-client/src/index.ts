import { createTRPCUntypedClient, httpBatchLink } from "@trpc/client";
import {
  importProjectBundleResultSchema,
  publishedProjectBundleSchema,
  type AssetFileData,
  type ImportProjectBundleResult,
  type PublishedProjectBundle,
} from "@webstudio-is/bundle";
export {
  getBundleVersion,
  isAssetFileDataString,
  bundleVersion,
} from "@webstudio-is/bundle";
export type {
  AssetFileData,
  PublishedProjectBundle,
  ProjectBundle,
} from "@webstudio-is/bundle";

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

const createAuthTrpcClient = (params: {
  origin: string;
  authToken: string;
  headers?: Record<string, string | undefined>;
}) =>
  createTrpcClient(params.origin, {
    ...params.headers,
    "x-auth-token": params.authToken,
  });

export const loadProjectBundleByBuildId = async (
  params: {
    buildId: string;
    origin: string;
    headers?: Record<string, string | undefined>;
  } & (
    | {
        serviceToken: string;
      }
    | { authToken: string }
  )
): Promise<PublishedProjectBundle> => {
  const headers: Record<string, string | undefined> =
    "serviceToken" in params
      ? { Authorization: params.serviceToken }
      : { "x-auth-token": params.authToken };

  const data = await createTrpcClient(params.origin, {
    ...params.headers,
    ...headers,
  }).query("build.loadProjectBundleByBuildId", {
    buildId: params.buildId,
  });
  return publishedProjectBundleSchema.parse(data);
};

export const loadProjectBundleByProjectId = async (params: {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: Record<string, string | undefined>;
}): Promise<PublishedProjectBundle> => {
  const data = await createAuthTrpcClient(params).query(
    "build.loadProjectBundleByProjectId",
    {
      projectId: params.projectId,
    }
  );
  return publishedProjectBundleSchema.parse(data);
};

export const checkProjectBuildPermission = async (params: {
  projectId: string;
  origin: string;
  authToken: string;
  headers?: Record<string, string | undefined>;
}): Promise<void> => {
  await createAuthTrpcClient(params).query(
    "build.checkProjectBuildPermission",
    {
      projectId: params.projectId,
    }
  );
};

export const importProjectBundle = async (params: {
  projectId: string;
  origin: string;
  authToken: string;
  data: PublishedProjectBundle;
  assetFiles?: AssetFileData[];
  ignoreVersionCheck?: boolean;
  headers?: Record<string, string | undefined>;
}): Promise<ImportProjectBundleResult> => {
  const result = await createAuthTrpcClient(params).mutation(
    "build.importProjectBundle",
    {
      projectId: params.projectId,
      data: params.data,
      assetFiles: params.assetFiles,
      ignoreVersionCheck: params.ignoreVersionCheck,
    }
  );
  return importProjectBundleResultSchema.parse(result);
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
