import { type AppContext } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import { authenticator } from "~/services/auth.server";
import { trpcSharedClient } from "~/services/trpc.server";
import { entryApi } from "./entri/entri-api.server";

import { defaultPlanFeatures } from "@webstudio-is/plans";
import {
  getPlanInfo,
  getAuthorizationOwnerId,
} from "@webstudio-is/plans/index.server";
import { staticEnv } from "~/env/env.static.server";
import { createClient } from "@webstudio-is/postgrest/index.server";
import { builderAuthenticator } from "~/services/builder-auth.server";
import { readLoginSessionBloomFilter } from "~/services/session.server";
import type { BloomFilter } from "~/services/bloom-filter.server";
import { isBuilder, isCanvas } from "./router-utils";
import { parseBuilderUrl } from "@webstudio-is/http-client";
import {
  ApiClient,
  apiClientHeader,
  apiClientVersionHeader,
} from "@webstudio-is/trpc-interface/api-compatibility";

export const extractAuthFromRequest = async (request: Request) => {
  if (isCanvas(request)) {
    throw new Error("Canvas requests can't have authorization context");
  }
  const url = new URL(request.url);

  const authToken =
    url.searchParams.get("authToken") ??
    request.headers.get("x-auth-token") ??
    undefined;

  const sessionData = isBuilder(request)
    ? await builderAuthenticator.isAuthenticated(request)
    : await authenticator.isAuthenticated(request);

  const isServiceCall = isServiceAuthorization(
    request.headers.get("Authorization")
  );

  return {
    authToken,
    isServiceCall,
    sessionData,
  };
};

export const isServiceAuthorization = (authorizationHeader: string | null) => {
  return (
    authorizationHeader != null &&
    env.TRPC_SERVER_API_TOKEN !== undefined &&
    env.TRPC_SERVER_API_TOKEN.length > 0 &&
    authorizationHeader === env.TRPC_SERVER_API_TOKEN
  );
};

const createTokenAuthorizationContext = async (
  authToken: string,
  postgrest: AppContext["postgrest"]
) => {
  const projectOwnerIdByToken = await postgrest.client
    .from("AuthorizationToken")
    .select("project:Project(id, userId)")
    .eq("token", authToken)
    .single();

  if (projectOwnerIdByToken.error) {
    throw new Error(`Project owner can't be found for token ${authToken}`);
  }

  const ownerId = projectOwnerIdByToken.data.project?.userId ?? null;
  if (ownerId === null) {
    throw new Error(
      `Project ${projectOwnerIdByToken.data.project?.id} has null userId`
    );
  }

  return {
    type: "token" as const,
    authToken,
    ownerId,
  };
};

const createAuthorizationContext = async (
  request: Request,
  postgrest: AppContext["postgrest"]
): Promise<AppContext["authorization"]> => {
  const { authToken, isServiceCall, sessionData } =
    await extractAuthFromRequest(request);

  if (isServiceCall) {
    return {
      type: "service",
      isServiceCall: true,
    };
  }

  if (authToken != null) {
    return await createTokenAuthorizationContext(authToken, postgrest);
  }

  if (sessionData?.userId != null) {
    const userId = sessionData.userId;

    let loginBloomFilter: BloomFilter | undefined = undefined;

    let isLoggedInToBuilder = async (projectId: string) => {
      if (loginBloomFilter === undefined) {
        loginBloomFilter = await readLoginSessionBloomFilter(request);
      }

      return loginBloomFilter.has(projectId);
    };

    if (isBuilder(request)) {
      isLoggedInToBuilder = async (projectId: string) => {
        const parsedUrl = parseBuilderUrl(request.url);
        return parsedUrl.projectId === projectId;
      };
    }

    return {
      type: "user",
      userId,
      sessionCreatedAt: sessionData.createdAt,
      isLoggedInToBuilder,
    };
  }

  return { type: "anonymous" };
};

const createDomainContext = () => {
  const context: AppContext["domain"] = {
    domainTrpc: trpcSharedClient.domain,
  };

  return context;
};

const getRequestOrigin = (urlStr: string) => {
  const url = new URL(urlStr);

  return url.origin;
};

const createDeploymentContext = (builderOrigin: string) => {
  const context: AppContext["deployment"] = {
    deploymentTrpc: trpcSharedClient.deployment,
    env: {
      BUILDER_ORIGIN: getRequestOrigin(builderOrigin),
      GITHUB_REF_NAME: staticEnv.GITHUB_REF_NAME ?? "undefined",
      GITHUB_SHA: staticEnv.GITHUB_SHA ?? undefined,
      PUBLISHER_HOST: env.PUBLISHER_HOST,
    },
  };

  return context;
};

const createEntriContext = () => {
  return {
    entryApi,
  };
};

const createTrpcCache = () => {
  const proceduresMaxAge = new Map<string, number>();
  const setMaxAge = (path: string, value: number) => {
    proceduresMaxAge.set(
      path,
      Math.min(proceduresMaxAge.get(path) ?? Number.MAX_SAFE_INTEGER, value)
    );
  };

  const getMaxAge = (path: string) => proceduresMaxAge.get(path);

  return {
    setMaxAge,
    getMaxAge,
  };
};

const createApiClientContext = (request: Request): AppContext["apiClient"] => {
  const client = ApiClient.safeParse(request.headers.get(apiClientHeader));
  if (client.success === false) {
    return {
      type: "unknown",
      version: undefined,
    };
  }

  return {
    type: client.data,
    version: request.headers.get(apiClientVersionHeader) ?? undefined,
  };
};

export const createPostgrestContext = () => {
  return { client: createClient(env.POSTGREST_URL, env.POSTGREST_API_KEY) };
};

/**
 * argument buildEnv==="prod" only if we are loading project with production build
 */
export const createContext = async (request: Request): Promise<AppContext> => {
  const postgrest = createPostgrestContext();
  const authorization = await createAuthorizationContext(request, postgrest);

  const resolvePlanInfo = async (auth: AppContext["authorization"]) => {
    const ownerId = getAuthorizationOwnerId(auth);
    if (ownerId === undefined) {
      return {
        planFeatures: defaultPlanFeatures,
        purchases: [] as AppContext["purchases"],
      };
    }
    return (
      (await getPlanInfo([ownerId], { postgrest })).get(ownerId) ?? {
        planFeatures: defaultPlanFeatures,
        purchases: [] as AppContext["purchases"],
      }
    );
  };

  const domain = createDomainContext();
  const deployment = createDeploymentContext(getRequestOrigin(request.url));
  const entri = createEntriContext();
  const { planFeatures, purchases } = await resolvePlanInfo(authorization);
  const trpcCache = createTrpcCache();
  const apiClient = createApiClientContext(request);

  const getOwnerPlanFeatures = async (userId: string) => {
    const results = await getPlanInfo([userId], { postgrest });
    return results.get(userId)?.planFeatures ?? defaultPlanFeatures;
  };

  const createTokenContext = async (authToken: string) => {
    const authorization = await createTokenAuthorizationContext(
      authToken,
      postgrest
    );

    const { planFeatures, purchases } = await resolvePlanInfo(authorization);

    return {
      authorization,
      domain,
      deployment,
      entri,
      planFeatures,
      purchases,
      apiClient,
      trpcCache,
      postgrest,
      createTokenContext,
      getOwnerPlanFeatures,
    };
  };

  return {
    authorization,
    domain,
    deployment,
    entri,
    planFeatures,
    purchases,
    apiClient,
    trpcCache,
    postgrest,
    createTokenContext,
    getOwnerPlanFeatures,
  };
};
