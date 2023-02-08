import { createTrpcProxyServiceClient } from "@webstudio-is/trpc-interface/server";

const TRPC_SERVER_URL = process.env.TRPC_SERVER_URL;
const TRPC_SERVER_API_TOKEN = process.env.TRPC_SERVER_API_TOKEN;
const VERCEL_GIT_COMMIT_REF = process.env.VERCEL_GIT_COMMIT_REF;

export const trpcClient = createTrpcProxyServiceClient(
  TRPC_SERVER_URL !== undefined && TRPC_SERVER_API_TOKEN !== undefined
    ? {
        url: TRPC_SERVER_URL,
        token: TRPC_SERVER_API_TOKEN,
        headers:
          VERCEL_GIT_COMMIT_REF !== undefined
            ? {
                // We use it for routing on prevew SaaS edge-api (trcp) deployments
                "x-branch-name": VERCEL_GIT_COMMIT_REF,
              }
            : {},
      }
    : undefined
);
