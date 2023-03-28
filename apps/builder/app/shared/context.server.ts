import type { AppContext } from "@webstudio-is/trpc-interface/server";
import { authenticator } from "~/services/auth.server";
import { trpcClient } from "~/services/trpc.server";

const createAuthorizationContext = async (
  request: Request,
  buildEnv: AppContext["authorization"]["buildEnv"]
): Promise<AppContext["authorization"]> => {
  const originUrl = new URL(request.url);
  let url = originUrl;

  // In case of css use referrer as url to extract tokens from canvas iframe href
  if (originUrl.pathname === "/s/css") {
    const referer = request.headers.get("referer");
    if (referer !== null) {
      url = new URL(referer);
    }
  }

  const authToken = url.searchParams.get("authToken") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authToken,
    buildEnv,
    authorizeTrpc: trpcClient.authorize,
  };

  return context;
};

/**
 * argument buildEnv==="prod" only if we are loading project with production build
 */
export const createContext = async (
  request: Request,
  buildEnv: AppContext["authorization"]["buildEnv"] = "dev"
): Promise<AppContext> => {
  const authorization = await createAuthorizationContext(request, buildEnv);

  return {
    authorization,
  };
};
