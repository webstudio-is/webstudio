import type { AppContext } from "@webstudio-is/trpc-interface/server";
import { z } from "zod";
import * as cryptoJson from "./crypto/crypto-json.server";
import { authenticator } from "~/services/auth.server";
import { trpcClient } from "~/services/trpc.server";
import { getMode } from "./router-utils/build-params";

const AuthReadToken = z.object({
  projectId: z.string(),
});

type AuthReadToken = z.infer<typeof AuthReadToken>;

const createAuthorizationContext = async (
  request: Request
): Promise<AppContext["authorization"]> => {
  const url = new URL(request.url);

  const buildMode = getMode(url);

  const authReadTokenRaw = url.searchParams.get("authReadToken") ?? undefined;
  const authToken = url.searchParams.get("authToken") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);

  let authReadToken: AuthReadToken | undefined;

  if (authReadTokenRaw !== undefined) {
    authReadToken = AuthReadToken.parse(
      await cryptoJson.decode(
        authReadTokenRaw,
        process.env.AUTH_SECRET ?? "NO-SECRET"
      )
    );
  }

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authReadToken,
    authToken,
    buildEnv: buildMode === "published" ? "prod" : "dev",
    authorizeTrpc: trpcClient.authorize,
  };

  return context;
};

export const createAuthReadToken = async (tokenData: AuthReadToken) => {
  return cryptoJson.encode(tokenData, process.env.AUTH_SECRET ?? "NO-SECRET");
};

export const createContext = async (request: Request): Promise<AppContext> => {
  const authorization = await createAuthorizationContext(request);

  return {
    authorization,
  };
};
