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

  const readTokenRaw = url.searchParams.get("readToken") ?? undefined;
  const token = url.searchParams.get("token") ?? url.hostname;

  const user = await authenticator.isAuthenticated(request);

  let readToken: AuthReadToken | undefined;

  if (readTokenRaw !== undefined) {
    readToken = AuthReadToken.parse(
      await cryptoJson.decode(
        readTokenRaw,
        process.env.AUTH_SECRET ?? "NO-SECRET"
      )
    );
  }

  const context: AppContext["authorization"] = {
    userId: user?.id,
    authReadToken: readToken,
    authToken: token,
    buildEnv: buildMode === "published" ? "prod" : "dev",
    authorizeTrpc: trpcClient.authorize,
  };

  return context;
};

export const createReadToken = async (tokenData: AuthReadToken) => {
  return cryptoJson.encode(tokenData, process.env.AUTH_SECRET ?? "NO-SECRET");
};

export const createContext = async (request: Request): Promise<AppContext> => {
  const authorization = await createAuthorizationContext(request);

  return {
    authorization,
  };
};
