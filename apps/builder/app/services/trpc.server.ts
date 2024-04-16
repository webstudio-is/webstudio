import { createTrpcProxyServiceClient } from "@webstudio-is/trpc-interface/index.server";
import env from "~/env/env.server";
import { staticEnv } from "~/env/env.static.server";

const TRPC_SERVER_URL = env.TRPC_SERVER_URL ?? "";
const TRPC_SERVER_API_TOKEN = env.TRPC_SERVER_API_TOKEN ?? "";
const GITHUB_REF_NAME = staticEnv.GITHUB_REF_NAME;

export const trpcSharedClient = createTrpcProxyServiceClient(
  TRPC_SERVER_URL !== "" && TRPC_SERVER_API_TOKEN !== ""
    ? {
        url: TRPC_SERVER_URL,
        token: TRPC_SERVER_API_TOKEN,
        branchName: GITHUB_REF_NAME,
      }
    : undefined
);
