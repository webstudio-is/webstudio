import { createTrpcProxyServiceClient } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import { staticEnv } from "~/env/env.static.server";

const PUBLISHER_ENDPOINT = env.PUBLISHER_ENDPOINT ?? env.TRPC_SERVER_URL ?? "";
const PUBLISHER_TOKEN = env.PUBLISHER_TOKEN ?? env.TRPC_SERVER_API_TOKEN ?? "";
const GITHUB_REF_NAME = staticEnv.GITHUB_REF_NAME;

export const trpcSharedClient = createTrpcProxyServiceClient(
  PUBLISHER_ENDPOINT !== "" && PUBLISHER_TOKEN !== ""
    ? {
        url: PUBLISHER_ENDPOINT,
        token: PUBLISHER_TOKEN,
        branchName: GITHUB_REF_NAME,
        clientVersion: staticEnv.GITHUB_SHA ?? "local",
      }
    : undefined
);
