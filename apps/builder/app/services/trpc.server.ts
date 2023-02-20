import { createTrpcProxyServiceClient } from "@webstudio-is/trpc-interface/server";
import env from "~/env/env.server";

const TRPC_SERVER_URL = env.TRPC_SERVER_URL ?? "";
const TRPC_SERVER_API_TOKEN = env.TRPC_SERVER_API_TOKEN ?? "";
const BRANCH_NAME = env.BRANCH_NAME;

export const trpcClient = createTrpcProxyServiceClient(
  TRPC_SERVER_URL !== "" && TRPC_SERVER_API_TOKEN !== ""
    ? {
        url: TRPC_SERVER_URL,
        token: TRPC_SERVER_API_TOKEN,
        branchName: BRANCH_NAME,
      }
    : undefined
);
